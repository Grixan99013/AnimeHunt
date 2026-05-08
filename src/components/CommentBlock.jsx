// src/components/CommentBlock.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../App";
import ReportModal from "./ReportModal";

// ─────────────────────────────────────────────────────────────
// Рендер форматированного текста
// ─────────────────────────────────────────────────────────────

function SpoilerSpan({ text }) {
  const [open, setOpen] = useState(false);
  if (open) {
    return (
      <span onClick={() => setOpen(false)}
        style={{ backgroundColor: "rgba(139,92,246,0.12)", borderRadius: "4px", padding: "0 4px", cursor: "pointer" }}
        title="Нажмите чтобы скрыть">
        {renderInline(text)}
      </span>
    );
  }
  return (
    <button onClick={() => setOpen(true)}
      style={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        background: "linear-gradient(to right,#7c3aed,#a21caf)",
        color: "var(--text-primary)", border: "none", borderRadius: "8px",
        padding: "2px 10px", fontSize: "0.72rem", fontWeight: 700,
        cursor: "pointer", verticalAlign: "middle",
      }}>
      ⚠️ SPOILER ALERT!
    </button>
  );
}

function renderInline(text) {
  const re = /(\*\*(.+?)\*\*|~~(.+?)~~|__(.+?)__|_(.+?)_)/gs;
  const parts = [];
  let last = 0, m, idx = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={idx++}>{text.slice(last, m.index)}</span>);
    if      (m[0].startsWith("**")) parts.push(<strong key={idx++}>{m[2]}</strong>);
    else if (m[0].startsWith("~~")) parts.push(<s       key={idx++}>{m[3]}</s>);
    else if (m[0].startsWith("__")) parts.push(<u       key={idx++}>{m[4]}</u>);
    else if (m[0].startsWith("_"))  parts.push(<em      key={idx++}>{m[5]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<span key={idx++}>{text.slice(last)}</span>);
  return parts;
}

function RenderedBody({ body }) {
  if (!body) return null;
  const spoilerRe = /\[spoiler\]([\s\S]*?)\[\/spoiler\]/gi;
  const segments  = [];
  let last = 0, m, idx = 0;
  while ((m = spoilerRe.exec(body)) !== null) {
    if (m.index > last) {
      body.slice(last, m.index).split("\n").forEach((line, i, arr) => {
        segments.push(<span key={idx++}>{renderInline(line)}</span>);
        if (i < arr.length - 1) segments.push(<br key={idx++} />);
      });
    }
    segments.push(<SpoilerSpan key={idx++} text={m[1]} />);
    last = m.index + m[0].length;
  }
  if (last < body.length) {
    body.slice(last).split("\n").forEach((line, i, arr) => {
      segments.push(<span key={idx++}>{renderInline(line)}</span>);
      if (i < arr.length - 1) segments.push(<br key={idx++} />);
    });
  }
  return (
    <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", wordBreak: "break-word" }}>
      {segments}
    </p>
  );
}

// ─────────────────────────────────────────────────────────────
// Аватар пользователя — общий компонент для комментариев
// ─────────────────────────────────────────────────────────────
function UserAvatar({ username, avatarUrl, size = 28 }) {
  const letter = (username || "?")[0].toUpperCase();
  return (
    <div
      className="rounded-full overflow-hidden flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{
        width: size, height: size,
        background: avatarUrl ? "transparent" : "linear-gradient(135deg,#7c3aed,#a21caf)",
        border: "1px solid var(--border)",
        fontSize: size * 0.4,
      }}>
      {avatarUrl
        ? <img src={avatarUrl} alt={username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : letter}
    </div>
  );
}

