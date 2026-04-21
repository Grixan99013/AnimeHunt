// src/components/ScreenshotsTab.jsx
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../App";
import { fetchScreenshots, submitScreenshot, reviewScreenshot, deleteScreenshot } from "../api/api";

const STATUS_STYLE = {
  approved: { color: "#34d399", bg: "rgba(16,185,129,0.12)", label: "Принято" },
  pending:  { color: "#fbbf24", bg: "rgba(245,158,11,0.12)",  label: "На проверке" },
  rejected: { color: "#f87171", bg: "rgba(239,68,68,0.12)",   label: "Отклонено" },
};

const RULES = [
  "Только скриншоты из аниме или официальные арты.",
  "Минимальное разрешение — 720p.",
  "Без водяных знаков и субтитров (по возможности).",
  "Не дублируйте уже загруженные кадры.",
  "Запрещён NSFW и откровенный контент.",
  "Нарушение правил приведёт к отклонению и предупреждению.",
];

export default function ScreenshotsTab({ animeId }) {
  const { user } = useAuth();
  const isMod = user && (user.role_id === 1 || user.role_id === 2);

  const [shots,   setShots]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null); // index

  // Форма
  const [showForm,   setShowForm]   = useState(false);
  const [showRules,  setShowRules]  = useState(false);
  const [preview,    setPreview]    = useState(null);
  const [imageData,  setImageData]  = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    fetchScreenshots(animeId)
      .then(setShots)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [animeId]);

  const approved = shots.filter(s => s.status === "approved");
  const pending  = shots.filter(s => s.status === "pending");

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert("Максимальный размер — 10 МБ"); return; }
    const reader = new FileReader();
    reader.onload = ev => { setPreview(ev.target.result); setImageData(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageData) { alert("Выберите изображение"); return; }
    setSubmitting(true);
    try {
      const s = await submitScreenshot(animeId, imageData);
      setShots(prev => [s, ...prev]);
      setPreview(null); setImageData(null); setShowForm(false);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) { alert(err.message); }
    finally { setSubmitting(false); }
  };

  const handleReview = async (id, status) => {
    try {
      await reviewScreenshot(id, status);
      setShots(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Удалить кадр?")) return;
    try {
      await deleteScreenshot(id);
      setShots(prev => prev.filter(s => s.id !== id));
      if (lightbox !== null) setLightbox(null);
    } catch (err) { alert(err.message); }
  };

  // Навигация лайтбокса
  const handleLightboxKey = (e) => {
    if (e.key === "Escape") setLightbox(null);
    if (e.key === "ArrowRight" && lightbox < approved.length - 1) setLightbox(l => l + 1);
    if (e.key === "ArrowLeft"  && lightbox > 0)                   setLightbox(l => l - 1);
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
            style={{ background: "linear-gradient(to right,#7c3aed,#a21caf)", border:"none", cursor:"pointer" }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            Предложить кадр
          </button>
        </div>
      )}

      {/* Форма добавления */}
      {showForm && (
        <div className="rounded-2xl p-5 space-y-4"
          style={{ backgroundColor:"#13151c", border:"1px solid rgba(139,92,246,0.3)" }}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white">Добавить кадр</h3>
            <button onClick={() => { setShowForm(false); setPreview(null); setImageData(null); }}
              style={{ background:"none", border:"none", color:"#6b7280", cursor:"pointer", fontSize:"1.2rem" }}>✕</button>
          </div>

          {/* Правила */}
          <div className="rounded-xl overflow-hidden" style={{ border:"1px solid rgba(255,255,255,0.06)" }}>
            <button onClick={() => setShowRules(!showRules)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-left"
              style={{ background:"rgba(255,255,255,0.03)", border:"none", cursor:"pointer", color:"#9ca3af" }}>
              <span className="flex items-center gap-2">
                <span style={{ color:"#fbbf24" }}>📋</span>
                Правила добавления кадров
              </span>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                style={{ transform: showRules ? "rotate(180deg)" : "none", transition:"transform 0.2s", color:"#6b7280" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            {showRules && (
              <ul className="px-4 pb-3 pt-1 space-y-1.5">
                {RULES.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color:"#9ca3af" }}>
                    <span style={{ color:"#7c3aed", flexShrink:0 }}>•</span>
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Выбор файла */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color:"#6b7280" }}>Изображение *</label>
              <div
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all"
                style={{
                  border: "2px dashed rgba(255,255,255,0.12)",
                  minHeight: "120px",
                  backgroundColor: "rgba(255,255,255,0.02)",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"}>
                {preview ? (
                  <img src={preview} alt="preview"
                    className="max-h-48 rounded-lg object-contain"
                    style={{ maxWidth:"100%" }} />
                ) : (
                  <div className="text-center py-6">
                    <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                      className="mx-auto mb-2" style={{ color:"#4b5563" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <p className="text-sm" style={{ color:"#6b7280" }}>Нажмите чтобы выбрать изображение</p>
                    <p className="text-xs mt-1" style={{ color:"#4b5563" }}>PNG, JPG, WEBP · до 10 МБ</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={!imageData || submitting}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white"
                style={{
                  background: imageData ? "linear-gradient(to right,#7c3aed,#a21caf)" : "rgba(255,255,255,0.08)",
                  opacity: !imageData || submitting ? 0.6 : 1,
                  cursor: imageData && !submitting ? "pointer" : "not-allowed",
                  border:"none",
                }}>
                {submitting ? "Загрузка…" : "Отправить на проверку"}
              </button>
              {preview && (
                <button type="button" onClick={() => { setPreview(null); setImageData(null); if (fileRef.current) fileRef.current.value=""; }}
                  className="px-4 py-2 rounded-xl text-sm"
                  style={{ backgroundColor:"rgba(255,255,255,0.05)", border:"none", color:"#9ca3af", cursor:"pointer" }}>
                  Убрать
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Модерация: ожидающие (только для модов) */}
      {isMod && pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2"
            style={{ color:"#fbbf24" }}>
            <span>⏳ На проверке</span>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor:"rgba(245,158,11,0.15)", color:"#fbbf24" }}>{pending.length}</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {pending.map(s => (
              <ModCard key={s.id} shot={s} onApprove={() => handleReview(s.id,"approved")} onReject={() => handleReview(s.id,"rejected")} onDelete={() => handleDelete(s.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Одобренные */}
      {approved.length === 0 ? (
        <div className="text-center py-16" style={{ color:"#4b5563" }}>
          <p className="text-4xl mb-3">🖼️</p>
          <p className="text-sm">Кадров пока нет</p>
          {!user && (
            <p className="text-xs mt-2"><Link to="/login" style={{ color:"#a78bfa" }}>Войдите</Link>, чтобы добавить</p>
          )}
        </div>
      ) : (
        <div>
          {isMod && pending.length > 0 && (
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-3"
              style={{ color:"#6b7280" }}>✅ Принятые кадры</h3>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {approved.map((s, idx) => (
              <div key={s.id} className="relative group rounded-xl overflow-hidden cursor-pointer"
                style={{ aspectRatio:"16/9", backgroundColor:"#1a1d26" }}
                onClick={() => setLightbox(idx)}>
                <img src={s.image_url} alt=""
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy" />
                {/* Оверлей при hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  style={{ backgroundColor:"rgba(0,0,0,0.4)" }}>
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/>
                  </svg>
                </div>
                {/* Кнопка удалить для автора / мода */}
                {(isMod || s.user_id === user?.id) && (
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(s.id); }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full items-center justify-center hidden group-hover:flex"
                    style={{ backgroundColor:"rgba(239,68,68,0.85)", border:"none", cursor:"pointer", color:"white", fontSize:"0.7rem" }}>
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Лайтбокс */}
      {lightbox !== null && approved[lightbox] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor:"rgba(0,0,0,0.92)" }}
          onClick={() => setLightbox(null)}
          onKeyDown={handleLightboxKey}
          tabIndex={0}>
          <button onClick={e => { e.stopPropagation(); setLightbox(null); }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white"
            style={{ backgroundColor:"rgba(255,255,255,0.1)", border:"none", cursor:"pointer", fontSize:"1.2rem" }}>✕</button>

          {lightbox > 0 && (
            <button onClick={e => { e.stopPropagation(); setLightbox(l => l - 1); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor:"rgba(255,255,255,0.1)", border:"none", cursor:"pointer", fontSize:"1.4rem" }}>‹</button>
          )}

          <img
            src={approved[lightbox].image_url}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
            style={{ boxShadow:"0 25px 60px rgba(0,0,0,0.7)" }}
          />

          {lightbox < approved.length - 1 && (
            <button onClick={e => { e.stopPropagation(); setLightbox(l => l + 1); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor:"rgba(255,255,255,0.1)", border:"none", cursor:"pointer", fontSize:"1.4rem" }}>›</button>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm"
            style={{ color:"rgba(255,255,255,0.5)" }}>
            {lightbox + 1} / {approved.length}
            {approved[lightbox].submitted_by && (
              <span className="ml-3">от {approved[lightbox].submitted_by}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ModCard({ shot, onApprove, onReject, onDelete }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border:"1px solid rgba(245,158,11,0.3)", backgroundColor:"#1a1d26" }}>
      <div style={{ aspectRatio:"16/9", overflow:"hidden" }}>
        <img src={shot.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
      </div>
      <div className="p-2 space-y-1.5">
        <p className="text-xs" style={{ color:"#9ca3af" }}>от {shot.submitted_by}</p>
        <div className="flex gap-1.5">
          <button onClick={onApprove}
            className="flex-1 py-1 rounded-lg text-xs font-semibold text-white"
            style={{ background:"linear-gradient(to right,#059669,#047857)", border:"none", cursor:"pointer" }}>
            ✓ Принять
          </button>
          <button onClick={onReject}
            className="flex-1 py-1 rounded-lg text-xs font-semibold text-white"
            style={{ background:"linear-gradient(to right,#dc2626,#9f1239)", border:"none", cursor:"pointer" }}>
            ✕ Откл.
          </button>
        </div>
      </div>
    </div>
  );
}
