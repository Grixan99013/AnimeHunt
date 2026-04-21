// src/components/VideosTab.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../App";
import { fetchVideos, submitVideo, reviewVideo, deleteVideo } from "../api/api";

const VIDEO_TYPES = [
  { value: "pv",              label: "PV" },
  { value: "trailer",         label: "Трейлер" },
  { value: "character",       label: "Видео персонажа" },
  { value: "cm",              label: "CM (реклама)" },
  { value: "op",              label: "OP (опенинг)" },
  { value: "ed",              label: "ED (эндинг)" },
  { value: "mv",              label: "Муз. клип" },
  { value: "clip",            label: "Отрывок" },
  { value: "episode_preview", label: "Превью эпизода" },
  { value: "other",           label: "Прочее" },
];

const TYPE_LABEL = Object.fromEntries(VIDEO_TYPES.map(t => [t.value, t.label]));

const VIDEO_RULES = [
  "Принимаются ссылки только с YouTube, VK, Rutube, Sibnet, Smotret-Anime, Vimeo.",
  "Ссылка должна вести непосредственно на видео, а не на канал/плейлист.",
  "Не дублируйте уже добавленные видео.",
  "Трейлеры и PV — только официальные, от студии или лицензиата.",
  "Музыкальные клипы — только если связаны с данным аниме.",
  "Запрещены ссылки на пиратские сайты.",
];

const ALLOWED = ["youtube.com","youtu.be","vk.com","vkvideo.ru","rutube.ru","sibnet.ru","smotret-anime.com","smotret-anime.ru","vimeo.com"];

// ── Парсеры embed-URL ─────────────────────────────────────────
function getEmbedUrl(raw) {
  try {
    const url = new URL(raw);
    const host = url.hostname.replace("www.", "");

    // YouTube
    if (host === "youtube.com") {
      const v = url.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      // /shorts/ID
      const m = url.pathname.match(/^\/shorts\/([^/]+)/);
      if (m) return `https://www.youtube.com/embed/${m[1]}`;
    }
    if (host === "youtu.be") {
      return `https://www.youtube.com/embed${url.pathname}`;
    }

    // VK
    if (host === "vk.com" || host === "vkvideo.ru") {
      // vk.com/video-123_456 или vk.com/video?z=video-123_456
      const z = url.searchParams.get("z") || url.pathname.replace("/video","video").replace("/","");
      const m = (z||url.pathname).match(/video(-?\d+)_(\d+)/);
      if (m) return `https://vk.com/video_ext.php?oid=${m[1]}&id=${m[2]}&hd=2`;
    }

    // Rutube
    if (host === "rutube.ru") {
      const m = url.pathname.match(/\/video\/([a-f0-9]+)/);
      if (m) return `https://rutube.ru/play/embed/${m[1]}`;
    }

    // Vimeo
    if (host === "vimeo.com") {
      const m = url.pathname.match(/\/(\d+)/);
      if (m) return `https://player.vimeo.com/video/${m[1]}`;
    }

    // Sibnet
    if (host === "video.sibnet.ru" || host === "sibnet.ru") {
      return raw; // sibnet принимает прямую ссылку в iframe
    }

    // Smotret-anime
    if (host.includes("smotret-anime")) {
      return raw;
    }
  } catch {}
  return null;
}

function VideoPlayer({ url }) {
  const embed = getEmbedUrl(url);
  if (!embed) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm"
        style={{ color:"#a78bfa" }}>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
        Смотреть на сайте
      </a>
    );
  }
  return (
    <div style={{ position:"relative", paddingBottom:"56.25%", height:0, overflow:"hidden", borderRadius:"12px" }}>
      <iframe
        src={embed}
        title="video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%", border:"none", borderRadius:"12px" }}
      />
    </div>
  );
}

