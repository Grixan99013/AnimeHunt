// src/pages/Profile.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../App";
import {
  fetchWatchlist, fetchMyComments, fetchMyFavorites, fetchMyReviews,
  ROLES, WATCH_STATUSES,
} from "../api/api";

const TABS = ["Списки", "Избранное", "Рецензии", "Комментарии"];

export default function Profile() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab]   = useState("Списки");
  const [watchlist, setWatchlist]   = useState([]);
  const [comments, setComments]     = useState([]);
  const [favorites, setFavorites]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [myReviews, setMyReviews]   = useState([]);

  useEffect(() => {
    Promise.all([fetchWatchlist(), fetchMyComments(), fetchMyFavorites(), fetchMyReviews()])
      .then(([wl, cm, fav, rv]) => { setWatchlist(wl); setComments(cm); setFavorites(fav); setMyReviews(rv); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const byStatus = Object.keys(WATCH_STATUSES).reduce((acc, key) => {
    acc[key] = watchlist.filter(e => e.status === key);
    return acc;
  }, {});

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-black text-white">Мой профиль</h1>

      {/* Карточка пользователя */}
      <div className="rounded-2xl p-6 flex items-center gap-5"
        style={{ backgroundColor:"#13151c", border:"1px solid rgba(255,255,255,0.05)" }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white flex-shrink-0"
          style={{ background:"linear-gradient(135deg, #7c3aed, #a21caf)" }}>
          {user.username[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="text-lg font-bold text-white">{user.username}</p>
          <p className="text-sm" style={{ color:"#6b7280" }}>{user.email}</p>
          <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full capitalize"
            style={{ background:"rgba(139,92,246,0.2)", color:"#c4b5fd" }}>
            {ROLES[user.role_id] || "пользователь"}
          </span>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label:"Смотрю",        value: byStatus.watching?.length  || 0, color:"#60a5fa" },
          { label:"Просмотрено",   value: byStatus.completed?.length || 0, color:"#34d399" },
          { label:"Запланировано", value: byStatus.planned?.length   || 0, color:"#a78bfa" },
          { label:"Избранных",     value: favorites.length,               color:"#f43f5e" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4 text-center"
            style={{ backgroundColor:"#13151c", border:"1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-2xl font-black" style={{ color:s.color }}>{loading ? "…" : s.value}</p>
            <p className="text-xs mt-1" style={{ color:"#6b7280" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Табы */}
      <div className="flex gap-1" style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-2 text-sm font-medium"
            style={{
              color: activeTab===tab ? "#c4b5fd" : "#6b7280",
              borderBottom: activeTab===tab ? "2px solid #8b5cf6" : "2px solid transparent",
              background:"transparent", border:"none",
              borderBottom: activeTab===tab ? "2px solid #8b5cf6" : "2px solid transparent",
              cursor:"pointer",
            }}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Списки ────────────────────────────────────────────── */}
      {activeTab==="Списки" && (
        <div className="space-y-8">
          {loading ? <LoadingSpinner /> : watchlist.length===0 ? (
            <Empty icon="📋" text="Ваш список пуст" link="/catalog" linkText="Перейти в каталог →" />
          ) : (
            Object.entries(WATCH_STATUSES).map(([key, meta]) => {
              const items = byStatus[key] || [];
              if (!items.length) return null;
              return (
                <div key={key}>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-base font-bold" style={{ color:meta.color }}>{meta.label}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background:meta.bg, color:meta.color }}>{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map(entry => (
                      <WatchEntry key={entry.id} entry={entry} statusKey={key} />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Избранное ─────────────────────────────────────────── */}
      {activeTab==="Избранное" && (
        <div>
          {loading ? <LoadingSpinner /> : favorites.length===0 ? (
            <Empty icon="♡" text="Нет избранных персонажей" link="/catalog" linkText="Найти персонажей →" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {favorites.map(fav => (
                <Link key={fav.id} to={`/character/${fav.id}`}
                  className="flex items-center gap-4 rounded-xl px-4 py-3 transition-all group"
                  style={{ backgroundColor:"#13151c", border:"1px solid rgba(255,255,255,0.05)", textDecoration:"none" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor="rgba(244,63,94,0.3)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor="rgba(255,255,255,0.05)"}>
                  {/* Аватар */}
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
                    style={{ backgroundColor:"#1a1d26", border:"1px solid rgba(255,255,255,0.1)" }}>
                    {fav.image_url
                      ? <img src={fav.image_url} alt={fav.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center font-bold"
                          style={{ color:"#4b5563" }}>{fav.name[0]}</div>}
                  </div>
                  {/* Инфо */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white truncate group-hover:text-pink-400 transition-colors">
                      {fav.name}
                    </p>
                    {fav.name_jp && (
                      <p className="text-xs truncate" style={{ color:"#4b5563" }}>{fav.name_jp}</p>
                    )}
                    <p className="text-xs mt-0.5" style={{ color:"#6b7280" }}>
                      из{" "}
                      <span style={{ color:"#a78bfa" }}>{fav.anime_title}</span>
                    </p>
                  </div>
                  {/* Сердечко */}
                  <span className="text-lg flex-shrink-0" style={{ color:"#f43f5e" }}>♥</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}


      {/* ── Рецензии ────────────────────────────────────────── */}
      {activeTab==="Рецензии" && (
        loading ? <LoadingSpinner /> : myReviews.length===0 ? (
          <Empty icon="📝" text="Вы ещё не написали рецензий" link="/catalog" linkText="Найти аниме →"/>
        ) : (
          <div className="space-y-4">
            {myReviews.map(rv => (
              <Link key={rv.id} to={`/anime/${rv.anime_id}`}
                className="block rounded-2xl overflow-hidden transition-all"
                style={{backgroundColor:"#13151c",border:"1px solid rgba(255,255,255,0.05)",textDecoration:"none"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(251,191,36,0.25)"}
                onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.05)"}>
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0" style={{backgroundColor:"#1a1d26"}}>
                    {rv.anime_poster&&<img src={rv.anime_poster} alt="" className="w-full h-full object-cover"/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold mb-0.5" style={{color:"#a78bfa"}}>{rv.anime_title}</p>
                    <p className="font-bold text-sm text-white truncate">{rv.title}</p>
                    <p className="text-xs mt-0.5" style={{color:"#6b7280"}}>{new Date(rv.created_at).toLocaleDateString("ru-RU")}</p>
                  </div>
                  <div className="flex-shrink-0 text-center">
                    <p className="text-xl font-black" style={{color:"#fbbf24"}}>★ {rv.score}</p>
                    <p className="text-xs" style={{color:"#6b7280"}}>/10</p>
                  </div>
                </div>
                <div className="px-5 pb-4">
                  <p className="text-xs line-clamp-2 leading-relaxed" style={{color:"#9ca3af"}}>{rv.body}</p>
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      {/* ── Комментарии ───────────────────────────────────────── */}
      {activeTab==="Комментарии" && (
        loading ? <LoadingSpinner /> : comments.length===0 ? (
          <Empty icon="💬" text="Вы ещё не оставляли комментариев" />
        ) : (
          <div className="space-y-3">
            {comments.map(c => (
              <Link key={c.id} to={`/anime/${c.anime_id}`}
                className="block rounded-xl px-4 py-3 text-sm transition-all"
                style={{ backgroundColor:"#13151c", border:"1px solid rgba(255,255,255,0.05)", textDecoration:"none" }}
                onMouseEnter={e => e.currentTarget.style.borderColor="rgba(139,92,246,0.2)"}
                onMouseLeave={e => e.currentTarget.style.borderColor="rgba(255,255,255,0.05)"}>
                <p className="text-xs font-semibold mb-1" style={{ color:"#a78bfa" }}>{c.anime_title}</p>
                <p style={{ color:"#d1d5db" }}>{c.body}</p>
                <p className="text-xs mt-1" style={{ color:"#4b5563" }}>
                  {new Date(c.created_at).toLocaleDateString("ru-RU")}
                </p>
              </Link>
            ))}
          </div>
        )
      )}

      <button onClick={logout}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold"
        style={{ border:"1px solid rgba(239,68,68,0.2)", color:"#f87171", background:"transparent", cursor:"pointer" }}>
        Выйти из аккаунта
      </button>
    </div>
  );
}

// ── Компонент строки списка просмотра ────────────────────────
function WatchEntry({ entry, statusKey }) {
  const hasMyRating = entry.my_rating != null;

  return (
    <Link to={`/anime/${entry.id}`}
      className="flex items-center gap-4 rounded-xl px-4 py-3 transition-all group"
      style={{ backgroundColor:"#13151c", border:"1px solid rgba(255,255,255,0.05)", textDecoration:"none" }}
      onMouseEnter={e => e.currentTarget.style.borderColor="rgba(139,92,246,0.25)"}
      onMouseLeave={e => e.currentTarget.style.borderColor="rgba(255,255,255,0.05)"}>

      {/* Постер */}
      <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0"
        style={{ backgroundColor:"#1a1d26" }}>
        {entry.poster_url
          ? <img src={entry.poster_url} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full" />}
      </div>

      {/* Основная инфа */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-white truncate group-hover:text-violet-300 transition-colors">
          {entry.title}
        </p>
        {entry.title_jp && (
          <p className="text-xs mt-0.5 truncate" style={{ color:"#6b7280" }}>{entry.title_jp}</p>
        )}

        {/* Прогресс-бар для "Смотрю" */}
        {statusKey==="watching" && entry.episodes && (
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 rounded-full overflow-hidden"
              style={{ height:"3px", backgroundColor:"rgba(255,255,255,0.08)" }}>
              <div className="h-full rounded-full transition-all"
                style={{
                  width:`${Math.min(100,(entry.episodes_watched/entry.episodes)*100)}%`,
                  backgroundColor:"#60a5fa",
                }} />
            </div>
            <span className="text-xs flex-shrink-0" style={{ color:"#6b7280" }}>
              {entry.episodes_watched}/{entry.episodes} эп.
            </span>
          </div>
        )}

        {/* Для просмотренных — количество эпизодов */}
        {statusKey==="completed" && entry.episodes && (
          <p className="text-xs mt-1" style={{ color:"#6b7280" }}>
            {entry.episodes} эп.
          </p>
        )}
      </div>

      {/* Правая часть: оценки */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {/* Оценка пользователя */}
        {hasMyRating && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
            style={{ backgroundColor:"rgba(251,191,36,0.15)", border:"1px solid rgba(251,191,36,0.25)" }}>
            <span style={{ color:"#fbbf24", fontSize:"0.75rem" }}>★</span>
            <span className="text-sm font-black" style={{ color:"#fbbf24" }}>{entry.my_rating}</span>
          </div>
        )}
        {/* Средняя оценка сообщества */}
        {entry.avg_rating && (
          <div className="text-right">
            <p className="text-xs" style={{ color:"#6b7280" }}>
              ⭐ {Number(entry.avg_rating).toFixed(1)}
              {entry.rating_count > 0 && (
                <span className="ml-1" style={{ color:"#4b5563" }}>({entry.rating_count})</span>
              )}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 rounded-full border-2 animate-spin"
        style={{ borderColor:"rgba(255,255,255,0.1)", borderTopColor:"#8b5cf6" }} />
    </div>
  );
}

function Empty({ icon, text, link, linkText }) {
  return (
    <div className="text-center py-16" style={{ color:"#4b5563" }}>
      <p className="text-4xl mb-3">{icon}</p>
      <p className="text-sm mb-2">{text}</p>
      {link && <Link to={link} className="text-sm" style={{ color:"#a78bfa" }}>{linkText}</Link>}
    </div>
  );
}
