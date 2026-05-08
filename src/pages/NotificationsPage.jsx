// src/pages/NotificationsPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchNotifications, markAllRead, markOneRead, deleteNotification } from "../api/api";
import { usePageMeta } from "../hooks/usePageMeta";

const TYPE_CONFIG = {
  comment_reply: { icon: "💬", label: "Ответ на комментарий" },
  review_like:   { icon: "❤️", label: "Лайк рецензии" },
  mention:       { icon: "📢", label: "Упоминание" },
  new_review:    { icon: "📝", label: "Новая рецензия" },
  new_episode:   { icon: "📺", label: "Новый эпизод" },
};

function getText(n) {
  switch (n.type) {
    case "comment_reply": return `${n.actor_username || "Кто-то"} ответил на ваш комментарий${n.anime_title ? ` к «${n.anime_title}»` : ""}`;
    case "review_like":   return `${n.actor_username || "Кто-то"} оценил вашу рецензию${n.review_title ? ` «${n.review_title}»` : ""}`;
    case "mention":       return `${n.actor_username || "Кто-то"} упомянул вас в комментарии${n.anime_title ? ` к «${n.anime_title}»` : ""}`;
    case "new_review":    return `Новая рецензия на «${n.anime_title || "аниме"}»`;
    case "new_episode":   return n.notification_body || `Вышел эпизод ${n.episode_number || ""}${n.anime_title ? ` — «${n.anime_title}»` : ""}`;
    default:              return n.notification_body || n.type;
  }
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "только что";
  if (m < 60) return `${m} мин. назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч. назад`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} дн. назад`;
  return new Date(dateStr).toLocaleDateString("ru");
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [filter, setFilter]   = useState("all");
  const [loading, setLoading] = useState(true);
  const limit = 30;

  usePageMeta("Уведомления");

  useEffect(() => {
    setLoading(true);
    fetchNotifications({ page, limit, ...(filter === "unread" && { unread_only: true }) })
      .then(d => { setItems(d.items); setTotal(d.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, filter]);

  async function handleMarkAll() {
    await markAllRead();
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  async function handleClick(n) {
    if (!n.is_read) {
      await markOneRead(n.id);
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
    }
    if (n.anime_id) navigate(`/anime/${n.anime_id}`);
  }

  async function handleDelete(id) {
    await deleteNotification(id);
    setItems(prev => prev.filter(n => n.id !== id));
    setTotal(t => t - 1);
  }

  const unreadCount = items.filter(n => !n.is_read).length;
  const pages = Math.ceil(total / limit);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>

      {/* ── Заголовок ──────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--text-primary)", margin: 0 }}>
            Уведомления
          </h1>
          <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 4 }}>
            {total} всего
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAll}
            style={{
              padding: "8px 14px", borderRadius: 8,
              border: "1px solid rgba(124,58,237,0.35)",
              background: "transparent", color: "#a78bfa",
              cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}>
            Прочитать все
          </button>
        )}
      </div>

      {/* ── Фильтры ────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {[{ v: "all", l: "Все" }, { v: "unread", l: "Непрочитанные" }].map(f => (
          <button key={f.v} onClick={() => { setFilter(f.v); setPage(1); }}
            style={{
              padding: "6px 14px", borderRadius: 8,
              border: filter === f.v ? "none" : "1px solid var(--border)",
              cursor: "pointer", fontSize: 13, fontWeight: 600,
              background: filter === f.v ? "#7c3aed" : "var(--bg-elevated)",
              color: filter === f.v ? "#fff" : "var(--text-muted)",
            }}>
            {f.l}
          </button>
        ))}
      </div>

      {/* ── Список ─────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "var(--text-faint)" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--border)",
            borderTopColor: "#8b5cf6", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          Загрузка...
        </div>
      ) : items.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          background: "var(--bg-surface)", borderRadius: 16,
          border: "1px solid var(--border)",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
          <p style={{ color: "var(--text-faint)", fontSize: 14 }}>
            {filter === "unread" ? "Непрочитанных уведомлений нет" : "Уведомлений пока нет"}
          </p>
        </div>
      ) : (
        <div style={{
          background: "var(--bg-surface)", borderRadius: 16,
          border: "1px solid var(--border)", overflow: "hidden",
        }}>
          {items.map((n, idx) => {
            const cfg = TYPE_CONFIG[n.type] || { icon: "📌", label: n.type };
            const isLast = idx === items.length - 1;
            const bgUnread = "rgba(124,58,237,0.06)";

            return (
              <div key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 14,
                  padding: "16px 20px",
                  borderBottom: isLast ? "none" : "1px solid var(--border)",
                  cursor: n.anime_id ? "pointer" : "default",
                  background: n.is_read ? "transparent" : bgUnread,
                  transition: "background .15s",
                  position: "relative",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover, var(--bg-elevated))"}
                onMouseLeave={e => e.currentTarget.style.background = n.is_read ? "transparent" : bgUnread}
              >
                {/* Аватар / Иконка */}
                <div style={{
                  width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                  background: "var(--bg-elevated)", border: "1px solid var(--border)",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 18, position: "relative",
                  overflow: "hidden",
                }}>
                  {n.actor_avatar
                    ? <img src={n.actor_avatar} alt=""
                        style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                    : cfg.icon
                  }
                  {n.actor_avatar && (
                    <span style={{
                      position: "absolute", bottom: -1, right: -1,
                      fontSize: 12, lineHeight: 1,
                      background: "var(--bg-surface)", borderRadius: "50%",
                      width: 18, height: 18, display: "flex",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      {cfg.icon}
                    </span>
                  )}
                </div>

                {/* Контент */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: 11, color: "var(--text-faint)", fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>
                      {cfg.label}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-veryfaint)" }}>
                      {timeAgo(n.created_at)}
                    </span>
                  </div>

                  <p style={{
                    color: n.is_read ? "var(--text-muted)" : "var(--text-primary)",
                    fontSize: 14, margin: 0, lineHeight: 1.5,
                  }}>
                    {getText(n)}
                  </p>

                  {n.comment_preview && (
                    <p style={{
                      color: "var(--text-faint)", fontSize: 12, marginTop: 5,
                      fontStyle: "italic", overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap",
                      padding: "4px 8px", background: "var(--bg-elevated)",
                      borderRadius: 6, border: "1px solid var(--border)",
                    }}>
                      «{n.comment_preview}»
                    </p>
                  )}

                  {/* Для new_episode — постер аниме */}
                  {n.type === "new_episode" && n.anime_title && (
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      marginTop: 6, padding: "3px 8px",
                      background: "rgba(124,58,237,0.1)", borderRadius: 6,
                      border: "1px solid rgba(124,58,237,0.2)",
                    }}>
                      <span style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600 }}>
                        📺 {n.anime_title}
                      </span>
                      {n.episode_number && (
                        <span style={{ fontSize: 11, color: "var(--text-faint)" }}>
                          Эп. {n.episode_number}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Действия справа */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, paddingTop: 2 }}>
                  {!n.is_read && (
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: "#7c3aed", flexShrink: 0,
                    }} />
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(n.id); }}
                    style={{
                      background: "none", border: "none",
                      color: "var(--text-veryfaint)", cursor: "pointer",
                      fontSize: 16, padding: "2px 4px", lineHeight: 1,
                      borderRadius: 4, transition: "color .15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--text-veryfaint)"}
                    title="Удалить">
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Пагинация ──────────────────────────────────────────── */}
      {pages > 1 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20, alignItems: "center" }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            style={{
              padding: "8px 18px", borderRadius: 8,
              border: "1px solid var(--border)",
              cursor: page <= 1 ? "not-allowed" : "pointer",
              background: "var(--bg-elevated)", color: "var(--text-muted)",
              opacity: page <= 1 ? 0.4 : 1, fontSize: 13,
            }}>
            ← Назад
          </button>
          <span style={{ color: "var(--text-faint)", fontSize: 13 }}>
            {page} / {pages}
          </span>
          <button disabled={page >= pages} onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0 }); }}
            style={{
              padding: "8px 18px", borderRadius: 8,
              border: "1px solid var(--border)",
              cursor: page >= pages ? "not-allowed" : "pointer",
              background: "var(--bg-elevated)", color: "var(--text-muted)",
              opacity: page >= pages ? 0.4 : 1, fontSize: 13,
            }}>
            Вперёд →
          </button>
        </div>
      )}
    </div>
  );
}