export default function VideosTab({ animeId }) {
  const { user } = useAuth();
  const isMod = user && (user.role_id === 1 || user.role_id === 2);

  const [videos,  setVideos]  = useState([]);
  const [loading, setLoading] = useState(true);

  // Форма
  const [showForm,   setShowForm]   = useState(false);
  const [showRules,  setShowRules]  = useState(false);
  const [formData,   setFormData]   = useState({ url:"", video_type:"pv", title:"" });
  const [urlError,   setUrlError]   = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Активное видео для просмотра
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchVideos(animeId)
      .then(setVideos)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [animeId]);

  const approved = videos.filter(v => v.status === "approved");
  const pending  = videos.filter(v => v.status === "pending");

  // Группировка по типу
  const byType = {};
  approved.forEach(v => {
    if (!byType[v.video_type]) byType[v.video_type] = [];
    byType[v.video_type].push(v);
  });

  const validateUrl = (raw) => {
    if (!raw.trim()) { setUrlError(""); return; }
    try {
      const url = new URL(raw);
      const ok = ALLOWED.some(h => url.hostname.replace("www.","").endsWith(h));
      setUrlError(ok ? "" : "Разрешены только: YouTube, VK, Rutube, Sibnet, Smotret-Anime, Vimeo");
    } catch {
      setUrlError("Введите корректный URL");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.url.trim() || urlError) return;
    setSubmitting(true);
    try {
      const v = await submitVideo(animeId, formData);
      setVideos(prev => [v, ...prev]);
      setFormData({ url:"", video_type:"pv", title:"" });
      setShowForm(false);
    } catch (err) { alert(err.message); }
    finally { setSubmitting(false); }
  };

  const handleReview = async (id, status) => {
    try {
      await reviewVideo(id, status);
      setVideos(prev => prev.map(v => v.id === id ? { ...v, status } : v));
      if (activeId === id && status === "rejected") setActiveId(null);
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Удалить видео?")) return;
    try {
      await deleteVideo(id);
      setVideos(prev => prev.filter(v => v.id !== id));
      if (activeId === id) setActiveId(null);
    } catch (err) { alert(err.message); }
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 rounded-full border-2 animate-spin"
        style={{ borderColor:"rgba(255,255,255,0.1)", borderTopColor:"#8b5cf6" }} />
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Кнопка добавить */}
      {user && (
        <div className="flex justify-end">
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background:"linear-gradient(to right,#7c3aed,#a21caf)", border:"none", cursor:"pointer" }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            Предложить видео
          </button>
        </div>
      )}

      {/* Форма добавления */}
      {showForm && (
        <div className="rounded-2xl p-5 space-y-4"
          style={{ backgroundColor:"#13151c", border:"1px solid rgba(139,92,246,0.3)" }}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white">Добавить видео</h3>
            <button onClick={() => setShowForm(false)}
              style={{ background:"none", border:"none", color:"#6b7280", cursor:"pointer", fontSize:"1.2rem" }}>✕</button>
          </div>

          {/* Правила */}
          <div className="rounded-xl overflow-hidden" style={{ border:"1px solid rgba(255,255,255,0.06)" }}>
            <button onClick={() => setShowRules(!showRules)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-left"
              style={{ background:"rgba(255,255,255,0.03)", border:"none", cursor:"pointer", color:"#9ca3af" }}>
              <span className="flex items-center gap-2">
                <span style={{ color:"#fbbf24" }}>📋</span>
                Правила добавления видео
              </span>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                style={{ transform: showRules ? "rotate(180deg)" : "none", transition:"transform 0.2s", color:"#6b7280" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            {showRules && (
              <ul className="px-4 pb-3 pt-1 space-y-1.5">
                {VIDEO_RULES.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color:"#9ca3af" }}>
                    <span style={{ color:"#7c3aed", flexShrink:0 }}>•</span>{r}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* URL */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color:"#6b7280" }}>URL видео *</label>
              <input
                type="url"
                value={formData.url}
                onChange={e => { setFormData(p=>({...p,url:e.target.value})); validateUrl(e.target.value); }}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                style={{ backgroundColor:"#0d0f14", border:`1px solid ${urlError ? "#ef4444" : "rgba(255,255,255,0.1)"}` }}
                onFocus={e => e.target.style.borderColor = urlError ? "#ef4444" : "rgba(139,92,246,0.4)"}
                onBlur={e  => e.target.style.borderColor = urlError ? "#ef4444" : "rgba(255,255,255,0.1)"}
              />
              {urlError && <p className="text-xs mt-1" style={{ color:"#f87171" }}>{urlError}</p>}
              <p className="text-xs mt-1" style={{ color:"#4b5563" }}>
                YouTube · VK · Rutube · Sibnet · Smotret-Anime · Vimeo
              </p>
            </div>

            {/* Тип */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color:"#6b7280" }}>Тип видео *</label>
              <select
                value={formData.video_type}
                onChange={e => setFormData(p=>({...p,video_type:e.target.value}))}
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                style={{ backgroundColor:"#0d0f14", border:"1px solid rgba(255,255,255,0.1)", cursor:"pointer" }}>
                {VIDEO_TYPES.map(t => (
                  <option key={t.value} value={t.value} style={{ backgroundColor:"#0d0f14" }}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Название */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color:"#6b7280" }}>Название <span style={{ color:"#4b5563" }}>(необязательно)</span></label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData(p=>({...p,title:e.target.value}))}
                placeholder="Например: «Атака Титанов — Финальный трейлер»"
                maxLength={255}
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                style={{ backgroundColor:"#0d0f14", border:"1px solid rgba(255,255,255,0.1)" }}
                onFocus={e => e.target.style.borderColor = "rgba(139,92,246,0.4)"}
                onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
              />
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={!formData.url.trim() || !!urlError || submitting}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white"
                style={{
                  background: formData.url.trim() && !urlError ? "linear-gradient(to right,#7c3aed,#a21caf)" : "rgba(255,255,255,0.08)",
                  opacity: !formData.url.trim() || !!urlError || submitting ? 0.6 : 1,
                  cursor: formData.url.trim() && !urlError && !submitting ? "pointer" : "not-allowed",
                  border:"none",
                }}>
                {submitting ? "Отправка…" : "Отправить на проверку"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Модерация: ожидающие */}
      {isMod && pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2"
            style={{ color:"#fbbf24" }}>
            ⏳ На проверке
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor:"rgba(245,158,11,0.15)", color:"#fbbf24" }}>{pending.length}</span>
          </h3>
          <div className="space-y-2">
            {pending.map(v => (
              <VideoModCard key={v.id} video={v} onApprove={() => handleReview(v.id,"approved")} onReject={() => handleReview(v.id,"rejected")} onDelete={() => handleDelete(v.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Принятые видео по типам */}
      {approved.length === 0 ? (
        <div className="text-center py-16" style={{ color:"#4b5563" }}>
          <p className="text-4xl mb-3">🎬</p>
          <p className="text-sm">Видео пока нет</p>
          {!user && (
            <p className="text-xs mt-2"><Link to="/login" style={{ color:"#a78bfa" }}>Войдите</Link>, чтобы добавить</p>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {VIDEO_TYPES.filter(t => byType[t.value]?.length).map(t => (
            <div key={t.value}>
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                {t.label}
                <span className="text-xs px-2 py-0.5 rounded-full font-normal"
                  style={{ backgroundColor:"rgba(139,92,246,0.15)", color:"#a78bfa" }}>
                  {byType[t.value].length}
                </span>
              </h3>
              <div className="space-y-4">
                {byType[t.value].map(v => (
                  <VideoCard
                    key={v.id} video={v}
                    active={activeId === v.id}
                    onActivate={() => setActiveId(activeId === v.id ? null : v.id)}
                    canDelete={isMod || v.user_id === user?.id}
                    onDelete={() => handleDelete(v.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VideoCard({ video, active, onActivate, canDelete, onDelete }) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ backgroundColor:"#13151c", border:"1px solid rgba(255,255,255,0.06)" }}>
      {/* Заголовок */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: active ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-white truncate">
            {video.title || TYPE_LABEL[video.video_type] || video.video_type}
          </p>
          <p className="text-xs mt-0.5" style={{ color:"#6b7280" }}>
            {video.submitted_by} · {new Date(video.created_at).toLocaleDateString("ru-RU")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {canDelete && (
            <button onClick={onDelete}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
              style={{ backgroundColor:"rgba(239,68,68,0.12)", color:"#f87171", border:"none", cursor:"pointer" }}>
              ✕
            </button>
          )}
          <button onClick={onActivate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ background: active ? "rgba(255,255,255,0.1)" : "linear-gradient(to right,#7c3aed,#a21caf)", border:"none", cursor:"pointer" }}>
            {active ? (
              <>
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6"/>
                </svg>
                Скрыть
              </>
            ) : (
              <>
                <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Смотреть
              </>
            )}
          </button>
        </div>
      </div>
      {/* Плеер */}
      {active && (
        <div className="p-4">
          <VideoPlayer url={video.url} />
        </div>
      )}
    </div>
  );
}

function VideoModCard({ video, onApprove, onReject, onDelete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="rounded-xl p-4 space-y-3"
      style={{ backgroundColor:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.25)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-white truncate">
            {video.title || TYPE_LABEL[video.video_type]}
          </p>
          <p className="text-xs mt-0.5" style={{ color:"#9ca3af" }}>
            {video.submitted_by} · {TYPE_LABEL[video.video_type]}
          </p>
          <a href={video.url} target="_blank" rel="noopener noreferrer"
            className="text-xs truncate block mt-0.5" style={{ color:"#a78bfa", maxWidth:"280px" }}>
            {video.url}
          </a>
        </div>
        <button onClick={() => setShow(!show)}
          className="flex-shrink-0 text-xs px-2.5 py-1 rounded-lg"
          style={{ backgroundColor:"rgba(255,255,255,0.06)", border:"none", color:"#9ca3af", cursor:"pointer" }}>
          {show ? "Скрыть" : "Превью"}
        </button>
      </div>
      {show && <VideoPlayer url={video.url} />}
      <div className="flex gap-2">
        <button onClick={onApprove}
          className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white"
          style={{ background:"linear-gradient(to right,#059669,#047857)", border:"none", cursor:"pointer" }}>
          ✓ Принять
        </button>
        <button onClick={onReject}
          className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white"
          style={{ background:"linear-gradient(to right,#dc2626,#9f1239)", border:"none", cursor:"pointer" }}>
          ✕ Отклонить
        </button>
        <button onClick={onDelete}
          className="px-3 py-1.5 rounded-lg text-xs"
          style={{ backgroundColor:"rgba(255,255,255,0.06)", border:"none", color:"#9ca3af", cursor:"pointer" }}>
          Удалить
        </button>
      </div>
    </div>
  );
}