// Кликабельное имя пользователя — ссылка на профиль
function UserLink({ username }) {
  return (
    <Link
      to={`/profile/${username}`}
      className="text-sm font-semibold transition-colors hover:text-violet-300" style={{ color: "var(--text-primary)" }}
      style={{ textDecoration: "none" }}>
      {username}
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────
// Редактор комментария
// ─────────────────────────────────────────────────────────────
function CommentEditor({ onSubmit, submitting, placeholder, autoFocus = false, onCancel }) {
  const [text,  setText] = useState("");
  const [img,   setImg]  = useState(null);
  const textareaRef = useRef(null);
  const fileRef     = useRef(null);

  const insert = useCallback((before, after = "") => {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = text.slice(s, e) || "текст";
    const next = text.slice(0, s) + before + sel + after + text.slice(e);
    setText(next);
    setTimeout(() => {
      ta.focus();
      const pos = s + before.length + sel.length + after.length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  }, [text]);

  const insertSpoiler = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = text.slice(s, e) || "спойлер";
    setText(text.slice(0, s) + `[spoiler]${sel}[/spoiler]` + text.slice(e));
    setTimeout(() => ta.focus(), 0);
  }, [text]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Максимальный размер файла — 5 МБ"); return; }
    const reader = new FileReader();
    reader.onload = ev => setImg({ url: ev.target.result });
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if ((!text.trim() && !img) || submitting) return;
    onSubmit({ body: text.trim(), image_url: img?.url || null });
    setText("");
    setImg(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const canSend = (text.trim() || img) && !submitting;

  const tools = [
    { label: "B",  title: "Жирный (Ctrl+B)",  action: () => insert("**", "**"), style: { fontWeight: 700 } },
    { label: "I",  title: "Курсив (Ctrl+I)",   action: () => insert("_", "_"),   style: { fontStyle: "italic" } },
    { label: "S",  title: "Зачёркнутый",       action: () => insert("~~", "~~"), style: { textDecoration: "line-through" } },
    { label: "U",  title: "Подчёркнутый",      action: () => insert("__", "__"), style: { textDecoration: "underline" } },
    { label: "⚠️", title: "Spoiler Alert",     action: insertSpoiler,            style: {} },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {/* Панель инструментов */}
      <div className="flex items-center gap-1 flex-wrap">
        {tools.map(t => (
          <button key={t.label} type="button" title={t.title} onClick={t.action}
            className="w-8 h-7 rounded flex items-center justify-center text-xs transition-colors"
            style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)", cursor: "pointer", ...t.style }}>
            {t.label}
          </button>
        ))}
        <div style={{ width: 1, height: 18, backgroundColor: "var(--border)", margin: "0 4px" }} />
        <button type="button" title="Прикрепить изображение (до 5 МБ)" onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 h-7 px-2.5 rounded text-xs"
          style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          Фото
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      <textarea
        ref={textareaRef}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={placeholder}
        rows={3}
        autoFocus={autoFocus}
        onKeyDown={e => {
          if (e.ctrlKey && e.key === "b") { e.preventDefault(); insert("**", "**"); }
          if (e.ctrlKey && e.key === "i") { e.preventDefault(); insert("_", "_"); }
          if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); handleSubmit(e); }
        }}
        className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-y"
        style={{ backgroundColor: "var(--bg-base)", border: "1px solid var(--border)", lineHeight: 1.6, minHeight: "80px", color: "var(--text-primary)" }}
        onFocus={e => e.target.style.borderColor = "rgba(139,92,246,0.4)"}
        onBlur={e  => e.target.style.borderColor = "var(--border)"}
      />

      {img && (
        <div className="relative inline-block">
          <img src={img.url} alt="preview" className="max-h-36 rounded-xl object-cover"
            style={{ maxWidth: "220px", border: "1px solid var(--border)" }} />
          <button type="button" onClick={() => { setImg(null); if (fileRef.current) fileRef.current.value = ""; }}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: "#ef4444", color: "var(--text-primary)", border: "none", cursor: "pointer" }}>
            ✕
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={!canSend}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: canSend ? "linear-gradient(to right,#7c3aed,#a21caf)" : "var(--bg-elevated)", opacity: canSend ? 1 : 0.5, cursor: canSend ? "pointer" : "not-allowed", border: "none", color: canSend ? "#ffffff" : "var(--text-muted)" }}>
          {submitting ? "Отправка…" : "Отправить"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-muted)", border: "none", cursor: "pointer" }}>
            Отмена
          </button>
        )}
        <span className="text-xs ml-1" style={{ color: "var(--text-veryfaint)" }}>Ctrl+Enter</span>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────
