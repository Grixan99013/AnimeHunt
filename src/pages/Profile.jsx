// src/pages/Profile.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../App";
import { fetchWatchlist, fetchMyComments, ROLES, WATCH_STATUSES } from "../api/api";

const TABS_PROFILE = ["Списки", "Комментарии"];

export default function Profile() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("Списки");
  const [watchlist, setWatchlist] = useState([]);
  const [myComments, setMyComments] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([fetchWatchlist(), fetchMyComments()])
      .then(([wl, mc]) => { setWatchlist(wl); setMyComments(mc); })
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

      {/* Карточка */}
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:"Смотрю",        value: byStatus.watching?.length  || 0, color:"#60a5fa" },
          { label:"Просмотрено",   value: byStatus.completed?.length || 0, color:"#34d399" },
          { label:"Запланировано", value: byStatus.planned?.length   || 0, color:"#a78bfa" },
          { label:"Комментарии",   value: myComments.length,               color:"#e879f9" },
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
        {TABS_PROFILE.map(tab => (
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

      {/* Списки */}
      {activeTab==="Списки" && (
        <div className="space-y-8">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 rounded-full border-2 animate-spin"
                style={{ borderColor:"rgba(255,255,255,0.1)", borderTopColor:"#8b5cf6" }} />
            </div>
          ) : watchlist.length===0 ? (
            <div className="text-center py-16" style={{ color:"#4b5563" }}>
              <p className="text-4xl mb-3">📋</p>
              <p className="text-sm mb-2">Ваш список пуст</p>
              <Link to="/catalog" className="text-sm" style={{ color:"#a78bfa" }}>Перейти в каталог →</Link>
            </div>
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
                      <Link key={entry.id} to={`/anime/${entry.id}`}
                        className="flex items-center gap-4 rounded-xl px-4 py-3 transition-all group"
                        style={{ backgroundColor:"#13151c", border:"1px solid rgba(255,255,255,0.05)", textDecoration:"none" }}
                        onMouseEnter={e => e.currentTarget.style.borderColor="rgba(139,92,246,0.25)"}
                        onMouseLeave={e => e.currentTarget.style.borderColor="rgba(255,255,255,0.05)"}>
                        <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0"
                          style={{ backgroundColor:"#1a1d26" }}>
                          {entry.poster_url
                            ? <img src={entry.poster_url} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-white truncate group-hover:text-violet-300 transition-colors">
                            {entry.title}
                          </p>
                          {entry.title_jp && (
                            <p className="text-xs mt-0.5 truncate" style={{ color:"#6b7280" }}>{entry.title_jp}</p>
                          )}
                          {key==="watching" && entry.episodes && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="flex-1 rounded-full overflow-hidden" style={{ height:"3px", backgroundColor:"rgba(255,255,255,0.08)" }}>
                                <div className="h-full rounded-full"
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
                        </div>
                        {entry.avg_rating && (
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold" style={{ color:"#fbbf24" }}>⭐ {Number(entry.avg_rating).toFixed(1)}</p>
                            <p className="text-xs" style={{ color:"#6b7280" }}>{entry.rating_count} оц.</p>
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Комментарии */}
      {activeTab==="Комментарии" && (
        loading ? <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor:"rgba(255,255,255,0.1)", borderTopColor:"#8b5cf6" }} />
        </div> :
        myComments.length===0 ? (
          <div className="text-center py-16" style={{ color:"#4b5563" }}>
            <p className="text-4xl mb-3">💬</p>
            <p className="text-sm">Вы ещё не оставляли комментариев</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myComments.map(c => (
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
