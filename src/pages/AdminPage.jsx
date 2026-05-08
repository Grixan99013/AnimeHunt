// src/pages/AdminPage.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AnimeForm from "../components/AnimeForm";
import {
  fetchGenres, fetchStudios,
  adminFetchStats, adminFetchUsers, adminSetUserRole, adminToggleBan,
  adminFetchGenres, adminCreateGenre, adminUpdateGenre, adminDeleteGenre,
  adminFetchStudios, adminCreateStudio, adminUpdateStudio, adminDeleteStudio,
  adminDeleteAnime, adminFetchPendingMedia, adminReviewMedia,
  adminFetchReports, adminReviewReport, adminPinReview, adminFetchLeaderboard,
  fetchAnimeList, fetchNews, createNews, updateNews, deleteNews,
  fetchCharacterList, searchStaff,
} from "../api/api";

function Btn({ children, onClick, variant = "primary", disabled, small }) {
  const base = {
    border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600, transition: "opacity .15s", opacity: disabled ? 0.5 : 1,
    padding: small ? "4px 10px" : "8px 16px", fontSize: small ? 12 : 14,
  };
  const variants = {
    primary: { background: "#7c3aed", color: "#fff" },
    danger:  { background: "#dc2626", color: "#fff" },
    success: { background: "#16a34a", color: "#fff" },
    ghost:   { background: "var(--bg-elevated)", color: "var(--text-secondary)" },
  };
  return <button style={{ ...base, ...variants[variant] }} onClick={onClick} disabled={disabled}>{children}</button>;
}

function Card({ children, style }) {
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, ...style }}>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, style, onKeyDown }) {
  return (
    <input value={value} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown}
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, color: "#fff", padding: "7px 12px", fontSize: 14, outline: "none", ...style }} />
  );
}

function Badge({ children, color = "#7c3aed" }) {
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: color + "22", color, border: `1px solid ${color}44` }}>
      {children}
    </span>
  );
}

function StatsBar() {
  const [s, setS] = useState(null);
  useEffect(() => { adminFetchStats().then(setS).catch(() => {}); }, []);
  if (!s) return null;
  const items = [
    { label: "Аниме", value: s.anime, color: "#7c3aed" },
    { label: "Пользователи", value: s.users, color: "#3b82f6" },
    { label: "Медиа на мод.", value: s.pending_media, color: s.pending_media > 0 ? "#f59e0b" : "#6b7280" },
    { label: "Рецензии", value: s.reviews, color: "#10b981" },
    { label: "Комментарии", value: s.comments, color: "#8b5cf6" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 12, marginBottom: 24 }}>
      {items.map(i => (
        <Card key={i.label} style={{ textAlign: "center", padding: "14px 10px" }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: i.color }}>{i.value}</div>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>{i.label}</div>
        </Card>
      ))}
    </div>
  );
}

function UsersTab() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try { const d = await adminFetchUsers({ q, page, limit }); setItems(d.items); setTotal(d.total); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, [q, page]);

  useEffect(() => { load(); }, [load]);

  async function setRole(id, role_id) {
    try { await adminSetUserRole(id, Number(role_id)); load(); }
    catch (e) { alert(e.message); }
  }
  async function toggleBan(id) {
    if (!confirm("Изменить статус блокировки?")) return;
    try { await adminToggleBan(id); load(); }
    catch (e) { alert(e.message); }
  }

  const pages = Math.ceil(total / limit);
  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <Input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Поиск по нику / email..." style={{ maxWidth: 300 }} />
        <span style={{ color: "var(--text-faint)", fontSize: 13 }}>{total} пользователей</span>
      </div>
      {err && <p style={{ color: "#f87171", marginBottom: 12 }}>{err}</p>}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", color: "var(--text-faint)" }}>
              {["ID","Ник","Email","Роль","Актив","Комм.","Рец.","Рег.","Действия"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: 24, color: "var(--text-faint)" }}>Загрузка...</td></tr>
            ) : items.map(u => (
              <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "8px 10px", color: "var(--text-faint)" }}>{u.id}</td>
                <td style={{ padding: "8px 10px", color: "#fff", fontWeight: 600 }}>{u.username}</td>
                <td style={{ padding: "8px 10px", color: "var(--text-muted)" }}>{u.email}</td>
                <td style={{ padding: "8px 10px" }}>
                  <select value={u.role_id} onChange={e => setRole(u.id, e.target.value)}
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 6, color: "#fff", padding: "3px 8px", fontSize: 12 }}>
                    <option value={1}>Админ</option>
                    <option value={2}>Модер</option>
                    <option value={3}>Юзер</option>
                  </select>
                </td>
                <td style={{ padding: "8px 10px" }}>
                  <Badge color={u.is_active ? "#10b981" : "#ef4444"}>{u.is_active ? "✓" : "✗"}</Badge>
                </td>
                <td style={{ padding: "8px 10px", color: "var(--text-muted)" }}>{u.comment_count}</td>
                <td style={{ padding: "8px 10px", color: "var(--text-muted)" }}>{u.review_count}</td>
                <td style={{ padding: "8px 10px", color: "var(--text-faint)" }}>{new Date(u.created_at).toLocaleDateString("ru")}</td>
                <td style={{ padding: "8px 10px" }}>
                  <Btn small variant={u.is_active ? "danger" : "success"} onClick={() => toggleBan(u.id)}>
                    {u.is_active ? "Забанить" : "Разбанить"}
                  </Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center" }}>
          <Btn small variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Назад</Btn>
          <span style={{ color: "var(--text-muted)", alignSelf: "center", fontSize: 13 }}>{page} / {pages}</span>
          <Btn small variant="ghost" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Вперёд →</Btn>
        </div>
      )}
    </div>
  );
}

