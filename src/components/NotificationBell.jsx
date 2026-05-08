// src/components/NotificationBell.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchUnreadCount, fetchNotifications, markAllRead, markOneRead, deleteNotification } from "../api/api";

const TYPE_CONFIG = {
  comment_reply: { icon: "💬", text: (n) => `${n.actor_username || "Кто-то"} ответил на ваш комментарий` },
  review_like:   { icon: "❤️", text: (n) => `${n.actor_username || "Кто-то"} лайкнул вашу рецензию${n.anime_title ? ` «${n.anime_title}»` : ""}` },
  mention:       { icon: "📢", text: (n) => `${n.actor_username || "Кто-то"} упомянул вас в комментарии` },
  new_episode:   { icon: "📺", text: (n) => n.notification_body || `Вышел эпизод ${n.episode_number || ""}${n.anime_title ? ` — «${n.anime_title}»` : ""}` },
  new_review:    { icon: "📝", text: (n) => `Новая рецензия на «${n.anime_title || "аниме"}»` },
};

function getLink(n) {
  if (n.anime_id && (n.type === "comment_reply" || n.type === "mention"))
    return `/anime/${n.anime_id}`;
  if (n.anime_id) return `/anime/${n.anime_id}`;
  return null;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "только что";
  if (m < 60) return `${m} мин. назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч. назад`;
  return `${Math.floor(h / 24)} дн. назад`;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen]           = useState(false);
  const [count, setCount]         = useState(0);
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [loaded, setLoaded]       = useState(false);
  const ref = useRef(null);

  // Polling каждые 30 секунд
  const refreshCount = useCallback(async () => {
    try {
      const r = await fetchUnreadCount();
      setCount(r.count);
    } catch {}
  }, []);

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 30000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  // Закрыть при клике вне
  useEffect(() => {
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function openPanel() {
    setOpen(v => !v);
    if (!loaded) {
      setLoading(true);
      try {
        const d = await fetchNotifications({ limit: 25 });
        setItems(d.items);
        setLoaded(true);
      } catch {}
      finally { setLoading(false); }
    }
  }

  async function handleMarkAll() {
    await markAllRead();
    setCount(0);
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  async function handleClick(n) {
    if (!n.is_read) {
      await markOneRead(n.id);
      setCount(c => Math.max(0, c - 1));
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    }
    const link = getLink(n);
    if (link) { navigate(link); setOpen(false); }
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    await deleteNotification(id);
    const deleted = items.find(n => n.id === id);
    if (deleted && !deleted.is_read) setCount(c => Math.max(0, c - 1));
    setItems(prev => prev.filter(n => n.id !== id));
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Колокольчик */}
      <button
        onClick={openPanel}
        style={{
          background: "none", border: "none", cursor: "pointer",
          position: "relative", padding: "6px", borderRadius: 8,
          color: open ? "#a78bfa" : "var(--text-faint)",
          transition: "color .15s",
          display: "flex", alignItems: "center",
        }}
        title="Уведомления"
        onMouseEnter={e => e.currentTarget.style.color = "#a78bfa"}
        onMouseLeave={e => { e.currentTarget.style.color = open ? "#a78bfa" : "var(--text-faint)"; }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {count > 0 && (
          <span style={{
            position: "absolute", top: 2, right: 2,
            background: "#ef4444", borderRadius: "50%",
            width: count > 9 ? 18 : 16, height: count > 9 ? 18 : 16,
            fontSize: 10, fontWeight: 900, color: "#ffffff",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid var(--header-bg)",
            lineHeight: 1,
          }}>
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {/* Дропдаун */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          width: 340, maxHeight: 480,
          background: "var(--bg-surface)", border: "1px solid var(--border)",
          borderRadius: 14, boxShadow: "0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
          zIndex: 1000, display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Шапка */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "14px 16px", borderBottom: "1px solid var(--border)",
          }}>
            <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>
              Уведомления {count > 0 && <span style={{ color: "#a78bfa" }}>({count})</span>}
            </span>
            {count > 0 && (
              <button onClick={handleMarkAll}
                style={{ background: "none", border: "none", color: "#7c3aed", fontSize: 12,
                  cursor: "pointer", fontWeight: 600, padding: "2px 6px" }}>
                Прочитать все
              </button>
            )}
          </div>

          {/* Список */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>
                Загрузка...
              </div>
            ) : items.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
                <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Уведомлений пока нет</p>
              </div>
            ) : items.map(n => {
              const cfg = TYPE_CONFIG[n.type] || { icon: "📌", text: () => n.type };
              const link = getLink(n);
              return (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "12px 14px",
                    borderBottom: "1px solid var(--border-light)",
                    cursor: link ? "pointer" : "default",
                    background: n.is_read ? "transparent" : "rgba(124,58,237,0.06)",
                    transition: "background .15s",
                    position: "relative",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--border-light)"}
                  onMouseLeave={e => e.currentTarget.style.background = n.is_read ? "transparent" : "rgba(124,58,237,0.06)"}
                >
                  {/* Аватар актора или иконка */}
                  <div style={{ flexShrink: 0, marginTop: 2 }}>
                    {n.actor_avatar
                      ? <img src={n.actor_avatar} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
                      : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg-elevated)",
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                          {cfg.icon}
                        </div>
                    }
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: n.is_read ? "var(--text-muted)" : "var(--text-secondary)", fontSize: 13, lineHeight: 1.4, margin: 0 }}>
                      {cfg.text(n)}
                    </p>
                    {n.comment_preview && (
                      <p style={{ color: "var(--text-faint)", fontSize: 11, marginTop: 3, fontStyle: "italic",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        «{n.comment_preview}»
                      </p>
                    )}
                    <p style={{ color: "var(--text-veryfaint)", fontSize: 11, marginTop: 4 }}>{timeAgo(n.created_at)}</p>
                  </div>

                  {/* Кнопка удалить */}
                  <button onClick={(e) => handleDelete(e, n.id)}
                    style={{
                      background: "none", border: "none", color: "var(--text-veryfaint)",
                      cursor: "pointer", fontSize: 14, padding: "0 2px",
                      flexShrink: 0, lineHeight: 1,
                      opacity: 0, transition: "opacity .15s",
                    }}
                    className="notif-delete"
                    title="Удалить">✕</button>

                  {/* Синяя точка непрочитанного */}
                  {!n.is_read && (
                    <div style={{
                      position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                      width: 7, height: 7, borderRadius: "50%", background: "#7c3aed",
                    }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Ссылка на все уведомления */}
          <div style={{ borderTop: "1px solid var(--border)", padding: "10px 16px", textAlign: "center" }}>
            <button onClick={() => { navigate("/notifications"); setOpen(false); }}
              style={{ background:"none", border:"none", color:"#7c3aed", fontSize:13,
                cursor:"pointer", fontWeight:600, padding:0 }}>
              Все уведомления →
            </button>
          </div>
        </div>
      )}

      <style>{`
        div:hover .notif-delete { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
