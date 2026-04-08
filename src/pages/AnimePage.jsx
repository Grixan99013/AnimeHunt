// src/pages/AnimePage.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../App";
import {
  fetchAnime, rateAnime, postComment, postReview, deleteReview, likeReview,
  upsertWatchlist, removeFromWatchlist, fetchWatchlist,
  STATUS_LABELS, STATUS_STYLES, TYPE_LABELS, WATCH_STATUSES, ROLE_LABELS,
} from "../api/api";

// Серия и Комментарии теперь внутри Обзора — не отдельные табы
const TABS = ["Обзор", "Персонажи", "Авторы", "Рецензии"];

export default function AnimePage() {
  const { id }   = useParams();
  const { user } = useAuth();

  const [anime, setAnime]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [activeTab, setActiveTab] = useState("Обзор");

  // Оценка
  const [myRating, setMyRating]       = useState(null);
  const [avgRating, setAvgRating]     = useState(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [hoverStar, setHoverStar]     = useState(0);

  // Watchlist
  const [watchEntry, setWatchEntry]       = useState(null);
  const [showWatchMenu, setShowWatchMenu] = useState(false);
  const [epInput, setEpInput]             = useState(0);

  // Комментарии
  const [comments, setComments]               = useState([]);
  const [commentText, setCommentText]         = useState("");
  const [commentLoading, setCommentLoading]   = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);

  // Рецензии
  const [reviews, setReviews]           = useState([]);
  const [myReview, setMyReview]         = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm]     = useState({ score: 8, title: "", body: "" });
  const [reviewLoading, setReviewLoading] = useState(false);
  const reviewFormRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    fetchAnime(id).then(d => {
      setAnime(d);
      setMyRating(d.my_rating || null);
      setAvgRating(d.avg_rating ? Number(d.avg_rating).toFixed(1) : null);
      setRatingCount(d.rating_count || 0);
      setComments(d.comments || []);
      setReviews(d.reviews || []);
      setMyReview(d.my_review || null);
      if (d.my_review) setReviewForm({ score: d.my_review.score, title: d.my_review.title, body: d.my_review.body });
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user) return;
    fetchWatchlist().then(list => {
      const e = list.find(e => String(e.id) === String(id));
      if (e) { setWatchEntry({ status: e.status, episodesWatched: e.episodes_watched }); setEpInput(e.episodes_watched || 0); }
    }).catch(() => {});
  }, [id, user]);

  const handleRate = async sc => {
    if (!user) return;
    try {
      const r = await rateAnime(id, sc);
      setMyRating(sc);
      setAvgRating(r.avg_rating ? Number(r.avg_rating).toFixed(1) : null);
      setRatingCount(r.rating_count || 0);
    } catch (e) { alert(e.message); }
  };

  const handleWatchStatus = async st => {
    if (!user) return;
    const eps = st === "completed" ? (anime?.episodes || 0) : epInput;
    try { await upsertWatchlist(id, st, eps); setWatchEntry({ status: st, episodesWatched: eps }); setEpInput(eps); setShowWatchMenu(false); }
    catch (e) { alert(e.message); }
  };
  const handleRemoveWatch = async () => {
    try { await removeFromWatchlist(id); setWatchEntry(null); setEpInput(0); setShowWatchMenu(false); }
    catch (e) { alert(e.message); }
  };
  const handleEpUpdate = async v => {
    const clamped = Math.max(0, Math.min(Number(v), anime?.episodes || 9999));
    setEpInput(clamped);
    if (watchEntry && user) try { await upsertWatchlist(id, watchEntry.status, clamped); } catch {}
  };

  const handleComment = async e => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    setCommentLoading(true);
    try { const c = await postComment(id, commentText.trim()); setComments(p => [c, ...p]); setCommentText(""); }
    catch (e) { alert(e.message); } finally { setCommentLoading(false); }
  };

  const handleReviewSubmit = async e => {
    e.preventDefault();
    setReviewLoading(true);
    try {
      const r = await postReview(id, reviewForm);
      setMyReview(r);
      setReviews(prev => {
        const idx = prev.findIndex(x => x.user_id === user.id);
        if (idx >= 0) { const n = [...prev]; n[idx] = r; return n; }
        return [r, ...prev];
      });
      setShowReviewForm(false);
      setMyRating(reviewForm.score);
    } catch (e) { alert(e.message); } finally { setReviewLoading(false); }
  };

  const handleDeleteReview = async () => {
    if (!confirm("Удалить рецензию?")) return;
    try { await deleteReview(id); setMyReview(null); setReviews(prev => prev.filter(r => r.user_id !== user.id)); }
    catch (e) { alert(e.message); }
  };

  const handleLikeReview = async reviewId => {
    if (!user) return;
    try {
      const r = await likeReview(reviewId);
      setReviews(prev => prev.map(rv => rv.id === reviewId
        ? { ...rv, liked_by_me: r.liked, likes_count: rv.likes_count + (r.liked ? 1 : -1) }
        : rv
      ));
    } catch (e) { alert(e.message); }
  };

  if (loading) return <Loader />;
  if (error || !anime) return (
    <div className="text-center py-32" style={{ color: "#6b7280" }}>
      <p className="text-4xl mb-4">😶</p>
      <p>{error || "Не найдено."}</p>
      <Link to="/catalog" style={{ color: "#a78bfa" }} className="text-sm mt-2 inline-block">← В каталог</Link>
    </div>
  );

  const statusStyle  = STATUS_STYLES[anime.status] || { color: "#9ca3af", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" };
  const curWatchMeta = watchEntry ? WATCH_STATUSES[watchEntry.status] : null;
  const genres       = Array.isArray(anime.genres) ? anime.genres.filter(Boolean) : [];
  const series       = anime.series;

  // Сколько комментариев показывать сразу
  const COMMENTS_PREVIEW = 3;
  const visibleComments  = showAllComments ? comments : comments.slice(0, COMMENTS_PREVIEW);

  return (
    <div className="space-y-8">

      {/* ── Баннер ─────────────────────────────────────────── */}
      <div className="relative -mx-4 sm:-mx-6 -mt-8 overflow-hidden rounded-2xl" style={{ height: "300px" }}>
        {anime.poster_url && (
          <img src={anime.poster_url} alt={anime.title}
            className="w-full h-full object-cover object-top"
            style={{ filter: "brightness(0.25)" }} />
        )}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to top,#0d0f14 0%,rgba(13,15,20,0.5) 60%,transparent 100%)" }} />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 flex gap-6 items-end">
          <div className="hidden sm:block rounded-xl overflow-hidden flex-shrink-0 shadow-xl"
            style={{ width: "112px", height: "160px", border: "2px solid rgba(255,255,255,0.1)" }}>
            {anime.poster_url && <img src={anime.poster_url} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={statusStyle}>
                {STATUS_LABELS[anime.status] || anime.status}
              </span>
              <span className="text-xs uppercase" style={{ color: "#6b7280" }}>{TYPE_LABELS[anime.type] || anime.type}</span>
              {anime.season_num && (
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(251,191,36,0.15)", color: "#fde68a", border: "1px solid rgba(251,191,36,0.2)" }}>
                  Сезон {anime.season_num}
                </span>
              )}
              {anime.is_new && (
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(217,70,239,0.2)", color: "#e879f9", border: "1px solid rgba(217,70,239,0.2)" }}>
                  НОВИНКА
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{anime.title}</h1>
            {anime.title_jp && <p className="text-sm mt-0.5" style={{ color: "#6b7280" }}>{anime.title_jp}</p>}
            <div className="flex flex-wrap gap-4 mt-3 text-sm" style={{ color: "#9ca3af" }}>
              {avgRating
                ? <span className="font-bold flex items-center gap-1" style={{ color: "#fbbf24" }}>
                    ⭐ {avgRating}
                    <span className="font-normal text-xs" style={{ color: "#6b7280" }}>({ratingCount} оц.)</span>
                  </span>
                : <span className="text-xs" style={{ color: "#6b7280" }}>Нет оценок</span>
              }
              {reviews.length > 0 && <span className="text-xs" style={{ color: "#6b7280" }}>{reviews.length} рец.</span>}
              {anime.episodes  && <span>{anime.episodes} эп.</span>}
              {anime.duration_min && <span>{anime.duration_min} мин/эп.</span>}
              {anime.studio_name && <span>{anime.studio_name}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Watchlist + Оценка ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Watchlist */}
        <div className="relative flex-1">
          {user ? (
            <>
              <button onClick={() => setShowWatchMenu(!showWatchMenu)}
                className="w-full flex items-center justify-between gap-3 px-5 py-3 rounded-2xl font-semibold text-sm"
                style={{ backgroundColor: curWatchMeta ? curWatchMeta.bg : "rgba(255,255,255,0.05)", border: `1px solid ${curWatchMeta ? curWatchMeta.color + "40" : "rgba(255,255,255,0.1)"}`, color: curWatchMeta ? curWatchMeta.color : "#9ca3af", cursor: "pointer" }}>
                <span className="flex items-center gap-2">
                  <span>{watchEntry?.status === "watching" ? "▶" : watchEntry?.status === "completed" ? "✓" : watchEntry?.status === "planned" ? "🕐" : "＋"}</span>
                  {watchEntry ? WATCH_STATUSES[watchEntry.status]?.label : "Добавить в список"}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"
                  style={{ transform: showWatchMenu ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                  <path d="M6 8L1 3h10z" />
                </svg>
              </button>
              {showWatchMenu && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-20 shadow-2xl"
                  style={{ backgroundColor: "#1a1d26", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {Object.entries(WATCH_STATUSES).map(([k, v]) => (
                    <button key={k} onClick={() => handleWatchStatus(k)}
                      className="w-full flex items-center gap-3 px-5 py-3 text-sm text-left"
                      style={{ background: watchEntry?.status === k ? v.bg : "transparent", color: watchEntry?.status === k ? v.color : "#d1d5db", border: "none", cursor: "pointer" }}>
                      <span style={{ color: v.color }}>{k === "watching" ? "▶" : k === "completed" ? "✓" : "🕐"}</span>
                      {v.label}
                      {watchEntry?.status === k && <span className="ml-auto text-xs opacity-60">✓</span>}
                    </button>
                  ))}
                  {watchEntry?.status === "watching" && anime.episodes && (
                    <div className="px-5 py-3 flex items-center gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <span className="text-xs" style={{ color: "#6b7280" }}>Эп. просмотрено:</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEpUpdate(epInput - 1)}
                          style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "white", cursor: "pointer", borderRadius: "50%", width: 24, height: 24 }}>−</button>
                        <input type="number" value={epInput} onChange={e => handleEpUpdate(e.target.value)}
                          min={0} max={anime.episodes}
                          className="w-12 text-center text-sm text-white outline-none rounded-lg py-0.5"
                          style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "none" }} />
                        <button onClick={() => handleEpUpdate(epInput + 1)}
                          style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "white", cursor: "pointer", borderRadius: "50%", width: 24, height: 24 }}>+</button>
                        <span className="text-xs" style={{ color: "#6b7280" }}>/ {anime.episodes}</span>
                      </div>
                    </div>
                  )}
                  {watchEntry && (
                    <button onClick={handleRemoveWatch} className="w-full flex items-center gap-3 px-5 py-3 text-sm"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: "#f87171", background: "transparent", border: "none", cursor: "pointer", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      ✕ Удалить из списка
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <Link to="/login" className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold"
              style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#9ca3af" }}>
              ＋ Войдите, чтобы добавить в список
            </Link>
          )}
        </div>

        {/* Оценка */}
        <div className="flex-1 rounded-2xl px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3"
          style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div>
            <p className="text-sm font-semibold text-white">Ваша оценка</p>
            <p className="text-xs" style={{ color: "#6b7280" }}>
              {user ? (myRating ? `${myRating}/10` : "Не оценено") : "Войдите, чтобы оценить"}
            </p>
          </div>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => {
              const f = hoverStar ? s <= hoverStar : s <= (myRating || 0);
              return (
                <button key={s} onClick={() => user && handleRate(s)}
                  onMouseEnter={() => user && setHoverStar(s)}
                  onMouseLeave={() => setHoverStar(0)}
                  title={`${s}/10`}
                  style={{ background: "transparent", border: "none", cursor: user ? "pointer" : "not-allowed", color: f ? "#fbbf24" : "#374151", fontSize: "1.1rem", transform: hoverStar === s ? "scale(1.3)" : "scale(1)", transition: "transform 0.1s,color 0.1s", padding: "0 1px" }}>
                  ★
                </button>
              );
            })}
          </div>
          {avgRating && (
            <div className="ml-auto text-right shrink-0">
              <p className="text-xl font-black" style={{ color: "#fbbf24" }}>{avgRating}</p>
              <p className="text-xs" style={{ color: "#6b7280" }}>{ratingCount} оц.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Табы ───────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-2 text-sm font-medium whitespace-nowrap"
            style={{ color: activeTab === tab ? "#c4b5fd" : "#6b7280", borderBottom: activeTab === tab ? "2px solid #8b5cf6" : "2px solid transparent", background: "transparent", border: "none", borderBottom: activeTab === tab ? "2px solid #8b5cf6" : "2px solid transparent", cursor: "pointer" }}>
            {tab}
            {tab === "Рецензии" && reviews.length > 0 && (
              <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                {reviews.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          ТАБ: ОБЗОР
          Структура: описание → инфо → жанры → серия → комментарии
         ══════════════════════════════════════════════════════ */}
      {activeTab === "Обзор" && (
        <div className="space-y-10">

          {/* Описание + инфо-сайдбар */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "#6b7280" }}>Описание</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#d1d5db" }}>
                  {anime.synopsis || "Описание отсутствует."}
                </p>
              </div>
              {genres.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: "#6b7280" }}>Жанры</h3>
                  <div className="flex flex-wrap gap-2">
                    {genres.map(g => (
                      <span key={g} className="px-3 py-1 rounded-full text-xs"
                        style={{ background: "rgba(139,92,246,0.1)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.2)" }}>
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Инфо-сайдбар */}
            <div className="rounded-2xl overflow-hidden" style={{ alignSelf: "start", backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.05)" }}>
              {[
                ["Статус",     STATUS_LABELS[anime.status] || anime.status],
                ["Тип",        TYPE_LABELS[anime.type] || anime.type],
                ["Эпизоды",    anime.episodes ?? "?"],
                ["Длит./эп.",  anime.duration_min ? `${anime.duration_min} мин` : "—"],
                ["Трансляция", `${anime.aired_from ? String(anime.aired_from).slice(0, 4) : "?"} – ${anime.aired_to ? String(anime.aired_to).slice(0, 4) : "?"}`],
                ["Студия",     anime.studio_name || "—"],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between items-center px-4 py-2.5 text-sm"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ color: "#6b7280" }}>{l}</span>
                  <span className="font-medium text-white text-right ml-4">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Серия (список сезонов) — только если есть несколько ── */}
          {series && series.entries && series.entries.length > 1 && (
            <div className="space-y-3">
              <div className="flex items-baseline gap-3">
                <h3 className="text-base font-bold text-white">Все части серии</h3>
                <span className="text-sm" style={{ color: "#6b7280" }}>{series.series_title}</span>
              </div>
              <div className="space-y-2">
                {series.entries.map(entry => {
                  const isCurrent = String(entry.id) === String(id);
                  return (
                    <Link key={entry.id} to={`/anime/${entry.id}`}
                      className="flex items-center gap-4 rounded-xl px-4 py-3 transition-all"
                      style={{
                        backgroundColor: isCurrent ? "rgba(139,92,246,0.1)" : "#13151c",
                        border: isCurrent ? "1px solid rgba(139,92,246,0.35)" : "1px solid rgba(255,255,255,0.05)",
                        textDecoration: "none",
                      }}
                      onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.borderColor = "rgba(139,92,246,0.25)"; }}
                      onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; }}>
                      {/* Постер */}
                      <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0"
                        style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                        {entry.poster_url
                          ? <img src={entry.poster_url} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full" style={{ backgroundColor: "#1a1d26" }} />}
                      </div>
                      {/* Инфо */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          {entry.season_num && (
                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: "rgba(251,191,36,0.15)", color: "#fde68a" }}>
                              Сезон {entry.season_num}
                            </span>
                          )}
                          {isCurrent && (
                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: "rgba(139,92,246,0.25)", color: "#c4b5fd" }}>
                              Текущий
                            </span>
                          )}
                          <span className="text-xs" style={{ color: STATUS_STYLES[entry.status]?.color || "#6b7280" }}>
                            {STATUS_LABELS[entry.status] || entry.status}
                          </span>
                        </div>
                        <p className={`font-semibold text-sm truncate ${isCurrent ? "text-violet-300" : "text-white"}`}>
                          {entry.title}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
                          {entry.episodes && `${entry.episodes} эп.`}
                          {entry.aired_from && ` · ${String(entry.aired_from).slice(0, 4)}`}
                        </p>
                      </div>
                      {!isCurrent && <span style={{ color: "#6b7280", fontSize: "0.75rem", flexShrink: 0 }}>→</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Комментарии ── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                Комментарии
                {comments.length > 0 && (
                  <span className="ml-2 text-sm font-normal" style={{ color: "#6b7280" }}>({comments.length})</span>
                )}
              </h3>
            </div>

            {/* Форма */}
            {user ? (
              <form onSubmit={handleComment} className="space-y-2">
                <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                  placeholder="Поделитесь впечатлениями…" rows={3}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none resize-none"
                  style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.1)" }}
                  onFocus={e => e.target.style.borderColor = "rgba(139,92,246,0.4)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
                <button type="submit" disabled={!commentText.trim() || commentLoading}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white"
                  style={{ background: commentText.trim() ? "linear-gradient(to right,#7c3aed,#a21caf)" : "rgba(255,255,255,0.1)", opacity: commentText.trim() ? 1 : 0.5, cursor: commentText.trim() ? "pointer" : "not-allowed", border: "none" }}>
                  {commentLoading ? "Отправка…" : "Отправить"}
                </button>
              </form>
            ) : (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.05)", color: "#6b7280" }}>
                <Link to="/login" style={{ color: "#a78bfa" }}>Войдите</Link>, чтобы оставить комментарий.
              </div>
            )}

            {/* Список */}
            {comments.length === 0 ? (
              <p className="text-sm py-4" style={{ color: "#4b5563" }}>Комментариев пока нет. Будьте первым!</p>
            ) : (
              <div className="space-y-2">
                {visibleComments.map(c => (
                  <div key={c.id} className="rounded-xl px-4 py-3"
                    style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: "linear-gradient(135deg,#7c3aed,#a21caf)" }}>
                        {c.username?.[0]?.toUpperCase() || "?"}
                      </span>
                      <span className="text-sm font-medium text-white">{c.username}</span>
                      <span className="text-xs ml-auto" style={{ color: "#4b5563" }}>
                        {new Date(c.created_at).toLocaleDateString("ru-RU")}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: "#d1d5db" }}>{c.body}</p>
                  </div>
                ))}

                {/* Кнопка «показать больше» */}
                {comments.length > COMMENTS_PREVIEW && (
                  <button onClick={() => setShowAllComments(!showAllComments)}
                    className="w-full py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#9ca3af", cursor: "pointer" }}>
                    {showAllComments
                      ? "Свернуть"
                      : `Показать ещё ${comments.length - COMMENTS_PREVIEW} комментари${comments.length - COMMENTS_PREVIEW === 1 ? "й" : "ев"}`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Персонажи ─────────────────────────────────────── */}
      {activeTab === "Персонажи" && (
        !anime.characters?.length ? <Empty text="Персонажи не добавлены." /> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {anime.characters.map(c => (
              <Link key={c.id} to={`/character/${c.id}`}
                className="group flex flex-col rounded-xl p-4 transition-all"
                style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.05)", textDecoration: "none" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"}>
                <div className="w-16 h-16 rounded-full overflow-hidden mb-3 mx-auto"
                  style={{ backgroundColor: "#1a1d26", border: "1px solid rgba(255,255,255,0.1)" }}>
                  {c.image_url
                    ? <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-xl font-bold" style={{ color: "#4b5563" }}>{c.name[0]}</div>}
                </div>
                <p className="font-semibold text-sm text-white text-center group-hover:text-violet-300 transition-colors">{c.name}</p>
                {c.name_jp && <p className="text-xs text-center mt-0.5" style={{ color: "#4b5563" }}>{c.name_jp}</p>}
                <p className="text-xs text-center mt-1" style={{ color: "#6b7280" }}>{ROLE_LABELS[c.role] || c.role}</p>
              </Link>
            ))}
          </div>
        )
      )}

      {/* ── Авторы ────────────────────────────────────────── */}
      {activeTab === "Авторы" && (
        !anime.staff?.length ? <Empty text="Данные об авторах отсутствуют." /> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {anime.staff.map(s => (
              <div key={s.id} className="rounded-xl p-4"
                style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="font-semibold text-sm text-white">{s.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "#a78bfa" }}>{s.anime_role || s.role}</p>
                {s.bio && <p className="text-xs mt-2 line-clamp-2" style={{ color: "#6b7280" }}>{s.bio}</p>}
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Рецензии ──────────────────────────────────────── */}
      {activeTab === "Рецензии" && (
        <div className="space-y-6">
          {/* Моя рецензия / кнопка */}
          {user && (
            myReview && !showReviewForm ? (
              <div className="rounded-2xl overflow-hidden"
                style={{ backgroundColor: "#13151c", border: "1px solid rgba(139,92,246,0.3)" }}>
                <div className="flex items-center justify-between px-5 py-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", backgroundColor: "rgba(139,92,246,0.08)" }}>
                  <p className="text-sm font-semibold" style={{ color: "#c4b5fd" }}>Ваша рецензия</p>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowReviewForm(true); setTimeout(() => reviewFormRef.current?.scrollIntoView({ behavior: "smooth" }), 100); }}
                      className="text-xs px-3 py-1 rounded-lg"
                      style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd", border: "none", cursor: "pointer" }}>
                      Редактировать
                    </button>
                    <button onClick={handleDeleteReview}
                      className="text-xs px-3 py-1 rounded-lg"
                      style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "none", cursor: "pointer" }}>
                      Удалить
                    </button>
                  </div>
                </div>
                <ReviewCard r={myReview} user={user} onLike={handleLikeReview} highlight />
              </div>
            ) : (
              !showReviewForm && (
                <button onClick={() => setShowReviewForm(true)}
                  className="w-full py-3 rounded-2xl text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(to right,#7c3aed,#a21caf)", border: "none", cursor: "pointer" }}>
                  ✍️ Написать рецензию
                </button>
              )
            )
          )}
          {!user && (
            <div className="rounded-xl px-5 py-4 text-sm"
              style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.05)", color: "#6b7280" }}>
              <Link to="/login" style={{ color: "#a78bfa" }}>Войдите</Link>, чтобы написать рецензию.
            </div>
          )}

          {/* Форма рецензии */}
          {showReviewForm && (
            <div ref={reviewFormRef} className="rounded-2xl p-5 space-y-4"
              style={{ backgroundColor: "#13151c", border: "1px solid rgba(139,92,246,0.3)" }}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-white">{myReview ? "Редактировать рецензию" : "Написать рецензию"}</p>
                <button onClick={() => setShowReviewForm(false)}
                  style={{ background: "transparent", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#6b7280" }}>Ваша оценка *</p>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => (
                      <button key={s} onClick={() => setReviewForm(p => ({ ...p, score: s }))}
                        style={{ background: "transparent", border: "none", cursor: "pointer", color: s <= reviewForm.score ? "#fbbf24" : "#374151", fontSize: "1.2rem", padding: "0 1px" }}>★</button>
                    ))}
                  </div>
                  <span className="text-sm font-bold" style={{ color: "#fbbf24" }}>{reviewForm.score}/10</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#6b7280" }}>Заголовок *</p>
                <input value={reviewForm.title} onChange={e => setReviewForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Краткое мнение о тайтле…" maxLength={255}
                  className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                  style={{ backgroundColor: "#0d0f14", border: "1px solid rgba(255,255,255,0.1)" }}
                  onFocus={e => e.target.style.borderColor = "rgba(139,92,246,0.4)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#6b7280" }}>
                    Текст рецензии * <span style={{ color: "#4b5563" }}>(минимум 100 символов)</span>
                  </p>
                  <span className="text-xs" style={{ color: reviewForm.body.length >= 100 ? "#34d399" : "#6b7280" }}>
                    {reviewForm.body.length}
                  </span>
                </div>
                <textarea value={reviewForm.body} onChange={e => setReviewForm(p => ({ ...p, body: e.target.value }))}
                  placeholder="Подробно опишите своё впечатление — сюжет, персонажи, анимация…" rows={6}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none resize-none"
                  style={{ backgroundColor: "#0d0f14", border: "1px solid rgba(255,255,255,0.1)" }}
                  onFocus={e => e.target.style.borderColor = "rgba(139,92,246,0.4)"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
              </div>
              <div className="flex gap-3">
                <button onClick={handleReviewSubmit}
                  disabled={reviewLoading || !reviewForm.title.trim() || reviewForm.body.trim().length < 100}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(to right,#7c3aed,#a21caf)", opacity: reviewLoading || !reviewForm.title.trim() || reviewForm.body.trim().length < 100 ? 0.5 : 1, cursor: "pointer", border: "none" }}>
                  {reviewLoading ? "Сохраняем…" : myReview ? "Сохранить изменения" : "Опубликовать"}
                </button>
                <button onClick={() => setShowReviewForm(false)}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "none", color: "#9ca3af", cursor: "pointer" }}>
                  Отмена
                </button>
              </div>
            </div>
          )}

          {reviews.length === 0 && !showReviewForm && (
            <div className="text-center py-16" style={{ color: "#4b5563" }}>
              <p className="text-4xl mb-3">📝</p>
              <p className="text-sm">Рецензий пока нет. Будьте первым!</p>
            </div>
          )}
          {reviews.filter(r => !myReview || r.user_id !== user?.id).map(r => (
            <ReviewCard key={r.id} r={r} user={user} onLike={handleLikeReview} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ r, user, onLike, highlight }) {
  const scoreColors = { 10: "#34d399", 9: "#34d399", 8: "#fbbf24", 7: "#fbbf24", 6: "#f59e0b", 5: "#f59e0b", 4: "#ef4444", 3: "#ef4444", 2: "#ef4444", 1: "#ef4444" };
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: highlight ? "transparent" : "#13151c", border: highlight ? "none" : "1px solid rgba(255,255,255,0.05)" }}>
      <div className="px-5 py-4">
        <div className="flex items-start gap-3 mb-4">
          <span className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#7c3aed,#a21caf)" }}>
            {r.username?.[0]?.toUpperCase() || "?"}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-white">{r.username}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ backgroundColor: `${scoreColors[r.score]}20`, color: scoreColors[r.score], border: `1px solid ${scoreColors[r.score]}40` }}>
                ★ {r.score}/10
              </span>
              <span className="text-xs ml-auto" style={{ color: "#4b5563" }}>
                {new Date(r.created_at).toLocaleDateString("ru-RU")}
              </span>
            </div>
            <h4 className="font-bold text-white mt-1">{r.title}</h4>
          </div>
        </div>
        <div className="text-sm leading-relaxed" style={{ color: "#d1d5db", whiteSpace: "pre-wrap" }}>{r.body}</div>
        <div className="flex items-center gap-3 mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <button onClick={() => onLike(r.id)} disabled={!user || r.user_id === user?.id}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all"
            style={{ background: r.liked_by_me ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)", color: r.liked_by_me ? "#f87171" : "#6b7280", border: `1px solid ${r.liked_by_me ? "rgba(239,68,68,0.3)" : "transparent"}`, cursor: user && r.user_id !== user?.id ? "pointer" : "not-allowed" }}>
            {r.liked_by_me ? "❤" : "🤍"} Полезно {r.likes_count > 0 && `(${r.likes_count})`}
          </button>
          {r.updated_at > r.created_at && (
            <span className="text-xs" style={{ color: "#4b5563" }}>
              изменено {new Date(r.updated_at).toLocaleDateString("ru-RU")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Empty({ text }) {
  return <div className="py-16 text-center text-sm" style={{ color: "#4b5563" }}>{text}</div>;
}
function Loader() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 rounded-full border-2 animate-spin"
        style={{ borderColor: "rgba(255,255,255,0.1)", borderTopColor: "#8b5cf6" }} />
    </div>
  );
}