function GenresTab() {
  const [items, setItems] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [err, setErr] = useState("");

  const load = () => adminFetchGenres().then(setItems).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);

  async function create() {
    if (!newName.trim()) return;
    try { await adminCreateGenre(newName.trim()); setNewName(""); load(); }
    catch (e) { setErr(e.message); }
  }
  async function save(id) {
    try { await adminUpdateGenre(id, editName.trim()); setEditId(null); load(); }
    catch (e) { setErr(e.message); }
  }
  async function del(id, name) {
    if (!confirm(`Удалить жанр «${name}»?`)) return;
    try { await adminDeleteGenre(id); load(); }
    catch (e) { setErr(e.message); }
  }

  return (
    <div>
      {err && <p style={{ color: "#f87171", marginBottom: 12 }}>{err}</p>}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Новый жанр..." style={{ maxWidth: 260 }} onKeyDown={e => e.key === "Enter" && create()} />
        <Btn onClick={create}>Добавить</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 10 }}>
        {items.map(g => (
          <Card key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px" }}>
            {editId === g.id ? (
              <>
                <Input value={editName} onChange={e => setEditName(e.target.value)} style={{ flex: 1 }} onKeyDown={e => e.key === "Enter" && save(g.id)} />
                <Btn small onClick={() => save(g.id)}>✓</Btn>
                <Btn small variant="ghost" onClick={() => setEditId(null)}>✗</Btn>
              </>
            ) : (
              <>
                <span style={{ flex: 1, color: "#fff", fontWeight: 500 }}>{g.name}</span>
                <Badge color="#6b7280">{g.anime_count}</Badge>
                <Btn small variant="ghost" onClick={() => { setEditId(g.id); setEditName(g.name); }}>✎</Btn>
                <Btn small variant="danger" onClick={() => del(g.id, g.name)}>✕</Btn>
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function StudiosTab() {
  const [items, setItems] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({ name: "", country: "" });
  const [newData, setNewData] = useState({ name: "", country: "" });
  const [err, setErr] = useState("");

  const load = () => adminFetchStudios().then(setItems).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);

  async function create() {
    if (!newData.name.trim()) return;
    try { await adminCreateStudio(newData); setNewData({ name: "", country: "" }); load(); }
    catch (e) { setErr(e.message); }
  }
  async function save(id) {
    try { await adminUpdateStudio(id, editData); setEditId(null); load(); }
    catch (e) { setErr(e.message); }
  }
  async function del(id, name) {
    if (!confirm(`Удалить студию «${name}»? Аниме этой студии останутся без студии.`)) return;
    try { await adminDeleteStudio(id); load(); }
    catch (e) { setErr(e.message); }
  }

  return (
    <div>
      {err && <p style={{ color: "#f87171", marginBottom: 12 }}>{err}</p>}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <Input value={newData.name} onChange={e => setNewData(p => ({ ...p, name: e.target.value }))} placeholder="Название студии..." style={{ maxWidth: 220 }} />
        <Input value={newData.country} onChange={e => setNewData(p => ({ ...p, country: e.target.value }))} placeholder="Страна (опц.)..." style={{ maxWidth: 140 }} />
        <Btn onClick={create}>Добавить</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))", gap: 10 }}>
        {items.map(s => (
          <Card key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px" }}>
            {editId === s.id ? (
              <>
                <div style={{ flex: 1, display: "flex", gap: 6 }}>
                  <Input value={editData.name} onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} style={{ flex: 1 }} />
                  <Input value={editData.country || ""} onChange={e => setEditData(p => ({ ...p, country: e.target.value }))} placeholder="Страна" style={{ width: 80 }} />
                </div>
                <Btn small onClick={() => save(s.id)}>✓</Btn>
                <Btn small variant="ghost" onClick={() => setEditId(null)}>✗</Btn>
              </>
            ) : (
              <>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#fff", fontWeight: 600 }}>{s.name}</div>
                  {s.country && <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{s.country}</div>}
                </div>
                <Badge color="#6b7280">{s.anime_count}</Badge>
                <Btn small variant="ghost" onClick={() => { setEditId(s.id); setEditData({ name: s.name, country: s.country || "" }); }}>✎</Btn>
                <Btn small variant="danger" onClick={() => del(s.id, s.name)}>✕</Btn>
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function MediaQueueTab() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const limit = 12;

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try { const d = await adminFetchPendingMedia({ page, limit }); setItems(d.items); setTotal(d.total); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  async function review(id, action) {
    try { await adminReviewMedia(id, action); load(); }
    catch (e) { alert(e.message); }
  }

  const pages = Math.ceil(total / limit);
  return (
    <div>
      <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
        Ожидают проверки: <strong style={{ color: "#f59e0b" }}>{total}</strong>
      </div>
      {err && <p style={{ color: "#f87171", marginBottom: 12 }}>{err}</p>}
      {loading ? <p style={{ color: "var(--text-faint)" }}>Загрузка...</p>
        : items.length === 0 ? (
          <Card style={{ textAlign: "center", padding: 40, color: "var(--text-faint)" }}>✅ Очередь пуста</Card>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 14 }}>
            {items.map(m => (
              <Card key={m.id} style={{ padding: 0, overflow: "hidden" }}>
                {m.type === "screenshot"
                  ? <img src={m.url} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
                  : <div style={{ background: "var(--bg-elevated)", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>🎬</div>
                }
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                    <a href={`/anime/${m.anime_id}`} style={{ color: "#7c3aed", textDecoration: "none" }}>{m.anime_title}</a>
                    {" · "}{m.uploader_username}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 10 }}>
                    {new Date(m.created_at).toLocaleDateString("ru")}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn small variant="success" onClick={() => review(m.id, "approve")}>✓ Принять</Btn>
                    <Btn small variant="danger"  onClick={() => review(m.id, "reject")}>✕ Отклонить</Btn>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      }
      {pages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "center" }}>
          <Btn small variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Назад</Btn>
          <span style={{ color: "var(--text-muted)", alignSelf: "center", fontSize: 13 }}>{page} / {pages}</span>
          <Btn small variant="ghost" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Вперёд →</Btn>
        </div>
      )}
    </div>
  );
}

function DeleteAnimeTab() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function search() {
    if (!q.trim()) return;
    setLoading(true); setErr("");
    try { const d = await fetchAnimeList({ q, limit: 20 }); setResults(d.items || []); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  async function del(id, title) {
    if (!confirm(`Удалить аниме «${title}» и ВСЕ связанные данные? Это необратимо!`)) return;
    try { await adminDeleteAnime(id); setResults(r => r.filter(a => a.id !== id)); }
    catch (e) { alert(e.message); }
  }

  return (
    <div>
      <div style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#fca5a5" }}>
        ⚠️ Удаление аниме — необратимая операция. Будут удалены все оценки, комментарии, рецензии, медиа и записи в списках.
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Поиск аниме для удаления..." style={{ maxWidth: 380 }} onKeyDown={e => e.key === "Enter" && search()} />
        <Btn onClick={search} disabled={loading}>{loading ? "..." : "Найти"}</Btn>
      </div>
      {err && <p style={{ color: "#f87171" }}>{err}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {results.map(a => (
          <Card key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px" }}>
            {a.poster_url && <img src={a.poster_url} alt="" style={{ width: 40, height: 56, objectFit: "cover", borderRadius: 4 }} />}
            <div style={{ flex: 1 }}>
              <div style={{ color: "#fff", fontWeight: 600 }}>{a.title}</div>
              <div style={{ fontSize: 12, color: "var(--text-faint)" }}>ID {a.id} · {a.type?.toUpperCase()} · {a.status}</div>
            </div>
            <Btn variant="danger" onClick={() => del(a.id, a.title)}>Удалить</Btn>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Reports Tab ──────────────────────────────────────────────
function ReportsTab() {
  const [items, setItems]   = useState([]);
  const [total, setTotal]   = useState(0);
  const [status, setStatus] = useState("pending");
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");
  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const d = await adminFetchReports({ status, page, limit });
      setItems(d.items); setTotal(d.total);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, [status, page]);

  useEffect(() => { load(); }, [load]);

  async function act(id, action) {
    try { await adminReviewReport(id, action); load(); }
    catch (e) { alert(e.message); }
  }

  const REASON_LABELS = { spam:"Спам", insult:"Оскорбление", spoiler:"Спойлер", off_topic:"Не по теме", other:"Другое" };
  const STATUS_TABS = [
    { v: "pending",   l: "Ожидают" },
    { v: "reviewed",  l: "Обработаны" },
    { v: "dismissed", l: "Отклонены" },
  ];
  const pages = Math.ceil(total / limit);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {STATUS_TABS.map(t => (
          <button key={t.v} onClick={() => { setStatus(t.v); setPage(1); }}
            style={{
              padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600,
              background: status === t.v ? "#7c3aed" : "rgba(255,255,255,0.05)",
              color: status === t.v ? "#fff" : "#9ca3af",
            }}>
            {t.l}
          </button>
        ))}
        <span style={{ alignSelf: "center", fontSize: 13, color: "var(--text-faint)", marginLeft: 8 }}>
          {total} жалоб
        </span>
      </div>
      {err && <p style={{ color: "#f87171", marginBottom: 12 }}>{err}</p>}
      {loading ? <p style={{ color: "var(--text-faint)" }}>Загрузка...</p>
        : items.length === 0 ? (
          <Card style={{ textAlign: "center", padding: 40, color: "var(--text-faint)" }}>
            ✅ Нет жалоб со статусом «{STATUS_TABS.find(t=>t.v===status)?.l}»
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map(r => (
              <Card key={r.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                      <Badge color="#f59e0b">{REASON_LABELS[r.reason] || r.reason}</Badge>
                      <Badge color="#6b7280">{r.comment_id ? "Комментарий" : "Рецензия"}</Badge>
                      <span style={{ fontSize: 12, color: "var(--text-faint)" }}>
                        от {r.reporter_username} · {new Date(r.created_at).toLocaleDateString("ru")}
                      </span>
                    </div>
                    {r.comment_body && (
                      <div style={{ background: "var(--bg-surface)", borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 4 }}>
                          Комментарий от <strong style={{ color: "var(--text-muted)" }}>{r.comment_author}</strong>:
                        </div>
                        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                          {r.comment_body?.slice(0, 200)}{r.comment_body?.length > 200 ? "…" : ""}
                        </p>
                        {r.comment_anime_id && (
                          <a href={`/anime/${r.comment_anime_id}`} style={{ fontSize: 11, color: "#7c3aed", textDecoration: "none" }}>
                            → Перейти к аниме
                          </a>
                        )}
                      </div>
                    )}
                    {r.review_title && (
                      <div style={{ background: "var(--bg-surface)", borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 4 }}>
                          Рецензия «<strong style={{ color: "var(--text-muted)" }}>{r.review_title}</strong>» от {r.review_author}:
                        </div>
                        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                          {r.review_body?.slice(0, 200)}{r.review_body?.length > 200 ? "…" : ""}
                        </p>
                      </div>
                    )}
                    {r.details && (
                      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
                        💬 {r.details}
                      </p>
                    )}
                  </div>
                  {status === "pending" && (
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <Btn small variant="success" onClick={() => act(r.id, "resolve")}>✓ Обработать</Btn>
                      <Btn small variant="ghost"   onClick={() => act(r.id, "dismiss")}>✗ Отклонить</Btn>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )
      }
      {pages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "center" }}>
          <Btn small variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Назад</Btn>
          <span style={{ color: "var(--text-muted)", alignSelf: "center", fontSize: 13 }}>{page} / {pages}</span>
          <Btn small variant="ghost" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Вперёд →</Btn>
        </div>
      )}
    </div>
  );
}

// ── Leaderboard Tab ───────────────────────────────────────────
function LeaderboardTab() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");

  useEffect(() => {
    setLoading(true);
    adminFetchLeaderboard(30)
      .then(setItems)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
        Топ пользователей по активности (комментарии × 2 + рецензии × 5 + оценки × 1)
      </div>
      {err && <p style={{ color: "#f87171", marginBottom: 12 }}>{err}</p>}
      {loading ? <p style={{ color: "var(--text-faint)" }}>Загрузка...</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((u, idx) => (
            <Card key={u.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px" }}>
              <div style={{
                minWidth: 32, textAlign: "center", fontWeight: 900, fontSize: 16,
                color: idx === 0 ? "#fbbf24" : idx === 1 ? "#9ca3af" : idx === 2 ? "#b45309" : "#4b5563",
              }}>
                #{idx + 1}
              </div>
              {u.avatar_url
                ? <img src={u.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--bg-elevated)", display:"flex",alignItems:"center",justifyContent:"center",color:"#6b7280",fontWeight:700 }}>
                    {u.username[0].toUpperCase()}
                  </div>
              }
              <div style={{ flex: 1 }}>
                <a href={`/profile/${u.username}`} style={{ color: "#fff", fontWeight: 700, textDecoration: "none", fontSize: 14 }}>
                  {u.username}
                </a>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
                  {u.comments} комм. · {u.reviews} рец. · {u.ratings} оценок · {u.watchlist_count} в списке
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 900, fontSize: 18, color: "#7c3aed" }}>{u.activity_score}</div>
                <div style={{ fontSize: 10, color: "var(--text-faint)" }}>очков</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

const TABS = [
  { key: "anime",      label: "➕ Добавить аниме" },
  { key: "users",      label: "👥 Пользователи" },
  { key: "genres",     label: "🏷 Жанры" },
  { key: "studios",    label: "🏢 Студии" },
  { key: "media",      label: "🎬 Медиа (модерация)" },
  { key: "reports",    label: "⚑ Жалобы" },
  { key: "leaderboard",label: "🏆 Активность" },
  { key: "delete",     label: "🗑 Удаление аниме" },
  { key: "news",       label: "📰 Новости" },
];

export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("anime");
  const [genres, setGenres] = useState([]);
  const [studios, setStudios] = useState([]);
  const [loadErr, setLoadErr] = useState("");

  useEffect(() => {
    Promise.all([fetchGenres(), fetchStudios()])
      .then(([g, s]) => { setGenres(g); setStudios(s); })
      .catch(e => setLoadErr(e.message));
  }, []);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: 0 }}>Комната администратора</h1>
        <p style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 4 }}>Управление контентом и пользователями</p>
      </div>
      <StatsBar />
      <div style={{ display: "flex", gap: 4, marginBottom: 24, flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600, transition: "all .15s",
              background: tab === t.key ? "#7c3aed" : "rgba(255,255,255,0.05)",
              color: tab === t.key ? "#fff" : "#9ca3af",
            }}>
            {t.label}
          </button>
        ))}
      </div>
      {loadErr && <p style={{ color: "#f87171", marginBottom: 16 }}>{loadErr}</p>}
      {tab === "anime"   && <Card><AnimeForm genreList={genres} studioList={studios} onAfterSave={() => fetchStudios().then(setStudios)} onSaved={({ id }) => navigate(`/anime/${id}`)} /></Card>}
      {tab === "users"   && <UsersTab />}
      {tab === "genres"  && <GenresTab />}
      {tab === "studios" && <StudiosTab />}
      {tab === "media"   && <MediaQueueTab />}
      {tab === "delete"     && <DeleteAnimeTab />}
      {tab === "reports"    && <ReportsTab />}
      {tab === "leaderboard"&& <LeaderboardTab />}
      {tab === "news"      && <NewsTab />}
    </div>
  );
}

// ── NewsLinkPicker — вставка кликабельных ссылок на аниме/персонажей/авторов ──
function NewsLinkPicker({ onInsert, onClose }) {
  const [tab, setTab]       = useState("anime"); // anime | character | staff
  const [query, setQuery]   = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setResults([]);
    if (!query.trim()) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        if (tab === "anime") {
          const d = await fetchAnimeList({ q: query, limit: 8 });
          setResults((d.items || d || []).map(a => ({
            id: a.id, label: a.title_ru || a.title, sub: a.title_en || "",
            href: `/anime/${a.id}`, tag: `[anime:${a.id}|${a.title_ru || a.title}]`,
          })));
        } else if (tab === "character") {
          const d = await fetchCharacterList({ q: query, limit: 8 });
          setResults((d.items || d || []).map(c => ({
            id: c.id, label: c.name_ru || c.name, sub: c.name_en || "",
            href: `/characters/${c.id}`, tag: `[character:${c.id}|${c.name_ru || c.name}]`,
          })));
        } else {
          const d = await searchStaff(query);
          setResults((d || []).map(s => ({
            id: s.id, label: s.name, sub: s.role || "",
            href: `/staff/${s.id}`, tag: `[staff:${s.id}|${s.name}]`,
          })));
        }
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query, tab]);

  const tabStyle = (t) => ({
    padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer",
    fontSize: 12, fontWeight: 600,
    background: tab === t ? "#7c3aed" : "var(--bg-elevated)",
    color: tab === t ? "#fff" : "var(--text-muted)",
  });

  return (
    <div style={{
      position: "absolute", zIndex: 200, top: "calc(100% + 4px)", left: 0, right: 0,
      background: "var(--bg-surface)", border: "1px solid #7c3aed",
      borderRadius: 12, padding: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Вставить ссылку</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 16 }}>✕</button>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {[["anime","🎌 Аниме"],["character","👤 Персонаж"],["staff","✍️ Автор"]].map(([k,l]) => (
          <button key={k} style={tabStyle(k)} onClick={() => { setTab(k); setQuery(""); setResults([]); }}>{l}</button>
        ))}
      </div>
      <input
        autoFocus
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={tab === "anime" ? "Поиск аниме..." : tab === "character" ? "Поиск персонажа..." : "Поиск автора..."}
        style={{
          width: "100%", boxSizing: "border-box", background: "var(--bg-elevated)",
          border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)",
          padding: "7px 10px", fontSize: 13, outline: "none",
        }}
      />
      {loading && <p style={{ color: "var(--text-faint)", fontSize: 12, margin: "8px 0 0" }}>Поиск...</p>}
      {results.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 2, maxHeight: 220, overflowY: "auto" }}>
          {results.map(r => (
            <button key={r.id} onClick={() => { onInsert(r.tag, r.label); onClose(); }}
              style={{
                display: "flex", flexDirection: "column", alignItems: "flex-start",
                background: "var(--bg-elevated)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "6px 10px", cursor: "pointer",
                transition: "border-color .15s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#7c3aed"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{r.label}</span>
              {r.sub && <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{r.sub}</span>}
            </button>
          ))}
        </div>
      )}
      {!loading && query.trim() && results.length === 0 && (
        <p style={{ color: "var(--text-faint)", fontSize: 12, margin: "8px 0 0" }}>Ничего не найдено</p>
      )}
    </div>
  );
}

// ── NewsBodyRenderer — рендерит тело новости с поддержкой ссылок ──
function NewsBodyPreview({ body }) {
  if (!body) return null;
  // Разбираем теги [anime:id|Название], [character:id|Имя], [staff:id|Имя]
  const re = /\[(anime|character|staff):(\d+)\|([^\]]+)\]/g;
  const parts = [];
  let last = 0, m, idx = 0;
  while ((m = re.exec(body)) !== null) {
    if (m.index > last) {
      parts.push(<span key={idx++}>{body.slice(last, m.index)}</span>);
    }
    const [, type, id, label] = m;
    const href = type === "anime" ? `/anime/${id}` : type === "character" ? `/characters/${id}` : `/staff/${id}`;
    parts.push(
      <a key={idx++} href={href}
        style={{ color: "#a78bfa", textDecoration: "none", fontWeight: 600, borderBottom: "1px solid rgba(167,139,250,0.3)" }}
        onMouseEnter={e => e.target.style.color = "#c4b5fd"}
        onMouseLeave={e => e.target.style.color = "#a78bfa"}>
        {label}
      </a>
    );
    last = m.index + m[0].length;
  }
  if (last < body.length) parts.push(<span key={idx++}>{body.slice(last)}</span>);
  return <p style={{ color: "var(--text-faint)", fontSize: 12, lineHeight: 1.6, margin: 0 }}>{parts}</p>;
}

// ── NewsEditor — полноценный редактор новости ──
function NewsEditor({ editItem, onSave, onCancel }) {
  const [form, setForm] = useState(() => editItem
    ? { title: editItem.title, body: editItem.body, cover_url: editItem.cover_url || "", is_published: editItem.is_published }
    : { title: "", body: "", cover_url: "", is_published: true }
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const textareaRef = useRef(null);
  const pickerRef   = useRef(null);

  const inputStyle = {
    background: "var(--bg-elevated)", border: "1px solid var(--border)",
    borderRadius: 8, color: "var(--text-primary)", padding: "8px 12px",
    fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box",
  };

  // Закрываем picker при клике вне
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  const insert = useCallback((before, after = "") => {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = form.body.slice(s, e) || "текст";
    const next = form.body.slice(0, s) + before + sel + after + form.body.slice(e);
    setForm(p => ({ ...p, body: next }));
    setTimeout(() => {
      ta.focus();
      const pos = s + before.length + sel.length + after.length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  }, [form.body]);

  const insertSpoiler = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = form.body.slice(s, e) || "спойлер";
    setForm(p => ({ ...p, body: p.body.slice(0, s) + `[spoiler]${sel}[/spoiler]` + p.body.slice(e) }));
    setTimeout(() => ta.focus(), 0);
  }, [form.body]);

  const insertLink = useCallback((tag) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const next = form.body.slice(0, s) + tag + form.body.slice(s);
    setForm(p => ({ ...p, body: next }));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(s + tag.length, s + tag.length); }, 0);
  }, [form.body]);

  const tools = [
    { label: "B",  title: "Жирный (Ctrl+B)",  action: () => insert("**", "**"), style: { fontWeight: 700 } },
    { label: "I",  title: "Курсив (Ctrl+I)",   action: () => insert("_", "_"),   style: { fontStyle: "italic" } },
    { label: "S",  title: "Зачёркнутый",       action: () => insert("~~", "~~"), style: { textDecoration: "line-through" } },
    { label: "U",  title: "Подчёркнутый",      action: () => insert("__", "__"), style: { textDecoration: "underline" } },
    { label: "⚠️", title: "Spoiler Alert",     action: insertSpoiler,            style: {} },
  ];

  async function save() {
    if (!form.title.trim() || !form.body.trim()) return setErr("Заполните заголовок и текст");
    setSaving(true); setErr("");
    try {
      if (editItem) await updateNews(editItem.id, form);
      else await createNews(form);
      onSave();
    } catch(e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  const toolBtnStyle = {
    width: 30, height: 28, borderRadius: 6, display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: 12, cursor: "pointer",
    backgroundColor: "var(--bg-elevated)", color: "var(--text-secondary)",
    border: "1px solid var(--border)",
  };

  return (
    <Card style={{ marginBottom: 20 }}>
      <h3 style={{ color: "var(--text-primary)", fontWeight: 700, marginBottom: 14 }}>
        {editItem ? "Редактировать новость" : "Новая новость"}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Заголовок */}
        <div>
          <label style={{ fontSize: 12, color: "var(--text-faint)", display: "block", marginBottom: 4 }}>Заголовок *</label>
          <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={inputStyle} />
        </div>
        {/* Обложка */}
        <div>
          <label style={{ fontSize: 12, color: "var(--text-faint)", display: "block", marginBottom: 4 }}>Обложка (URL)</label>
          <input value={form.cover_url} onChange={e => setForm(p => ({ ...p, cover_url: e.target.value }))}
            placeholder="https://..." style={inputStyle} />
          {form.cover_url && (
            <img src={form.cover_url} alt="preview"
              style={{ marginTop: 8, maxHeight: 120, borderRadius: 8, objectFit: "cover", border: "1px solid var(--border)" }}
              onError={e => e.target.style.display = "none"} />
          )}
        </div>
        {/* Редактор текста */}
        <div>
          <label style={{ fontSize: 12, color: "var(--text-faint)", display: "block", marginBottom: 4 }}>Текст *</label>
          {/* Тулбар */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
            {tools.map(t => (
              <button key={t.label} type="button" title={t.title} onClick={t.action}
                style={{ ...toolBtnStyle, ...t.style }}>
                {t.label}
              </button>
            ))}
            <div style={{ width: 1, height: 18, backgroundColor: "var(--border)", margin: "0 4px" }} />
            {/* Кнопка вставки ссылки */}
            <div style={{ position: "relative" }} ref={pickerRef}>
              <button type="button" title="Вставить ссылку на аниме/персонажа/автора"
                onClick={() => setShowPicker(v => !v)}
                style={{
                  ...toolBtnStyle, width: "auto", padding: "0 10px", gap: 4,
                  display: "flex", alignItems: "center",
                  background: showPicker ? "#7c3aed" : "var(--bg-elevated)",
                  color: showPicker ? "#fff" : "var(--text-muted)",
                  borderColor: showPicker ? "#7c3aed" : "var(--border)",
                }}>
                🔗 Ссылка
              </button>
              {showPicker && (
                <NewsLinkPicker
                  onInsert={(tag) => insertLink(tag)}
                  onClose={() => setShowPicker(false)}
                />
              )}
            </div>
          </div>
          <textarea
            ref={textareaRef}
            value={form.body}
            onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
            rows={8}
            onKeyDown={e => {
              if (e.ctrlKey && e.key === "b") { e.preventDefault(); insert("**", "**"); }
              if (e.ctrlKey && e.key === "i") { e.preventDefault(); insert("_", "_"); }
            }}
            style={{ ...inputStyle, resize: "vertical", minHeight: 160, lineHeight: 1.6, fontFamily: "monospace" }}
            onFocus={e => e.target.style.borderColor = "rgba(139,92,246,0.5)"}
            onBlur={e  => e.target.style.borderColor = "var(--border)"}
          />
          {/* Справка */}
          <p style={{ fontSize: 11, color: "var(--text-veryfaint)", marginTop: 4 }}>
            **жирный** · _курсив_ · ~~зачёрк~~ · __подчёрк__ · [spoiler]…[/spoiler] · 🔗 для ссылок на контент сайта
          </p>
        </div>
        {/* Превью */}
        {form.body.trim() && (
          <div style={{ background: "var(--bg-elevated)", borderRadius: 8, padding: "10px 14px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text-faint)", marginBottom: 6, fontWeight: 600 }}>ПРЕВЬЮ</div>
            <NewsBodyPreview body={form.body} />
          </div>
        )}
        {/* Опубликовать */}
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted)", cursor: "pointer" }}>
          <input type="checkbox" checked={form.is_published} onChange={e => setForm(p => ({ ...p, is_published: e.target.checked }))}
            style={{ accentColor: "#7c3aed" }} />
          Опубликовать сразу
        </label>
        {err && <p style={{ color: "#f87171", fontSize: 12, margin: 0 }}>{err}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={save} disabled={saving}>{saving ? "Сохранение..." : "Сохранить"}</Btn>
          <Btn variant="ghost" onClick={onCancel}>Отмена</Btn>
        </div>
      </div>
    </Card>
  );
}

// ── NewsTab ───────────────────────────────────────────────────
function NewsTab() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [err, setErr]           = useState("");

  const load = () => {
    setLoading(true);
    fetchNews({ limit: 50 }).then(d => setItems(d.items || [])).catch(e => setErr(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  function openNew() { setEditItem(null); setShowForm(true); setErr(""); }
  function openEdit(n) { setEditItem(n); setShowForm(true); setErr(""); }

  async function del(id, title) {
    if (!confirm(`Удалить новость «${title}»?`)) return;
    try { await deleteNews(id); load(); }
    catch(e) { alert(e.message); }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <Btn onClick={openNew}>+ Написать новость</Btn>
      </div>
      {err && <p style={{ color: "#f87171", marginBottom: 12 }}>{err}</p>}

      {showForm && (
        <NewsEditor
          editItem={editItem}
          onSave={() => { setShowForm(false); load(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? <p style={{ color: "var(--text-faint)" }}>Загрузка...</p>
        : items.length === 0 ? (
          <Card style={{ textAlign: "center", padding: 40, color: "var(--text-faint)" }}>
            📰 Новостей пока нет
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map(n => (
              <Card key={n.id} style={{ display: "flex", gap: 14 }}>
                {n.cover_url && (
                  <img src={n.cover_url} alt="" style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <h3 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 14 }}>{n.title}</h3>
                    <Badge color={n.is_published ? "#10b981" : "#6b7280"}>
                      {n.is_published ? "Опубликовано" : "Черновик"}
                    </Badge>
                  </div>
                  <div style={{ marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    <NewsBodyPreview body={n.body} />
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <Btn small variant="ghost" onClick={() => openEdit(n)}>✎ Редактировать</Btn>
                    <Btn small variant="danger" onClick={() => del(n.id, n.title)}>🗑 Удалить</Btn>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      }
    </div>
  );
}