// Карточка комментария (рекурсивная)
// ─────────────────────────────────────────────────────────────
function CommentCard({ c, allComments, onReply, onDelete, onEdit, depth, user, loginPath }) {
  const [showReplies,  setShowReplies]  = useState(true);
  const [editing,      setEditing]      = useState(false);
  const [editBody,     setEditBody]     = useState(c.body || "");
  const [editSaving,   setEditSaving]   = useState(false);
  const replies  = allComments.filter(r => String(r.parent_id) === String(c.id));
  const MAX_DEPTH = 4;

  const isOwn     = user && user.id === c.user_id;
  const isModAdmin= user && (user.role_id === 1 || user.role_id === 2);
  // Редактирование доступно автору в течение 15 мин
  const canEdit = isOwn && (Date.now() - new Date(c.created_at).getTime()) < 15 * 60 * 1000;
  const canDelete = isOwn || isModAdmin;

  const submitEdit = async () => {
    if (!editBody.trim()) return;
    setEditSaving(true);
    try {
      await onEdit(c.id, editBody.trim());
      setEditing(false);
    } catch (e) { alert(e.message); }
    finally { setEditSaving(false); }
  };

  const dateStr = new Date(c.created_at).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div>
      <div className="rounded-xl px-4 py-3"
        style={{
          backgroundColor: depth === 0 ? "var(--bg-surface)" : "var(--bg-elevated)",
          border: `1px solid var(--border)`,
        }}>

        {/* Шапка: аватар + ник + дата */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {/* Аватар — кликабельный, ведёт на профиль */}
          <Link to={`/profile/${c.username}`} style={{ textDecoration: "none", flexShrink: 0 }}>
            <UserAvatar username={c.username} avatarUrl={c.avatar_url} size={28} />
          </Link>

          {/* Ник — ссылка на профиль */}
          <UserLink username={c.username} />

          {/* Ответ кому — показываем при depth=0 */}
          {c.parent_username && depth === 0 && (
            <span className="text-xs flex items-center gap-1" style={{ color: "var(--text-faint)" }}>
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
              </svg>
              <Link to={`/profile/${c.parent_username}`}
                style={{ color: "#a78bfa", textDecoration: "none" }}
                className="hover:underline">
                @{c.parent_username}
              </Link>
            </span>
          )}

          <span className="text-xs ml-auto flex-shrink-0" style={{ color: "var(--text-veryfaint)" }}>{dateStr}</span>
        </div>

        {/* Тело — или форма редактирования */}
        {editing ? (
          <div className="mt-1 space-y-2">
            <textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={3}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
              style={{ backgroundColor: "var(--bg-base)", border: "1px solid rgba(139,92,246,0.4)", color: "var(--text-primary)" }} />
            <div className="flex gap-2">
              <button onClick={submitEdit} disabled={editSaving}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                style={{ background: "rgba(139,92,246,0.3)", color: "#c4b5fd", border: "none", cursor: "pointer" }}>
                {editSaving ? "…" : "Сохранить"}
              </button>
              <button onClick={() => { setEditing(false); setEditBody(c.body || ""); }}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "none", cursor: "pointer" }}>
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <RenderedBody body={c.body} />
        )}

        {/* Прикреплённое изображение */}
        {c.image_url && (
          <div className="mt-2">
            <a href={c.image_url} target="_blank" rel="noopener noreferrer">
              <img src={c.image_url} alt="вложение" className="rounded-xl object-cover cursor-zoom-in"
                style={{ maxHeight: "200px", maxWidth: "320px", border: "1px solid var(--border)" }} />
            </a>
          </div>
        )}

        {/* Нижняя панель — Ответить + свернуть ответы */}
        <div className="flex items-center gap-3 mt-2">
          {user ? (
            <button onClick={() => onReply(c)}
              className="text-xs flex items-center gap-1 transition-colors"
              style={{ color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.color = "#a78bfa"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--text-faint)"}>
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
              </svg>
              Ответить
            </button>
          ) : (
            <Link to={loginPath} className="text-xs" style={{ color: "var(--text-faint)" }}>Войдите, чтобы ответить</Link>
          )}
          {canEdit && !editing && (
            <button onClick={() => setEditing(true)}
              className="text-xs flex items-center gap-1 transition-colors"
              style={{ color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.color = "#60a5fa"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--text-faint)"}>
              ✏ Изменить
            </button>
          )}
          {canDelete && (
            <button onClick={() => { if (window.confirm("Удалить комментарий?")) onDelete(c.id); }}
              className="text-xs flex items-center gap-1 transition-colors"
              style={{ color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--text-faint)"}>
              🗑 Удалить
            </button>
          )}
          {!canDelete && <ReportModal commentId={c.id} small />}

          {replies.length > 0 && (
            <button onClick={() => setShowReplies(v => !v)}
              className="text-xs flex items-center gap-1"
              style={{ color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer" }}>
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                style={{ transform: showReplies ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
              {showReplies ? "Скрыть" : "Показать"} {replies.length}{" "}
              {replies.length === 1 ? "ответ" : replies.length < 5 ? "ответа" : "ответов"}
            </button>
          )}
        </div>
      </div>

      {/* Вложенные ответы */}
      {showReplies && replies.length > 0 && (
        <div className="mt-2 space-y-2 pl-4"
          style={{ borderLeft: "2px solid rgba(139,92,246,0.2)", marginLeft: "14px" }}>
          {replies.map(r => (
            <CommentCard key={r.id} c={r} allComments={allComments} onReply={onReply}
              onDelete={onDelete} onEdit={onEdit}
              depth={Math.min(depth + 1, MAX_DEPTH)} user={user} loginPath={loginPath} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Главный компонент
// ─────────────────────────────────────────────────────────────
export default function CommentBlock({
  comments: initialComments = [],
  onPost,
  onDelete,
  onEdit,
  placeholder   = "Поделитесь впечатлениями…",
  loginPath     = "/login",
  previewCount  = 5,
}) {
  const { user } = useAuth();
  const [comments,   setComments]   = useState(() => initialComments);
  const [submitting, setSubmitting] = useState(false);
  const [showAll,    setShowAll]    = useState(false);
  const [replyTo,    setReplyTo]    = useState(null);
  const replyBoxRef = useRef(null);

  useEffect(() => {
    if (initialComments.length > 0) setComments(initialComments);
  }, [initialComments]);

  const handleDelete = useCallback(async (commentId) => {
    try {
      if (onDelete) await onDelete(commentId);
      setComments(prev => prev.map(c =>
        String(c.id) === String(commentId)
          ? { ...c, body: "[удалено]", is_deleted: true, image_url: null }
          : c
      ));
    } catch (e) { alert(e.message); }
  }, [onDelete]);

  const handleEdit = useCallback(async (commentId, body) => {
    if (onEdit) await onEdit(commentId, body);
    setComments(prev => prev.map(c =>
      String(c.id) === String(commentId) ? { ...c, body } : c
    ));
  }, [onEdit]);

  const handleReply = useCallback((c) => {
    setReplyTo({ id: c.id, username: c.username });
    setTimeout(() => {
      replyBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      replyBoxRef.current?.querySelector("textarea")?.focus();
    }, 80);
  }, []);

  const handlePost = async ({ body, image_url }) => {
    if (!onPost) return;
    setSubmitting(true);
    try {
      const newC = await onPost({ body, image_url, parent_id: replyTo?.id || null });
      setComments(prev => [...prev, newC]);
      setReplyTo(null);
    } catch (e) { alert(e.message); }
    finally { setSubmitting(false); }
  };

  const roots       = comments.filter(c => !c.parent_id);
  const visible     = showAll ? roots : roots.slice(0, previewCount);
  const hiddenCount = roots.length - previewCount;

  return (
    <div className="space-y-5">
      {/* Заголовок */}
      <div className="flex items-center gap-2">
        <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Комментарии</h3>
        {comments.length > 0 && (
          <span className="text-sm" style={{ color: "var(--text-faint)" }}>({comments.length})</span>
        )}
      </div>

      {/* Форма — показываем аватар текущего пользователя рядом */}
      {user ? (
        <div className="flex gap-3 items-start">
          <Link to={`/profile/${user.username}`} style={{ textDecoration: "none", flexShrink: 0, marginTop: "4px" }}>
            <UserAvatar username={user.username} avatarUrl={user.avatar_url} size={32} />
          </Link>
          <div className="flex-1 min-w-0">
            <CommentEditor onSubmit={handlePost} submitting={submitting} placeholder={placeholder} />
          </div>
        </div>
      ) : (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-faint)" }}>
          <Link to={loginPath} style={{ color: "#a78bfa" }}>Войдите</Link>, чтобы оставить комментарий.
        </div>
      )}

      {/* Форма ответа */}
      {replyTo && (
        <div ref={replyBoxRef} className="rounded-xl p-4"
          style={{ backgroundColor: "var(--bg-surface)", border: "1px solid rgba(139,92,246,0.35)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                style={{ color: "#a78bfa" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
              </svg>
              <span style={{ color: "var(--text-muted)" }}>
                Ответ для{" "}
                <Link to={`/profile/${replyTo.username}`}
                  style={{ color: "#c4b5fd", fontWeight: 600, textDecoration: "none" }}>
                  @{replyTo.username}
                </Link>
              </span>
            </div>
            <button onClick={() => setReplyTo(null)}
              style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: "1rem" }}>
              ✕
            </button>
          </div>
          <CommentEditor onSubmit={handlePost} submitting={submitting}
            placeholder={`Ответить @${replyTo.username}…`}
            autoFocus onCancel={() => setReplyTo(null)} />
        </div>
      )}

      {/* Список */}
      {roots.length === 0 ? (
        <p className="text-sm py-2" style={{ color: "var(--text-veryfaint)" }}>Комментариев пока нет. Будьте первым!</p>
      ) : (
        <div className="space-y-3">
          {visible.map(c => (
            <CommentCard key={c.id} c={c} allComments={comments} onReply={handleReply}
              onDelete={handleDelete} onEdit={handleEdit}
              depth={0} user={user} loginPath={loginPath} />
          ))}

          {!showAll && hiddenCount > 0 && (
            <button onClick={() => setShowAll(true)}
              className="w-full py-2.5 rounded-xl text-sm font-medium"
              style={{ backgroundColor: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer" }}>
              Показать ещё {hiddenCount}{" "}
              {hiddenCount === 1 ? "комментарий" : hiddenCount < 5 ? "комментария" : "комментариев"}
            </button>
          )}
          {showAll && roots.length > previewCount && (
            <button onClick={() => setShowAll(false)}
              className="w-full py-2.5 rounded-xl text-sm font-medium"
              style={{ backgroundColor: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-muted)", cursor: "pointer" }}>
              Свернуть
            </button>
          )}
        </div>
      )}
    </div>
  );
}
