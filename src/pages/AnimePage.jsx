// src/pages/AnimePage.jsx
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../App";
import {
  fetchAnime, rateAnime, postComment,
  upsertWatchlist, removeFromWatchlist, fetchWatchlist,
  STATUS_LABELS, STATUS_STYLES, TYPE_LABELS, WATCH_STATUSES,
} from "../api/api";

const TABS = ["Обзор", "Персонажи", "Сезоны", "Авторы", "Комментарии"];

export default function AnimePage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [anime, setAnime]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [activeTab, setActiveTab] = useState("Обзор");

  // Оценка
  const [myRating, setMyRating]   = useState(null);
  const [avgRating, setAvgRating] = useState(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);

  // Список просмотра
  const [watchEntry, setWatchEntry]     = useState(null);
  const [showWatchMenu, setShowWatchMenu] = useState(false);
  const [epInput, setEpInput]           = useState(0);

  // Комментарии
  const [comments, setComments]   = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchAnime(id)
      .then(data => {
        setAnime(data);
        setMyRating(data.my_rating || null);
        setAvgRating(data.avg_rating ? Number(data.avg_rating).toFixed(1) : null);
        setRatingCount(data.rating_count || 0);
        setComments(data.comments || []);
        // Нет watchlist в этом запросе — он грузится отдельно
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Загрузить watchlist запись если пользователь авторизован
  useEffect(() => {
    if (!user) return;
    fetchWatchlist().then(list => {
      const entry = list.find(e => String(e.id) === String(id));
      if (entry) {
        setWatchEntry({ status: entry.status, episodesWatched: entry.episodes_watched });
        setEpInput(entry.episodes_watched || 0);
      }
    }).catch(() => {});
    ;
  }, [id, user]);

  const handleRate = async (score) => {
    if (!user) return;
    try {
      const res = await rateAnime(id, score);
      setMyRating(score);
      setAvgRating(res.avg_rating ? Number(res.avg_rating).toFixed(1) : null);
      setRatingCount(res.rating_count || 0);
    } catch (e) { alert(e.message); }
  };

  const handleWatchStatus = async (status) => {
    if (!user) return;
    const eps = status === "completed" ? (anime?.episodes || 0) : epInput;
    try {
      await upsertWatchlist(id, status, eps);
      setWatchEntry({ status, episodesWatched: eps });
      setEpInput(eps);
      setShowWatchMenu(false);
    } catch (e) { alert(e.message); }
  };

  const handleRemoveWatch = async () => {
    if (!user) return;
    try {
      await removeFromWatchlist(id);
      setWatchEntry(null);
      setEpInput(0);
      setShowWatchMenu(false);
    } catch (e) { alert(e.message); }
  };

  const handleEpUpdate = async (val) => {
    const clamped = Math.max(0, Math.min(Number(val), anime?.episodes || 9999));
    setEpInput(clamped);
    if (watchEntry && user) {
      try { await upsertWatchlist(id, watchEntry.status, clamped); } catch {}
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    setCommentLoading(true);
    try {
      const newC = await postComment(id, commentText.trim());
      setComments(prev => [newC, ...prev]);
      setCommentText("");
    } catch (e) { alert(e.message); }
    finally { setCommentLoading(false); }
  };

  if (loading) return <Loader />;
  if (error || !anime) return (
    <div className="text-center py-32" style={{ color:"#6b7280" }}>
      <p className="text-4xl mb-4">😶</p>
      <p>{error || "Аниме не найдено."}</p>
      <Link to="/catalog" className="text-sm mt-2 inline-block" style={{ color:"#a78bfa" }}>← В каталог</Link>
    </div>
  );

  const statusStyle    = STATUS_STYLES[anime.status] || { color:"#9ca3af", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)" };
  const currentWatchMeta = watchEntry ? WATCH_STATUSES[watchEntry.status] : null;
  const genres = Array.isArray(anime.genres) ? anime.genres.filter(Boolean) : [];

  return (
    <div className="space-y-8">

      {/* Баннер */}
      <div className="relative -mx-4 sm:-mx-6 -mt-8 overflow-hidden rounded-2xl" style={{ height:"300px" }}>
        {anime.poster_url && (
          <img src={anime.poster_url} alt={anime.title}
            className="w-full h-full object-cover object-top"
            style={{ filter:"brightness(0.25)" }} />
        )}
        <div className="absolute inset-0"
          style={{ background:"linear-gradient(to top, #0d0f14 0%, rgba(13,15,20,0.5) 60%, transparent 100%)" }} />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 flex gap-6 items-end">
          <div className="hidden sm:block rounded-xl overflow-hidden flex-shrink-0 shadow-xl"
            style={{ width:"112px", height:"160px", border:"2px solid rgba(255,255,255,0.1)" }}>
            {anime.poster_url
              ? <img src={anime.poster_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full" style={{ backgroundColor:"#1a1d26" }} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={statusStyle}>
                {STATUS_LABELS[anime.status] || anime.status}
              </span>
              <span className="text-xs uppercase" style={{ color:"#6b7280" }}>
                {TYPE_LABELS[anime.type] || anime.type}
              </span>
              {anime.is_new && (
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background:"rgba(217,70,239,0.2)", color:"#e879f9", border:"1px solid rgba(217,70,239,0.2)" }}>
                  НОВИНКА
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{anime.title}</h1>
            {anime.title_jp && <p className="text-sm mt-0.5" style={{ color:"#6b7280" }}>{anime.title_jp}</p>}
            <div className="flex flex-wrap gap-4 mt-3 text-sm" style={{ color:"#9ca3af" }}>
              {avgRating ? (
                <span className="font-bold flex items-center gap-1" style={{ color:"#fbbf24" }}>
                  ⭐ {avgRating}
                  <span className="font-normal text-xs" style={{ color:"#6b7280" }}>({ratingCount} оц.)</span>
                </span>
              ) : <span className="text-xs" style={{ color:"#6b7280" }}>Нет оценок</span>}
              {anime.episodes && <span>{anime.episodes} эп.</span>}
              {anime.duration_min && <span>{anime.duration_min} мин/эп.</span>}
              {anime.studio_name && <span>{anime.studio_name}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Панель: список + оценка */}
      <div className="flex flex-col sm:flex-row gap-4">

        {/* Кнопка списка */}
        <div className="relative flex-1">
          {user ? (
            <>
              <button onClick={() => setShowWatchMenu(!showWatchMenu)}
                className="w-full flex items-center justify-between gap-3 px-5 py-3 rounded-2xl font-semibold text-sm"
                style={{
                  backgroundColor: currentWatchMeta ? currentWatchMeta.bg : "rgba(255,255,255,0.05)",
                  border:`1px solid ${currentWatchMeta ? currentWatchMeta.color+"40" : "rgba(255,255,255,0.1)"}`,
                  color: currentWatchMeta ? currentWatchMeta.color : "#9ca3af",
                  cursor:"pointer",
                }}>
                <span className="flex items-center gap-2">
                  <span>{watchEntry?.status==="watching"?"▶":watchEntry?.status==="completed"?"✓":watchEntry?.status==="planned"?"🕐":"＋"}</span>
                  {watchEntry ? WATCH_STATUSES[watchEntry.status]?.label : "Добавить в список"}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"
                  style={{ transform:showWatchMenu?"rotate(180deg)":"none", transition:"transform 0.2s" }}>
                  <path d="M6 8L1 3h10z"/>
                </svg>
              </button>

              {showWatchMenu && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-20 shadow-2xl"
                  style={{ backgroundColor:"#1a1d26", border:"1px solid rgba(255,255,255,0.08)" }}>
                  {Object.entries(WATCH_STATUSES).map(([key, val]) => (
                    <button key={key} onClick={() => handleWatchStatus(key)}
                      className="w-full flex items-center gap-3 px-5 py-3 text-sm text-left"
                      style={{
                        background: watchEntry?.status===key ? val.bg : "transparent",
                        color: watchEntry?.status===key ? val.color : "#d1d5db",
                        border:"none", cursor:"pointer",
                      }}>
                      <span style={{ color:val.color }}>
                        {key==="watching"?"▶":key==="completed"?"✓":"🕐"}
                      </span>
                      {val.label}
                      {watchEntry?.status===key && <span className="ml-auto text-xs opacity-60">✓</span>}
                    </button>
                  ))}

                  {watchEntry?.status==="watching" && anime.episodes && (
                    <div className="px-5 py-3 flex items-center gap-3"
                      style={{ borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                      <span className="text-xs" style={{ color:"#6b7280" }}>Эп. просмотрено:</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEpUpdate(epInput-1)}
                          style={{ background:"rgba(255,255,255,0.08)", border:"none", color:"white", cursor:"pointer", borderRadius:"50%", width:24, height:24 }}>−</button>
                        <input type="number" value={epInput}
                          onChange={e => handleEpUpdate(e.target.value)}
                          className="w-12 text-center text-sm text-white outline-none rounded-lg py-0.5"
                          style={{ backgroundColor:"rgba(255,255,255,0.08)", border:"none" }}
                          min={0} max={anime.episodes} />
                        <button onClick={() => handleEpUpdate(epInput+1)}
                          style={{ background:"rgba(255,255,255,0.08)", border:"none", color:"white", cursor:"pointer", borderRadius:"50%", width:24, height:24 }}>+</button>
                        <span className="text-xs" style={{ color:"#6b7280" }}>/ {anime.episodes}</span>
                      </div>
                    </div>
                  )}

                  {watchEntry && (
                    <button onClick={handleRemoveWatch}
                      className="w-full flex items-center gap-3 px-5 py-3 text-sm text-left"
                      style={{ borderTop:"1px solid rgba(255,255,255,0.06)", color:"#f87171", background:"transparent", border:"none", cursor:"pointer", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                      ✕ Удалить из списка
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <Link to="/login"
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold"
              style={{ backgroundColor:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"#9ca3af" }}>
              ＋ Войдите, чтобы добавить в список
            </Link>
          )}
        </div>

        {/* Оценка */}
        <div className="flex-1 rounded-2xl px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3"
          style={{ backgroundColor:"#13151c", border:"1px solid rgba(255,255,255,0.05)" }}>
          <div>
            <p className="text-sm font-semibold text-white">Ваша оценка</p>
            <p className="text-xs" style={{ color:"#6b7280" }}>
              {user ? (myRating ? `${myRating}/10` : "Не оценено") : "Войдите, чтобы оценить"}
            </p>
          </div>
          <div className="flex gap-0.5">
            {[1,2,3,4,5,6,7,8,9,10].map(star => {
              const filled = hoverStar ? star<=hoverStar : star<=(myRating||0);
              return (
                <button key={star}
                  onClick={() => user && handleRate(star)}
                  onMouseEnter={() => user && setHoverStar(star)}
                  onMouseLeave={() => setHoverStar(0)}
                  title={`${star}/10`}
                  style={{
                    background:"transparent", border:"none",
                    cursor: user ? "pointer" : "not-allowed",
                    color: filled ? "#fbbf24" : "#374151",
                    fontSize:"1.1rem",
                    transform: hoverStar===star ? "scale(1.3)" : "scale(1)",
                    transition:"transform 0.1s, color 0.1s",
                    padding:"0 1px",
                  }}>★</button>
              );
            })}
          </div>
          {avgRating && (
            <div className="ml-auto text-right shrink-0">
              <p className="text-xl font-black" style={{ color:"#fbbf24" }}>{avgRating}</p>
              <p className="text-xs" style={{ color:"#6b7280" }}>{ratingCount} оц.</p>
            </div>
          )}
        </div>
      </div>

      {/* Табы */}
      <div className="flex gap-1 overflow-x-auto" style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-2 text-sm font-medium whitespace-nowrap"
            style={{
              color: activeTab===tab ? "#c4b5fd" : "#6b7280",
              borderBottom: activeTab===tab ? "2px solid #8b5cf6" : "2px solid transparent",
              background:"transparent", border:"none",
              borderBottom: activeTab===tab ? "2px solid #8b5cf6" : "2px solid transparent",
              cursor:"pointer",
            }}>
            {tab}
            {tab==="Комментарии" && comments.length>0 && (
              <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
                style={{ background:"rgba(255,255,255,0.1)" }}>{comments.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Обзор */}
      {activeTab==="Обзор" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color:"#6b7280" }}>Описание</h3>
              <p className="text-sm leading-relaxed" style={{ color:"#d1d5db" }}>{anime.synopsis || "Описание отсутствует."}</p>
            </div>
            {genres.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color:"#6b7280" }}>Жанры</h3>
                <div className="flex flex-wrap gap-2">
                  {genres.map(g => (
                    <span key={g} className="px-3 py-1 rounded-full text-xs"
                      style={{ background:"rgba(139,92,246,0.1)", color:"#c4b5fd", border:"1px solid rgba(139,92,246,0.2)" }}>
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div>
            {[
              ["Статус",     STATUS_LABELS[anime.status] || anime.status],
              ["Тип",        TYPE_LABELS[anime.type] || anime.type],
              ["Эпизоды",    anime.episodes ?? "?"],
              ["Длит./эп.",  anime.duration_min ? `${anime.duration_min} мин` : "—"],
              ["Трансляция", `${anime.aired_from ? String(anime.aired_from).slice(0,4) : "?"} – ${anime.aired_to ? String(anime.aired_to).slice(0,4) : "?"}`],
              ["Студия",     anime.studio_name || "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center py-2 text-sm"
                style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ color:"#6b7280" }}>{label}</span>
                <span className="font-medium text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Персонажи */}
      {activeTab==="Персонажи" && (
        !anime.characters?.length ? <Empty text="Персонажи не добавлены." /> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {anime.characters.map(c => (
              <div key={c.id} className="rounded-xl p-4"
                style={{ backgroundColor:"#13151c", border:"1px solid rgba(255,255,255,0.05)" }}>
                <div className="w-16 h-16 rounded-full overflow-hidden mb-3"
                  style={{ backgroundColor:"#1a1d26", border:"1px solid rgba(255,255,255,0.1)" }}>
                  {c.image_url
                    ? <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xl font-bold"
                        style={{ color:"#4b5563" }}>{c.name[0]}</div>}
                </div>
                <p className="font-semibold text-sm text-white">{c.name}</p>
                <p className="text-xs mt-0.5" style={{ color:"#6b7280" }}>
                  {c.role==="main"?"Главный":"Второстепенный"}
                </p>
                {c.description && <p className="text-xs mt-2 line-clamp-3" style={{ color:"#9ca3af" }}>{c.description}</p>}
              </div>
            ))}
          </div>
        )
      )}

      {/* Сезоны */}
      {activeTab==="Сезоны" && (
        !anime.seasons?.length ? <Empty text="Данные о сезонах отсутствуют." /> : (
          <div className="space-y-3">
            {anime.seasons.map(s => (
              <div key={s.id} className="px-5 py-4 rounded-xl flex items-center justify-between"
                style={{ backgroundColor:"#13151c", border:"1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <p className="font-semibold text-sm text-white">
                    Сезон {s.season_num}{s.title ? ` — ${s.title}` : ""}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color:"#6b7280" }}>
                    {s.aired_from ? String(s.aired_from).slice(0,4) : "TBA"}
                  </p>
                </div>
                <span className="text-sm" style={{ color:"#9ca3af" }}>{s.episodes} эп.</span>
              </div>
            ))}
          </div>
        )
      )}

      {/* Авторы */}
      {activeTab==="Авторы" && (
        !anime.staff?.length ? <Empty text="Данные об авторах отсутствуют." /> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {anime.staff.map(s => (
              <div key={s.id} className="rounded-xl p-4"
                style={{ backgroundColor:"#13151c", border:"1px solid rgba(255,255,255,0.05)" }}>
                <p className="font-semibold text-sm text-white">{s.name}</p>
                <p className="text-xs mt-0.5" style={{ color:"#a78bfa" }}>{s.anime_role || s.role}</p>
                {s.bio && <p className="text-xs mt-2 line-clamp-2" style={{ color:"#6b7280" }}>{s.bio}</p>}
              </div>
            ))}
          </div>
        )
      )}

      {/* Комментарии */}
      {activeTab==="Комментарии" && (
        <div className="space-y-6">
          {user ? (
            <form onSubmit={handleComment} className="space-y-3">
              <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                placeholder="Поделитесь впечатлениями…" rows={3}
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none resize-none"
                style={{ backgroundColor:"#13151c", border:"1px solid rgba(255,255,255,0.1)" }}
                onFocus={e => e.target.style.borderColor="rgba(139,92,246,0.4)"}
                onBlur={e => e.target.style.borderColor="rgba(255,255,255,0.1)"} />
              <button type="submit" disabled={!commentText.trim() || commentLoading}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white"
                style={{
                  background: commentText.trim() ? "linear-gradient(to right, #7c3aed, #a21caf)" : "rgba(255,255,255,0.1)",
                  opacity: commentText.trim() ? 1 : 0.5,
                  cursor: commentText.trim() ? "pointer" : "not-allowed",
                  border:"none",
                }}>
                {commentLoading ? "Отправка…" : "Отправить"}
              </button>
            </form>
          ) : (
            <div className="rounded-xl px-5 py-4 text-sm"
              style={{ backgroundColor:"#13151c", border:"1px solid rgba(255,255,255,0.05)", color:"#6b7280" }}>
              <Link to="/login" style={{ color:"#a78bfa" }}>Войдите</Link>, чтобы оставить комментарий.
            </div>
          )}

          {comments.length===0 ? <Empty text="Комментариев пока нет. Будьте первым!" /> : (
            <div className="space-y-3">
              {comments.map(c => (
                <div key={c.id} className="rounded-xl px-5 py-4"
                  style={{ backgroundColor:"#13151c", border:"1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background:"linear-gradient(135deg, #7c3aed, #a21caf)" }}>
                      {c.username?.[0]?.toUpperCase() || "?"}
                    </span>
                    <span className="text-sm font-medium text-white">{c.username}</span>
                    <span className="text-xs ml-auto" style={{ color:"#4b5563" }}>
                      {new Date(c.created_at).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color:"#d1d5db" }}>{c.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Empty({ text }) {
  return <div className="py-16 text-center text-sm" style={{ color:"#4b5563" }}>{text}</div>;
}

function Loader() {
  return (
    <div className="flex items-center justify-center py-32" style={{ color:"#6b7280" }}>
      <div className="w-8 h-8 rounded-full border-2 animate-spin"
        style={{ borderColor:"rgba(255,255,255,0.1)", borderTopColor:"#8b5cf6" }} />
    </div>
  );
}
