// src/pages/CollectionsPage.jsx
// Страница /collections/:id — просмотр коллекции
// Страница /profile/:username?tab=collections — список коллекций
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import {
  fetchCollection, fetchCollections, createCollection,
  updateCollection, deleteCollection,
  removeFromCollection,
} from "../api/api";
import { usePageMeta } from "../hooks/usePageMeta";
import { STATUS_LABELS, TYPE_LABELS } from "../api/api";

// ── Карточка коллекции (для списка) ──────────────────────────
export function CollectionCard({ col, onDelete }) {
  const { user } = useAuth();
  const isOwner = user?.id === col.user_id || user?.username === col.author_username;
  const previews = col.preview_posters?.filter(Boolean) || [];

  return (
    <div style={{ background:"#13151c", border:"1px solid rgba(255,255,255,0.06)",
      borderRadius:14, overflow:"hidden", transition:"border-color .15s" }}
      onMouseEnter={e => e.currentTarget.style.borderColor="rgba(124,58,237,0.35)"}
      onMouseLeave={e => e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"}>
      {/* Превью постеров */}
      <Link to={`/collections/${col.id}`} style={{ textDecoration:"none", display:"block" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", height:120, overflow:"hidden",
          background:"#0d0f14", gap:1 }}>
          {previews.slice(0,4).map((p, i) => (
            <img key={i} src={p} alt="" loading="lazy"
              style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
          ))}
          {previews.length === 0 && (
            <div style={{ gridColumn:"1/-1", display:"flex", alignItems:"center", justifyContent:"center",
              color:"#374151", fontSize:32 }}>📚</div>
          )}
        </div>
      </Link>

      <div style={{ padding:"12px 14px" }}>
        <Link to={`/collections/${col.id}`} style={{ textDecoration:"none" }}>
          <h3 style={{ color:"#fff", fontWeight:700, fontSize:14, margin:"0 0 4px",
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {col.title}
          </h3>
        </Link>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:12, color:"#6b7280" }}>
            <span>{col.anime_count} аниме</span>
            {!col.is_public && <span style={{ marginLeft:6, color:"#f59e0b" }}>🔒 приват</span>}
          </div>
          <Link to={`/profile/${col.author_username}`}
            style={{ fontSize:11, color:"#7c3aed", textDecoration:"none" }}>
            {col.author_username}
          </Link>
        </div>
        {col.description && (
          <p style={{ color:"#9ca3af", fontSize:12, marginTop:6, lineHeight:1.5,
            overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
            {col.description}
          </p>
        )}
        {isOwner && onDelete && (
          <button onClick={() => onDelete(col.id)}
            style={{ marginTop:8, fontSize:11, color:"#6b7280", background:"none",
              border:"none", cursor:"pointer", padding:0 }}>
            🗑 Удалить
          </button>
        )}
      </div>
    </div>
  );
}

// ── Список коллекций пользователя (встраивается в Profile) ────
export function UserCollections({ username, isSelf }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({ title:"", description:"", is_public:true });
  const [creating, setCreating] = useState(false);
  const [err, setErr]         = useState("");

  const load = () => {
    setLoading(true);
    fetchCollections({ username, limit:50 })
      .then(d => setItems(d.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [username]);

  async function create() {
    if (!form.title.trim()) return setErr("Укажите название");
    setCreating(true); setErr("");
    try {
      await createCollection(form);
      setShowForm(false);
      setForm({ title:"", description:"", is_public:true });
      load();
    } catch(e) { setErr(e.message); }
    finally { setCreating(false); }
  }

  async function del(id) {
    if (!confirm("Удалить коллекцию?")) return;
    try { await deleteCollection(id); setItems(prev => prev.filter(c => c.id !== id)); }
    catch(e) { alert(e.message); }
  }

  const inputStyle = {
    background:"#1c1f2a", border:"1px solid rgba(255,255,255,0.08)",
    borderRadius:8, color:"#fff", padding:"7px 12px", fontSize:13, outline:"none", width:"100%",
    boxSizing:"border-box",
  };

  return (
    <div>
      {isSelf && (
        <div style={{ marginBottom:16 }}>
          <button onClick={() => setShowForm(v => !v)}
            style={{ padding:"8px 16px", borderRadius:8, background:"#7c3aed",
              border:"none", color:"#fff", cursor:"pointer", fontSize:13, fontWeight:600 }}>
            + Создать коллекцию
          </button>

          {showForm && (
            <div style={{ marginTop:12, padding:16, background:"#13151c",
              border:"1px solid rgba(124,58,237,0.2)", borderRadius:12, display:"flex", flexDirection:"column", gap:10 }}>
              <input value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))}
                placeholder="Название коллекции *" style={inputStyle} />
              <textarea value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))}
                placeholder="Описание (необязательно)..." rows={2}
                style={{ ...inputStyle, resize:"vertical" }} />
              <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, color:"#9ca3af" }}>
                <input type="checkbox" checked={form.is_public}
                  onChange={e => setForm(p=>({...p,is_public:e.target.checked}))}
                  style={{ accentColor:"#7c3aed" }} />
                Публичная коллекция
              </label>
              {err && <p style={{ color:"#f87171", fontSize:12 }}>{err}</p>}
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={create} disabled={creating}
                  style={{ padding:"8px 16px", borderRadius:8, background:"#7c3aed",
                    border:"none", color:"#fff", cursor:"pointer", fontSize:13, fontWeight:600,
                    opacity: creating ? 0.6:1 }}>
                  {creating ? "Создаётся..." : "Создать"}
                </button>
                <button onClick={() => setShowForm(false)}
                  style={{ padding:"8px 14px", borderRadius:8, background:"rgba(255,255,255,0.05)",
                    border:"none", color:"#9ca3af", cursor:"pointer", fontSize:13 }}>
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p style={{ color:"#6b7280", fontSize:13 }}>Загрузка...</p>
      ) : items.length === 0 ? (
        <div style={{ textAlign:"center", padding:"32px 0", color:"#6b7280" }}>
          <p style={{ fontSize:28, marginBottom:8 }}>📚</p>
          <p>{isSelf ? "У вас пока нет коллекций" : "Коллекций нет"}</p>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:14 }}>
          {items.map(col => (
            <CollectionCard key={col.id} col={col} onDelete={isSelf ? del : null} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Страница коллекции /collections/:id ───────────────────────
export default function CollectionPage() {
  const { id }        = useParams();
  const navigate      = useNavigate();
  const { user }      = useAuth();
  const [col, setCol] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({});
  const [err, setErr]         = useState("");

  usePageMeta(col ? col.title : "Коллекция");

  useEffect(() => {
    setLoading(true);
    fetchCollection(id)
      .then(data => { setCol(data); setForm({ title:data.title, description:data.description||"", is_public:data.is_public }); })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function saveEdit() {
    try {
      const updated = await updateCollection(id, form);
      setCol(c => ({ ...c, ...updated }));
      setEditing(false);
    } catch(e) { alert(e.message); }
  }

  async function removeAnime(animeId, title) {
    if (!confirm(`Удалить «${title}» из коллекции?`)) return;
    try {
      await removeFromCollection(id, animeId);
      setCol(c => ({ ...c, items: c.items.filter(i => i.id !== animeId) }));
    } catch(e) { alert(e.message); }
  }

  async function delCollection() {
    if (!confirm("Удалить коллекцию? Это действие необратимо.")) return;
    try { await deleteCollection(id); navigate(`/profile/${col.author_username}`); }
    catch(e) { alert(e.message); }
  }

  const inputStyle = {
    background:"#1c1f2a", border:"1px solid rgba(255,255,255,0.08)",
    borderRadius:8, color:"#fff", padding:"7px 12px", fontSize:13, outline:"none",
    width:"100%", boxSizing:"border-box",
  };

  if (loading) return <div style={{ textAlign:"center", padding:60, color:"#6b7280" }}>Загрузка...</div>;
  if (err)     return <div style={{ textAlign:"center", padding:60, color:"#f87171" }}>{err}</div>;
  if (!col)    return null;

  return (
    <div style={{ maxWidth:900, margin:"0 auto" }}>
      {/* Заголовок */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:12, color:"#7c3aed", fontWeight:600, letterSpacing:1,
          textTransform:"uppercase", marginBottom:8 }}>
          Коллекция
        </div>
        {editing ? (
          <div style={{ display:"flex", flexDirection:"column", gap:10, maxWidth:560 }}>
            <input value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))}
              style={{ ...inputStyle, fontSize:20, fontWeight:700, padding:"10px 14px" }} />
            <textarea value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))}
              rows={2} placeholder="Описание..." style={{ ...inputStyle, resize:"vertical" }} />
            <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#9ca3af", cursor:"pointer" }}>
              <input type="checkbox" checked={form.is_public}
                onChange={e => setForm(p=>({...p,is_public:e.target.checked}))}
                style={{ accentColor:"#7c3aed" }} />
              Публичная
            </label>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={saveEdit}
                style={{ padding:"8px 16px", borderRadius:8, background:"#7c3aed",
                  border:"none", color:"#fff", cursor:"pointer", fontSize:13, fontWeight:600 }}>
                Сохранить
              </button>
              <button onClick={() => setEditing(false)}
                style={{ padding:"8px 14px", borderRadius:8, background:"rgba(255,255,255,0.05)",
                  border:"none", color:"#9ca3af", cursor:"pointer", fontSize:13 }}>
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize:24, fontWeight:900, color:"#fff", margin:"0 0 6px" }}>
              {col.title}
              {!col.is_public && <span style={{ marginLeft:10, fontSize:14, color:"#f59e0b" }}>🔒 Приватная</span>}
            </h1>
            {col.description && (
              <p style={{ color:"#9ca3af", fontSize:14, lineHeight:1.7, maxWidth:600, margin:"0 0 10px" }}>
                {col.description}
              </p>
            )}
            <div style={{ display:"flex", alignItems:"center", gap:16, fontSize:13, color:"#6b7280" }}>
              <span>{col.items?.length || 0} аниме</span>
              <Link to={`/profile/${col.author_username}`}
                style={{ color:"#7c3aed", textDecoration:"none" }}>
                от {col.author_username}
              </Link>
              <span>{new Date(col.created_at).toLocaleDateString("ru")}</span>
              {col.is_owner && (
                <>
                  <button onClick={() => setEditing(true)}
                    style={{ background:"rgba(255,255,255,0.06)", border:"none", borderRadius:6,
                      color:"#9ca3af", cursor:"pointer", padding:"4px 10px", fontSize:12 }}>
                    ✎ Редактировать
                  </button>
                  <button onClick={delCollection}
                    style={{ background:"rgba(220,38,38,0.1)", border:"none", borderRadius:6,
                      color:"#f87171", cursor:"pointer", padding:"4px 10px", fontSize:12 }}>
                    🗑 Удалить
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Список аниме */}
      {!col.items?.length ? (
        <div style={{ textAlign:"center", padding:"60px 20px", background:"#13151c",
          borderRadius:16, border:"1px solid rgba(255,255,255,0.05)", color:"#6b7280" }}>
          <p style={{ fontSize:32, marginBottom:8 }}>📭</p>
          <p>В коллекции пока нет аниме</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {col.items.map((anime, idx) => (
            <div key={anime.id} style={{ display:"flex", alignItems:"center", gap:14,
              background:"#13151c", border:"1px solid rgba(255,255,255,0.06)",
              borderRadius:14, padding:14,
              transition:"border-color .15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor="rgba(124,58,237,0.25)"}
              onMouseLeave={e => e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"}>
              {/* Номер */}
              <span style={{ color:"rgba(124,58,237,0.5)", fontWeight:900, fontSize:18, minWidth:24, textAlign:"center" }}>
                {idx + 1}
              </span>
              {/* Постер */}
              <Link to={`/anime/${anime.id}`} style={{ flexShrink:0 }}>
                <div style={{ width:50, height:70, borderRadius:8, overflow:"hidden", background:"#1a1d26" }}>
                  {anime.poster_url
                    ? <img src={anime.poster_url} alt={anime.title} loading="lazy"
                        style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                    : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center",
                        justifyContent:"center", color:"#374151", fontSize:20 }}>🎬</div>
                  }
                </div>
              </Link>
              {/* Инфо */}
              <div style={{ flex:1, minWidth:0 }}>
                <Link to={`/anime/${anime.id}`} style={{ textDecoration:"none" }}>
                  <h3 style={{ color:"#fff", fontWeight:700, fontSize:14, margin:"0 0 4px",
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {anime.title}
                  </h3>
                </Link>
                <div style={{ fontSize:12, color:"#6b7280", display:"flex", gap:10, flexWrap:"wrap" }}>
                  <span>{TYPE_LABELS?.[anime.type] || anime.type}</span>
                  {anime.episodes && <span>{anime.episodes} эп.</span>}
                  {anime.avg_rating && (
                    <span style={{ color:"#fbbf24" }}>★ {anime.avg_rating}</span>
                  )}
                </div>
                {anime.note && (
                  <p style={{ color:"#9ca3af", fontSize:12, marginTop:4, fontStyle:"italic" }}>
                    {anime.note}
                  </p>
                )}
              </div>
              {/* Удалить (только владелец) */}
              {col.is_owner && (
                <button onClick={() => removeAnime(anime.id, anime.title)}
                  style={{ background:"rgba(220,38,38,0.1)", border:"none", borderRadius:8,
                    color:"#f87171", cursor:"pointer", padding:"6px 10px", fontSize:12, flexShrink:0 }}>
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
