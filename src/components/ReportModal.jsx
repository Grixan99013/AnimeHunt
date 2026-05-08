// src/components/ReportModal.jsx
// Кнопка + модалка для подачи жалобы на комментарий или рецензию
import { useState } from "react";
import { useAuth } from "../App";
import { submitReport } from "../api/api";

const REASONS = [
  { value: "spam",      label: "🚫 Спам или реклама" },
  { value: "insult",    label: "💢 Оскорбление / хейт" },
  { value: "spoiler",   label: "⚠️ Незакрытый спойлер" },
  { value: "off_topic", label: "💬 Не по теме" },
  { value: "other",     label: "❓ Другое" },
];

export default function ReportModal({ commentId, reviewId, small = false }) {
  const { user } = useAuth();
  const [open, setOpen]       = useState(false);
  const [reason, setReason]   = useState("spam");
  const [details, setDetails] = useState("");
  const [status, setStatus]   = useState("idle"); // idle | loading | done | error
  const [errMsg, setErrMsg]   = useState("");

  if (!user) return null;

  async function submit() {
    setStatus("loading"); setErrMsg("");
    try {
      await submitReport({
        comment_id: commentId || undefined,
        review_id:  reviewId  || undefined,
        reason, details: details.trim() || undefined,
      });
      setStatus("done");
    } catch (e) {
      setErrMsg(e.message);
      setStatus("error");
    }
  }

  function close() {
    setOpen(false);
    setTimeout(() => { setStatus("idle"); setDetails(""); setReason("spam"); setErrMsg(""); }, 300);
  }

  return (
    <>
      {/* Кнопка-триггер */}
      <button
        onClick={() => setOpen(true)}
        title="Пожаловаться"
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--text-faint)", fontSize: small ? 11 : 12,
          padding: "2px 6px", borderRadius: 4,
          transition: "color .15s",
        }}
        onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
        onMouseLeave={e => e.currentTarget.style.color = "#6b7280"}
      >
        ⚑ Жалоба
      </button>

      {/* Оверлей */}
      {open && (
        <div
          onClick={close}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {/* Модалка */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: 16, padding: 28, width: "100%", maxWidth: 420,
              boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            }}
          >
            {status === "done" ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <h3 style={{ color: "#fff", fontWeight: 700, marginBottom: 8 }}>Жалоба отправлена</h3>
                <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
                  Модераторы рассмотрят её в ближайшее время.
                </p>
                <button onClick={close}
                  style={{ padding: "8px 20px", borderRadius: 8, background: "#7c3aed", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 }}>
                  Закрыть
                </button>
              </div>
            ) : (
              <>
                <h3 style={{ color: "#fff", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                  Пожаловаться на {commentId ? "комментарий" : "рецензию"}
                </h3>
                <p style={{ color: "var(--text-faint)", fontSize: 12, marginBottom: 20 }}>
                  Выберите причину — мы рассмотрим жалобу в течение 24 часов.
                </p>

                {/* Причины */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  {REASONS.map(r => (
                    <label key={r.value}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                        padding: "10px 14px", borderRadius: 10,
                        border: `1px solid ${reason === r.value ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.06)"}`,
                        background: reason === r.value ? "rgba(124,58,237,0.1)" : "transparent",
                        transition: "all .15s",
                      }}
                    >
                      <input type="radio" name="reason" value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                        style={{ accentColor: "#7c3aed" }}
                      />
                      <span style={{ color: reason === r.value ? "#c4b5fd" : "#d1d5db", fontSize: 13, fontWeight: reason === r.value ? 600 : 400 }}>
                        {r.label}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Подробности */}
                <textarea
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  placeholder="Подробности (необязательно, до 500 символов)..."
                  maxLength={500}
                  rows={3}
                  style={{
                    width: "100%", background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 10, color: "#fff", padding: "10px 14px",
                    fontSize: 13, resize: "vertical", outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ textAlign: "right", fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>
                  {details.length}/500
                </div>

                {errMsg && (
                  <p style={{ color: "#f87171", fontSize: 12, marginTop: 8 }}>{errMsg}</p>
                )}

                {/* Кнопки */}
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button onClick={submit} disabled={status === "loading"}
                    style={{
                      flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
                      background: "#dc2626", color: "#fff", fontWeight: 700,
                      cursor: status === "loading" ? "not-allowed" : "pointer",
                      opacity: status === "loading" ? 0.6 : 1, fontSize: 14,
                    }}>
                    {status === "loading" ? "Отправка…" : "Отправить жалобу"}
                  </button>
                  <button onClick={close}
                    style={{
                      padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)",
                      background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: 14,
                    }}>
                    Отмена
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
