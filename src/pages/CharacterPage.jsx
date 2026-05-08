// src/pages/CharacterPage.jsx
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../App";
import CommentBlock from "../components/CommentBlock";
import EditCharacterForm from "../components/EditCharacterForm";
import {
  fetchCharacter, toggleFavorite, postCharacterComment,
  deleteCharComment, editCharComment,
  shipCharacter, unshipCharacter,
  ROLE_LABELS, STATUS_LABELS,
  searchSeiyu, createSeiyu, linkSeiyuToChar, unlinkSeiyuFromChar,
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
  const [comments, setComments] = useState([]);

  // Редактирование (только admin)
  const [editMode, setEditMode] = useState(false);

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

  // ── Редактирование ─────────────────────────────────────────────
  const handleCharSaved = (updatedChar) => {
    setChar(prev => ({ ...prev, ...updatedChar }));
    setEditMode(false);
  };

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
    <div className="text-center py-32" style={{ color: "var(--text-faint)" }}>
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

      {/* Заголовок страницы: хлебные крошки + кнопка редактирования */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
      <nav className="flex items-center gap-2 text-sm flex-wrap" style={{ color: "var(--text-faint)" }}>
        <Link to={`/anime/${primary?.id}`} className="hover:underline" style={{ color: "#a78bfa" }}>
          {primary?.title || "Аниме"}
        </Link>
        <span>›</span>
        <span style={{ color: "var(--text-muted)" }}>Персонажи</span>
        <span>›</span>
        <span className="text-white">{char.name}</span>
      </nav>
      {/* Кнопка редактирования — только для admin */}
      {user?.role_id === 1 && (
        <button
          onClick={() => setEditMode(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold flex-shrink-0"
          style={{
            background: editMode
              ? "rgba(255,255,255,0.08)"
              : "linear-gradient(to right,#7c3aed,#a21caf)",
            color: editMode ? "#9ca3af" : "white",
            border: "none", cursor: "pointer",
          }}>
          {editMode ? (
            <>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Отмена
            </>
          ) : (
            <>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              Редактировать
            </>
          )}
        </button>
      )}
      </div>

      {/* ── Форма редактирования (только admin) ─────────────── */}
      {editMode && user?.role_id === 1 && (
        <div className="rounded-2xl p-6"
          style={{ backgroundColor: "var(--bg-surface)", border: "1px solid rgba(139,92,246,0.3)" }}>
          <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              style={{ color: "#a78bfa" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            Редактировать персонажа
          </h2>
          <EditCharacterForm
            character={char}
            onSaved={handleCharSaved}
            onCancel={() => setEditMode(false)}
          />
        </div>
      )}

      {/* ── Карточка персонажа ─────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>

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
                    style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-veryfaint)" }}>{char.name[0]}</div>}
            </div>

            {/* Инфо */}
            <div className="flex-1 min-w-0">
              <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2"
                style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)" }}>
                {roleLabel}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">{char.name}</h1>
              {char.name_jp && (
                <p className="text-base mt-0.5" style={{ color: "var(--text-faint)" }}>{char.name_jp}</p>
              )}
              <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
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
                      color: "var(--text-primary)", border: "none",
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
                    style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                    ♡ В избранное
                  </Link>
                )}

                {/* Счётчик избранного */}
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
                  style={{ backgroundColor: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)" }}>
                  <span style={{ color: "#f43f5e", fontSize: "0.85rem" }}>♥</span>
                  <span className="text-sm font-bold" style={{ color: "#f43f5e" }}>{favCount}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {favCount === 1 ? "в избранном" : "в избранном"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Описание */}
        {char.description && (
          <div className="px-6 py-5" style={{ borderTop: "1px solid var(--border)" }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-faint)" }}>
              О персонаже
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{char.description}</p>
          </div>
        )}

        {/* Характеристики */}
        {(char.age || char.gender || char.abilities) && (
          <div className="px-6 py-5" style={{ borderTop: "1px solid var(--border)" }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-faint)" }}>
              Характеристики
            </h2>
            <div className="space-y-0">
              {char.age     && <InfoRow label="Возраст"    value={char.age} />}
              {char.gender  && <InfoRow label="Пол"        value={char.gender === "М" ? "Мужской" : char.gender === "Ж" ? "Женский" : char.gender} />}
              {char.abilities && (
                <div className="py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
                  <p className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Способности</p>
                  <p className="text-sm text-white">{char.abilities}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Сэйю */}
        <div className="px-6 py-5" style={{ borderTop: "1px solid var(--border)" }}>
          <SeiyuSection
            charId={char.id}
            seiyu={char.seiyu || []}
            isAdmin={user?.role_id === 1}
            onAdd={s => setChar(c => ({ ...c, seiyu: [...(c.seiyu||[]), s] }))}
            onRemove={sid => setChar(c => ({ ...c, seiyu: (c.seiyu||[]).filter(s => s.id !== sid) }))}
          />
        </div>
      </div>

      {/* ── Аниме персонажа ────────────────────────────────── */}
      {appearances.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
              Появляется в аниме
            </h2>
          </div>
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {appearances.map(a => (
              <Link key={a.id} to={`/anime/${a.id}`}
                className="flex items-center gap-4 px-5 py-3 transition-all group"
                style={{ textDecoration: "none" }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = "var(--bg-hover)"}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                <div className="w-8 h-11 rounded-lg overflow-hidden flex-shrink-0"
                  style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                  {a.poster_url
                    ? <img src={a.poster_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate group-hover:text-violet-300 transition-colors">
                    {a.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>
                    {a.season_num ? `Сезон ${a.season_num} · ` : ""}
                    {a.episodes ? `${a.episodes} эп.` : ""}
                  </p>
                </div>
                <span className="text-xs flex-shrink-0 ml-2" style={{ color: "var(--text-faint)" }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Шипперинг ──────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
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
                    style={{ border: "1px solid var(--border)" }} />
                )}
                <div>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {myShip.is_reverse
                      ? "Вы шипперите этого персонажа с "
                      : "Вы шипперите с "}
                  </span>
                  <span className="text-sm font-bold text-white">{myShip.shipped_name}</span>
                  {myShip.is_reverse && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>
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
                    style={{ backgroundColor: "var(--bg-base)", border: "1px solid var(--border)", cursor: "pointer" }}>
                    <option value="" style={{ backgroundColor: "var(--bg-base)" }}>
                      Выбрать персонажа...
                    </option>
                    {candidates.map(c => (
                      <option key={c.id} value={c.id} style={{ backgroundColor: "var(--bg-base)" }}>
                        {c.name}{c.name_jp ? ` (${c.name_jp})` : ""} — {c.anime_title}
                      </option>
                    ))}
                  </select>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: "var(--text-faint)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                <p className="text-sm" style={{ color: "var(--text-faint)" }}>
                  Чтобы изменить или убрать шип — перейдите на страницу{" "}
                  <Link to={`/character/${myShip.shipped_with}`} style={{ color: "#a78bfa" }}>
                    {myShip.shipped_name}
                  </Link>.
                </p>
              ) : (
                <p className="text-sm" style={{ color: "var(--text-veryfaint)" }}>
                  Нет персонажей противоположного пола в тех же аниме.
                </p>
              )
            )
          ) : (
            <p className="text-sm" style={{ color: "var(--text-faint)" }}>
              <Link to="/login" style={{ color: "#a78bfa" }}>Войдите</Link>, чтобы участвовать в шипперинге.
            </p>
          )}

          {/* Топ шипперинга — аккордеон */}
          {topShips.length > 0 && (
            <div>
              <button
                onClick={() => setShowTopShips(!showTopShips)}
                className="flex items-center gap-2 text-sm font-medium w-full text-left py-2"
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <span>Топ шипперинга</span>
                <span style={{ fontSize: "0.7rem", color: "var(--text-faint)" }}>({topShips.length})</span>
                <svg
                  className="ml-auto w-4 h-4"
                  style={{ transform: showTopShips ? "rotate(180deg)" : "none", transition: "transform 0.2s", color: "var(--text-faint)" }}
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
                              style={{ border: "1px solid var(--border)" }} />
                          ) : (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-faint)" }}>
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
                          style={{ height: "4px", backgroundColor: "var(--bg-elevated)" }}>
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
      <div className="rounded-2xl p-6"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <CommentBlock
          comments={comments}
          onPost={async ({ body, image_url, parent_id }) => {
            const c = await postCharacterComment(id, body, parent_id, image_url);
            return c;
          }}
          onDelete={deleteCharComment}
          onEdit={editCharComment}
          placeholder="Ваши мысли о персонаже…"
          previewCount={5}
        />
      </div>

      {/* Назад */}
      <Link to={`/anime/${primary?.id || ""}`}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium"
        style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-muted)", textDecoration: "none" }}>
        ← Вернуться к {primary?.title || "аниме"}
      </Link>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2.5 text-sm"
      style={{ borderBottom: "1px solid var(--border)" }}>
      <span style={{ color: "var(--text-faint)" }}>{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

function Loader() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 rounded-full border-2 animate-spin"
        style={{ borderColor: "var(--border)", borderTopColor: "#8b5cf6" }} />
    </div>
  );
}

// ── Компонент управления сэйю ─────────────────────────────────
function SeiyuSection({ charId, seiyu, isAdmin, onAdd, onRemove }) {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [lang, setLang]         = useState("ja");
  const [newSeiyu, setNewSeiyu] = useState({ name:"", name_jp:"", bio:"", image_url:"", born_at:"", agency:"" });
  const [err, setErr]           = useState("");
  const [msg, setMsg]           = useState("");

  const LANGS = [
    { v:"ja", l:"🇯🇵 Японский" },
    { v:"en", l:"🇺🇸 Английский" },
    { v:"ru", l:"🇷🇺 Русский" },
  ];
  const LANG_LABELS = { ja:"Японский", en:"Английский", ru:"Русский" };

  const inputStyle = {
    background:"var(--bg-elevated)", border:"1px solid var(--border)",
    borderRadius:8, color:"#fff", padding:"7px 12px", fontSize:13,
    outline:"none", width:"100%", boxSizing:"border-box",
  };

  async function search(q) {
    setQuery(q);
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try { setResults(await searchSeiyu(q)); }
    catch(e) { setErr(e.message); }
    finally { setSearching(false); }
  }

  async function link(s) {
    setErr(""); setMsg("");
    try {
      const added = await linkSeiyuToChar(charId, { seiyu_id: s.id, language: lang });
      onAdd(added || { ...s, language: lang });
      setResults([]); setQuery("");
      setMsg(`${s.name} добавлен (${LANG_LABELS[lang]})`);
    } catch(e) { setErr(e.message); }
  }

  async function createAndLink() {
    if (!newSeiyu.name.trim()) return setErr("Укажите имя");
    setErr(""); setMsg("");
    try {
      const s = await createSeiyu(newSeiyu);
      const added = await linkSeiyuToChar(charId, { seiyu_id: s.id, language: lang });
      onAdd(added || { ...s, language: lang });
      setShowForm(false);
      setNewSeiyu({ name:"", name_jp:"", bio:"", image_url:"", born_at:"", agency:"" });
      setMsg(`${s.name} создан и добавлен`);
    } catch(e) { setErr(e.message); }
  }

  async function remove(sid, name) {
    if (!confirm(`Удалить ${name} из голосовых актёров?`)) return;
    try { await unlinkSeiyuFromChar(charId, sid); onRemove(sid); }
    catch(e) { setErr(e.message); }
  }

  return (
    <div className="space-y-4">
      {/* Заголовок */}
      <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
        Голосовые актёры
      </h2>

      {/* Список сэйю */}
      {seiyu.length === 0 && !isAdmin && (
        <p style={{ color:"#4b5563", fontSize:13 }}>Голосовые актёры не указаны.</p>
      )}
      {seiyu.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {seiyu.map(s => (
            <div key={s.id + s.language} className="relative group flex items-center gap-3 rounded-xl p-3"
              style={{ backgroundColor:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
              {s.image_url
                ? <img src={s.image_url} alt={s.name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    style={{ border:"1px solid rgba(255,255,255,0.1)" }} />
                : <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{ background:"#1c1f2a", color:"#6b7280", fontWeight:700 }}>
                    {s.name[0]}
                  </div>
              }
              <div>
                <p className="text-sm font-semibold text-white">{s.name}</p>
                {s.name_jp && <p className="text-xs" style={{ color:"#6b7280" }}>{s.name_jp}</p>}
                {s.agency && <p className="text-xs" style={{ color:"#6b7280" }}>{s.agency}</p>}
                <p className="text-xs mt-0.5" style={{ color:"#a78bfa" }}>
                  {LANG_LABELS[s.language] || s.language}
                </p>
              </div>
              {isAdmin && (
                <button onClick={() => remove(s.id, s.name)}
                  style={{
                    position:"absolute", top:-6, right:-6,
                    background:"#dc2626", border:"none", borderRadius:"50%",
                    color:"#fff", width:20, height:20, fontSize:11,
                    cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                    opacity:0, transition:"opacity .15s",
                  }}
                  className="group-hover:!opacity-100">✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Форма добавления (только admin) */}
      {isAdmin && (
        <div className="rounded-2xl p-4 space-y-3"
          style={{ backgroundColor:"var(--bg-surface)", border:"1px solid rgba(124,58,237,0.2)" }}>
          <h3 className="text-sm font-semibold text-white">Добавить голосового актёра</h3>

          {msg && <p style={{ color:"#34d399", fontSize:13 }}>{msg}</p>}
          {err && <p style={{ color:"#f87171", fontSize:13 }}>{err}</p>}

          {/* Язык */}
          <div>
            <label style={{ fontSize:12, color:"#9ca3af", display:"block", marginBottom:4 }}>Язык озвучки</label>
            <div className="flex gap-2">
              {LANGS.map(l => (
                <button key={l.v} onClick={() => setLang(l.v)}
                  style={{
                    padding:"5px 12px", borderRadius:8, border:"none",
                    fontSize:12, cursor:"pointer", fontWeight:600,
                    background: lang===l.v ? "#7c3aed" : "rgba(255,255,255,0.05)",
                    color: lang===l.v ? "#fff" : "#9ca3af",
                  }}>
                  {l.l}
                </button>
              ))}
            </div>
          </div>

          {/* Поиск существующего */}
          <div>
            <label style={{ fontSize:12, color:"#9ca3af", display:"block", marginBottom:4 }}>Найти существующего</label>
            <input value={query} onChange={e => search(e.target.value)}
              placeholder="Имя сэйю..." style={inputStyle} />
            {searching && <p style={{ fontSize:12, color:"#6b7280", marginTop:4 }}>Поиск...</p>}
            {results.length > 0 && (
              <div className="rounded-xl overflow-hidden mt-2"
                style={{ border:"1px solid rgba(255,255,255,0.08)" }}>
                {results.map(s => (
                  <div key={s.id} className="flex items-center justify-between px-3 py-2"
                    style={{ borderBottom:"1px solid var(--border)", background:"var(--bg-elevated)" }}>
                    <div className="flex items-center gap-2">
                      {s.image_url && (
                        <img src={s.image_url} alt="" style={{ width:28, height:28, borderRadius:"50%", objectFit:"cover" }} />
                      )}
                      <div>
                        <span style={{ color:"#fff", fontSize:13, fontWeight:600 }}>{s.name}</span>
                        {s.name_jp && <span style={{ color:"#6b7280", fontSize:11, marginLeft:6 }}>{s.name_jp}</span>}
                        {s.agency && <span style={{ color:"#9ca3af", fontSize:11, marginLeft:6 }}>{s.agency}</span>}
                      </div>
                    </div>
                    <button onClick={() => link(s)}
                      style={{ background:"#7c3aed", border:"none", borderRadius:6, color:"#fff",
                        padding:"4px 12px", fontSize:12, cursor:"pointer", fontWeight:600, flexShrink:0 }}>
                      + Добавить
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Создать нового */}
          <button onClick={() => setShowForm(v => !v)}
            style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:8, color:"#9ca3af", padding:"6px 14px", fontSize:13, cursor:"pointer" }}>
            {showForm ? "▲ Скрыть форму" : "＋ Создать нового сэйю"}
          </button>

          {showForm && (
            <div className="rounded-xl p-4 space-y-3"
              style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)" }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize:12, color:"#9ca3af", display:"block", marginBottom:4 }}>Имя *</label>
                  <input value={newSeiyu.name} onChange={e => setNewSeiyu(p=>({...p,name:e.target.value}))}
                    placeholder="Имя (рус/eng)" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#9ca3af", display:"block", marginBottom:4 }}>Имя (яп.)</label>
                  <input value={newSeiyu.name_jp} onChange={e => setNewSeiyu(p=>({...p,name_jp:e.target.value}))}
                    placeholder="日本語名" style={inputStyle} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize:12, color:"#9ca3af", display:"block", marginBottom:4 }}>Агентство</label>
                  <input value={newSeiyu.agency} onChange={e => setNewSeiyu(p=>({...p,agency:e.target.value}))}
                    placeholder="Mausu Promotion..." style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#9ca3af", display:"block", marginBottom:4 }}>Дата рождения</label>
                  <input type="date" value={newSeiyu.born_at} onChange={e => setNewSeiyu(p=>({...p,born_at:e.target.value}))}
                    style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ fontSize:12, color:"#9ca3af", display:"block", marginBottom:4 }}>Фото (URL)</label>
                <input value={newSeiyu.image_url} onChange={e => setNewSeiyu(p=>({...p,image_url:e.target.value}))}
                  placeholder="https://..." style={inputStyle} />
                {newSeiyu.image_url && (
                  <img src={newSeiyu.image_url} alt=""
                    style={{ width:48, height:48, borderRadius:"50%", objectFit:"cover", marginTop:6 }}
                    onError={e => e.target.style.display="none"} />
                )}
              </div>
              <div>
                <label style={{ fontSize:12, color:"#9ca3af", display:"block", marginBottom:4 }}>Биография</label>
                <textarea value={newSeiyu.bio} onChange={e => setNewSeiyu(p=>({...p,bio:e.target.value}))}
                  rows={2} placeholder="Краткая биография..."
                  style={{ ...inputStyle, resize:"vertical" }} />
              </div>
              <button onClick={createAndLink}
                style={{ background:"#7c3aed", border:"none", borderRadius:8, color:"#fff",
                  padding:"8px 20px", fontSize:13, cursor:"pointer", fontWeight:600 }}>
                Создать и привязать к персонажу
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
