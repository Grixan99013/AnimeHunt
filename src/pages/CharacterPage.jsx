// src/pages/CharacterPage.jsx
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../App";
import {
  fetchCharacter, toggleFavorite, postCharacterComment,
  shipCharacter, unshipCharacter,
  ROLE_LABELS, STATUS_LABELS,
} from "../api/api";

export default function CharacterPage() {
  const { id }   = useParams();
  const { user } = useAuth();

  const [char, setChar]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  // Избранное
  const [favLoading, setFavLoading] = useState(false);

  // Комментарии
  const [comments, setComments]             = useState([]);
  const [commentText, setCommentText]       = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // Шипперинг
  const [myShip, setMyShip]           = useState(null);   // { shipped_with, shipped_name, shipped_img }
  const [topShips, setTopShips]       = useState([]);
  const [selectedShip, setSelectedShip] = useState("");   // id выбранного кандидата
  const [shipLoading, setShipLoading] = useState(false);
  const [showTopShips, setShowTopShips] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchCharacter(id)
      .then(data => {
        setChar(data);
        setComments(data.comments || []);
        setMyShip(data.my_ship || null);
        setTopShips(data.top_ships || []);
        if (data.my_ship && !data.my_ship.is_reverse) setSelectedShip(String(data.my_ship.shipped_with));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // ── Избранное ───────────────────────────────────────────────
  const handleFavorite = async () => {
    if (!user || favLoading) return;
    setFavLoading(true);
    try {
      const res = await toggleFavorite(id);
      setChar(prev => ({
        ...prev,
        is_favorite:     res.is_favorite,
        favorites_count: res.favorites_count,
      }));
    } catch (e) { alert(e.message); }
    finally { setFavLoading(false); }
  };

  // ── Комментарий ─────────────────────────────────────────────
  const handleComment = async e => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    setCommentLoading(true);
    try {
      const newC = await postCharacterComment(id, commentText.trim());
      setComments(prev => [newC, ...prev]);
      setCommentText("");
    } catch (e) { alert(e.message); }
    finally { setCommentLoading(false); }
  };

  // ── Шипперинг ───────────────────────────────────────────────
  const handleShip = async () => {
    if (!user || !selectedShip || shipLoading) return;
    setShipLoading(true);
    try {
      const res = await shipCharacter(id, Number(selectedShip));
      setMyShip(res.my_ship);
      setTopShips(res.top_ships);
    } catch (e) { alert(e.message); }
    finally { setShipLoading(false); }
  };

  const handleUnship = async () => {
    if (!user || shipLoading) return;
    setShipLoading(true);
    try {
      const res = await unshipCharacter(id);
      setMyShip(null);
      setTopShips(res.top_ships);
      setSelectedShip("");
    } catch (e) { alert(e.message); }
    finally { setShipLoading(false); }
  };

  if (loading) return <Loader />;
  if (error || !char) return (
    <div className="text-center py-32" style={{ color: "#6b7280" }}>
      <p className="text-4xl mb-4">😶</p>
      <p>{error || "Персонаж не найден."}</p>
      <Link to="/" style={{ color: "#a78bfa" }} className="text-sm mt-2 inline-block">← На главную</Link>
    </div>
  );

  const roleLabel    = ROLE_LABELS[char.role] || char.role;
  const candidates   = char.ship_candidates || [];
  const appearances  = char.appearances || [];
  const favCount     = char.favorites_count || 0;
  const primary      = char.primary_anime || appearances[0] || null;

  // Макс голосов для прогресс-баров
  const maxVotes = topShips[0]?.votes || 1;

  return (
    <div className="max-w-3xl mx-auto space-y-8">

      {/* Хлебные крошки */}
      <nav className="flex items-center gap-2 text-sm flex-wrap" style={{ color: "#6b7280" }}>
        <Link to={`/anime/${primary?.id}`} className="hover:underline" style={{ color: "#a78bfa" }}>
          {primary?.title || "Аниме"}
        </Link>
        <span>›</span>
        <span style={{ color: "#9ca3af" }}>Персонажи</span>
        <span>›</span>
        <span className="text-white">{char.name}</span>
      </nav>

      {/* ── Карточка персонажа ─────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.05)" }}>

        {/* Шапка: фото + имя + кнопки */}
        <div className="relative p-6 pb-0">
          {char.image_url && (
            <div className="absolute inset-0 overflow-hidden rounded-t-2xl">
              <img src={char.image_url} alt=""
                className="w-full h-full object-cover object-top"
                style={{ filter: "blur(40px) brightness(0.15)", transform: "scale(1.2)" }} />
            </div>
          )}

          <div className="relative flex flex-col sm:flex-row gap-6 items-start sm:items-end pb-6">
            {/* Аватар */}
            <div className="w-32 h-44 rounded-2xl overflow-hidden flex-shrink-0 shadow-2xl"
              style={{ border: "2px solid rgba(255,255,255,0.15)" }}>
              {char.image_url
                ? <img src={char.image_url} alt={char.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-4xl font-black"
                    style={{ backgroundColor: "#1a1d26", color: "#4b5563" }}>{char.name[0]}</div>}
            </div>

            {/* Инфо */}
            <div className="flex-1 min-w-0">
              <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2"
                style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)" }}>
                {roleLabel}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">{char.name}</h1>
              {char.name_jp && (
                <p className="text-base mt-0.5" style={{ color: "#6b7280" }}>{char.name_jp}</p>
              )}
              <p className="text-sm mt-2" style={{ color: "#9ca3af" }}>
                из аниме{" "}
                <Link to={`/anime/${primary?.id}`} style={{ color: "#a78bfa" }}>
                  {primary?.title || "Аниме"}
                </Link>
              </p>

              {/* Кнопка избранного + счётчик */}
              <div className="mt-4 flex items-center gap-3 flex-wrap">
                {user ? (
                  <button onClick={handleFavorite} disabled={favLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: char.is_favorite
                        ? "linear-gradient(to right,#dc2626,#9f1239)"
                        : "linear-gradient(to right,#7c3aed,#a21caf)",
                      color: "white", border: "none",
                      opacity: favLoading ? 0.6 : 1,
                      cursor: favLoading ? "not-allowed" : "pointer",
                      boxShadow: char.is_favorite
                        ? "0 4px 15px rgba(220,38,38,0.3)"
                        : "0 4px 15px rgba(124,58,237,0.3)",
                    }}>
                    <span>{char.is_favorite ? "♥" : "♡"}</span>
                    {favLoading ? "..." : char.is_favorite ? "В избранном" : "В избранное"}
                  </button>
                ) : (
                  <Link to="/login"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                    style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#9ca3af" }}>
                    ♡ В избранное
                  </Link>
                )}

                {/* Счётчик избранного */}
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
                  style={{ backgroundColor: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)" }}>
                  <span style={{ color: "#f43f5e", fontSize: "0.85rem" }}>♥</span>
                  <span className="text-sm font-bold" style={{ color: "#f43f5e" }}>{favCount}</span>
                  <span className="text-xs" style={{ color: "#9ca3af" }}>
                    {favCount === 1 ? "в избранном" : "в избранном"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Описание */}
        {char.description && (
          <div className="px-6 py-5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: "#6b7280" }}>
              О персонаже
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "#d1d5db" }}>{char.description}</p>
          </div>
        )}

        {/* Характеристики */}
        {(char.age || char.gender || char.abilities) && (
          <div className="px-6 py-5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "#6b7280" }}>
              Характеристики
            </h2>
            <div className="space-y-0">
              {char.age     && <InfoRow label="Возраст"    value={char.age} />}
              {char.gender  && <InfoRow label="Пол"        value={char.gender === "М" ? "Мужской" : char.gender === "Ж" ? "Женский" : char.gender} />}
              {char.abilities && (
                <div className="py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-xs mb-1" style={{ color: "#6b7280" }}>Способности</p>
                  <p className="text-sm text-white">{char.abilities}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Сэйю */}
        {char.seiyu?.length > 0 && (
          <div className="px-6 py-5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "#6b7280" }}>
              Голос
            </h2>
            <div className="flex flex-wrap gap-3">
              {char.seiyu.map(s => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl p-3"
                  style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {s.image_url && (
                    <img src={s.image_url} alt={s.name} className="w-10 h-10 rounded-full object-cover"
                      style={{ border: "1px solid rgba(255,255,255,0.1)" }} />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-white">{s.name}</p>
                    {s.name_jp && <p className="text-xs" style={{ color: "#6b7280" }}>{s.name_jp}</p>}
                    <p className="text-xs mt-0.5" style={{ color: "#a78bfa" }}>
                      {s.language === "ja" ? "Японский" : s.language === "en" ? "Английский" : s.language}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Аниме персонажа ────────────────────────────────── */}
      {appearances.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#6b7280" }}>
              Появляется в аниме
            </h2>
          </div>
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {appearances.map(a => (
              <Link key={a.id} to={`/anime/${a.id}`}
                className="flex items-center gap-4 px-5 py-3 transition-all group"
                style={{ textDecoration: "none" }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)"}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                <div className="w-8 h-11 rounded-lg overflow-hidden flex-shrink-0"
                  style={{ backgroundColor: "#1a1d26", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {a.poster_url
                    ? <img src={a.poster_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate group-hover:text-violet-300 transition-colors">
                    {a.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
                    {a.season_num ? `Сезон ${a.season_num} · ` : ""}
                    {a.episodes ? `${a.episodes} эп.` : ""}
                  </p>
                </div>
                <span className="text-xs flex-shrink-0 ml-2" style={{ color: "#6b7280" }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Шипперинг ──────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#6b7280" }}>
            💕 Шипперинг
          </h2>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Мой текущий шип */}
          {myShip && (
            <div className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ backgroundColor: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)" }}>
              <span style={{ color: "#f43f5e", fontSize: "1.1rem" }}>❤</span>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {myShip.shipped_img && (
                  <img src={myShip.shipped_img} alt={myShip.shipped_name}
                    className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                    style={{ border: "1px solid rgba(255,255,255,0.15)" }} />
                )}
                <div>
                  <span className="text-xs" style={{ color: "#9ca3af" }}>
                    {myShip.is_reverse
                      ? "Вы шипперите этого персонажа с "
                      : "Вы шипперите с "}
                  </span>
                  <span className="text-sm font-bold text-white">{myShip.shipped_name}</span>
                  {myShip.is_reverse && (
                    <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
                      (шип задан на странице {myShip.shipped_name})
                    </p>
                  )}
                </div>
              </div>
              {!myShip.is_reverse && (
                <button onClick={handleUnship} disabled={shipLoading}
                  className="text-xs px-3 py-1 rounded-lg flex-shrink-0"
                  style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "none", cursor: shipLoading ? "not-allowed" : "pointer", opacity: shipLoading ? 0.6 : 1 }}>
                  Убрать
                </button>
              )}
            </div>
          )}

          {/* Выбор партнёра + кнопка */}
          {user ? (
            candidates.length > 0 && !myShip?.is_reverse ? (
              <div className="flex gap-3 items-center flex-wrap">
                <div className="flex-1 min-w-0 relative">
                  <select
                    value={selectedShip}
                    onChange={e => setSelectedShip(e.target.value)}
                    className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none appearance-none"
                    style={{ backgroundColor: "#0d0f14", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer" }}>
                    <option value="" style={{ backgroundColor: "#0d0f14" }}>
                      Выбрать персонажа...
                    </option>
                    {candidates.map(c => (
                      <option key={c.id} value={c.id} style={{ backgroundColor: "#0d0f14" }}>
                        {c.name}{c.name_jp ? ` (${c.name_jp})` : ""} — {c.anime_title}
                      </option>
                    ))}
                  </select>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: "#6b7280" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <button
                  onClick={handleShip}
                  disabled={!selectedShip || shipLoading}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex-shrink-0"
                  style={{
                    background: selectedShip ? "linear-gradient(to right,#f43f5e,#ec4899)" : "rgba(255,255,255,0.08)",
                    border: "none",
                    cursor: selectedShip && !shipLoading ? "pointer" : "not-allowed",
                    opacity: !selectedShip || shipLoading ? 0.5 : 1,
                    boxShadow: selectedShip ? "0 4px 15px rgba(244,63,94,0.3)" : "none",
                  }}>
                  {shipLoading ? "..." : myShip ? "💕 Изменить шип" : "💕 Шипперить"}
                </button>
              </div>
            ) : (
              myShip?.is_reverse ? (
                <p className="text-sm" style={{ color: "#6b7280" }}>
                  Чтобы изменить или убрать шип — перейдите на страницу{" "}
                  <Link to={`/character/${myShip.shipped_with}`} style={{ color: "#a78bfa" }}>
                    {myShip.shipped_name}
                  </Link>.
                </p>
              ) : (
                <p className="text-sm" style={{ color: "#4b5563" }}>
                  Нет персонажей противоположного пола в тех же аниме.
                </p>
              )
            )
          ) : (
            <p className="text-sm" style={{ color: "#6b7280" }}>
              <Link to="/login" style={{ color: "#a78bfa" }}>Войдите</Link>, чтобы участвовать в шипперинге.
            </p>
          )}

          {/* Топ шипперинга — аккордеон */}
          {topShips.length > 0 && (
            <div>
              <button
                onClick={() => setShowTopShips(!showTopShips)}
                className="flex items-center gap-2 text-sm font-medium w-full text-left py-2"
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af" }}>
                <span>Топ шипперинга</span>
                <span style={{ fontSize: "0.7rem", color: "#6b7280" }}>({topShips.length})</span>
                <svg
                  className="ml-auto w-4 h-4"
                  style={{ transform: showTopShips ? "rotate(180deg)" : "none", transition: "transform 0.2s", color: "#6b7280" }}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showTopShips && (
                <div className="space-y-2 mt-2">
                  {topShips.map((ship, idx) => {
                    const pct = Math.round((ship.votes / maxVotes) * 100);
                    const isMyShip = myShip && !myShip.is_reverse && String(ship.partner_id) === String(myShip.shipped_with);
                    return (
                      <div key={ship.partner_id}
                        className="rounded-xl px-4 py-3"
                        style={{
                          backgroundColor: isMyShip ? "rgba(244,63,94,0.06)" : "rgba(255,255,255,0.03)",
                          border: isMyShip ? "1px solid rgba(244,63,94,0.2)" : "1px solid rgba(255,255,255,0.05)",
                        }}>
                        <div className="flex items-center gap-3 mb-2">
                          {/* Позиция */}
                          <span className="text-xs font-bold w-5 text-center flex-shrink-0"
                            style={{ color: idx === 0 ? "#fbbf24" : idx === 1 ? "#9ca3af" : idx === 2 ? "#b45309" : "#4b5563" }}>
                            #{idx + 1}
                          </span>
                          {/* Аватар */}
                          {ship.shipped_img ? (
                            <img src={ship.shipped_img} alt={ship.shipped_name}
                              className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                              style={{ border: "1px solid rgba(255,255,255,0.1)" }} />
                          ) : (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: "#1a1d26", color: "#6b7280" }}>
                              {ship.shipped_name[0]}
                            </div>
                          )}
                          {/* Имя */}
                          <span className="text-sm font-semibold text-white flex-1 truncate">{ship.shipped_name}</span>
                          {/* Голоса */}
                          <span className="text-xs font-bold flex-shrink-0"
                            style={{ color: isMyShip ? "#f43f5e" : "#6b7280" }}>
                            {ship.votes} {ship.votes === 1 ? "голос" : ship.votes < 5 ? "голоса" : "голосов"}
                          </span>
                          {isMyShip && <span style={{ color: "#f43f5e", fontSize: "0.75rem" }}>♥</span>}
                        </div>
                        {/* Прогресс-бар */}
                        <div className="rounded-full overflow-hidden ml-8"
                          style={{ height: "4px", backgroundColor: "rgba(255,255,255,0.06)" }}>
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              background: isMyShip
                                ? "linear-gradient(to right,#f43f5e,#ec4899)"
                                : "linear-gradient(to right,#7c3aed,#a21caf)",
                            }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Комментарии ────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="px-6 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <h2 className="text-base font-bold text-white mb-0.5">Комментарии</h2>
          <p className="text-xs" style={{ color: "#6b7280" }}>Обсуждение персонажа</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          {user ? (
            <form onSubmit={handleComment} className="space-y-3">
              <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                placeholder="Ваши мысли о персонаже…" rows={3}
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none resize-none"
                style={{ backgroundColor: "#0d0f14", border: "1px solid rgba(255,255,255,0.1)" }}
                onFocus={e => e.target.style.borderColor = "rgba(139,92,246,0.4)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
              <button type="submit" disabled={!commentText.trim() || commentLoading}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white"
                style={{
                  background: commentText.trim() ? "linear-gradient(to right,#7c3aed,#a21caf)" : "rgba(255,255,255,0.1)",
                  opacity: commentText.trim() ? 1 : 0.5,
                  cursor: commentText.trim() ? "pointer" : "not-allowed",
                  border: "none",
                }}>
                {commentLoading ? "Отправка…" : "Отправить"}
              </button>
            </form>
          ) : (
            <div className="rounded-xl px-4 py-3 text-sm"
              style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", color: "#6b7280" }}>
              <Link to="/login" style={{ color: "#a78bfa" }}>Войдите</Link>, чтобы комментировать.
            </div>
          )}
          {comments.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: "#4b5563" }}>Комментариев пока нет.</p>
          ) : (
            <div className="space-y-2">
              {comments.map(c => (
                <div key={c.id} className="rounded-xl px-4 py-3"
                  style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
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
            </div>
          )}
        </div>
      </div>

      {/* Назад */}
      <Link to={`/anime/${primary?.id || ""}`}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium"
        style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#9ca3af", textDecoration: "none" }}>
        ← Вернуться к {primary?.title || "аниме"}
      </Link>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2.5 text-sm"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

function Loader() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 rounded-full border-2 animate-spin"
        style={{ borderColor: "rgba(255,255,255,0.1)", borderTopColor: "#8b5cf6" }} />
    </div>
  );
}
