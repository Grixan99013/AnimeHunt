// src/components/AddToCollection.jsx
// Дропдаун для добавления аниме в коллекцию со страницы аниме
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { fetchCollections, addToCollection, createCollection } from "../api/api";

export default function AddToCollection({ animeId }) {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [open, setOpen]         = useState(false);
  const [cols, setCols]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [loaded, setLoaded]     = useState(false);
  const [adding, setAdding]     = useState(null); // id коллекции в процессе
  const [newTitle, setNewTitle] = useState("");
  const [showNew, setShowNew]   = useState(false);
  const [done, setDone]         = useState({}); // { colId: true }
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  async function loadCollections() {
    if (loaded) return;
    setLoading(true);
    try {
      const d = await fetchCollections({ user_id: user.id, limit: 50 });
      setCols(d.items);
      setLoaded(true);
    } catch {}
    finally { setLoading(false); }
  }

  function toggle() {
    if (!user) return navigate("/login");
    setOpen(v => {
      if (!v) loadCollections();
      return !v;
    });
  }

  async function add(colId) {
    setAdding(colId);
    try {
      await addToCollection(colId, { anime_id: animeId });
      setDone(d => ({ ...d, [colId]: true }));
    } catch(e) { alert(e.message); }
    finally { setAdding(null); }
  }

  async function createAndAdd() {
    if (!newTitle.trim()) return;
    try {
      const col = await createCollection({ title: newTitle.trim(), is_public: true });
      await addToCollection(col.id, { anime_id: animeId });
      setCols(prev => [col, ...prev]);
      setDone(d => ({ ...d, [col.id]: true }));
      setNewTitle("");
      setShowNew(false);
    } catch(e) { alert(e.message); }
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={toggle}
        style={{
          width: "100%", padding: "10px 0", borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--bg-hover)",
          color: "var(--text-muted)", cursor: "pointer", fontSize: 13,
          fontWeight: 600, transition: "all .15s",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}
        onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.08)"; e.currentTarget.style.color="#fff"; }}
        onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.04)"; e.currentTarget.style.color="#9ca3af"; }}>
        📚 В коллекцию
      </button>

      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: 0, right: 0,
          background: "var(--bg-surface)", border: "1px solid var(--border)",
          borderRadius: 12, overflow: "hidden",
          boxShadow: "0 -16px 40px rgba(0,0,0,0.5)",
          zIndex: 100, maxHeight: 320, display: "flex", flexDirection: "column",
        }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)",
            fontSize: 12, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Мои коллекции
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {loading ? (
              <p style={{ padding: "16px 12px", color: "var(--text-faint)", fontSize: 13 }}>Загрузка...</p>
            ) : cols.length === 0 && !showNew ? (
              <p style={{ padding: "16px 12px", color: "var(--text-faint)", fontSize: 13 }}>Нет коллекций</p>
            ) : cols.map(col => (
              <div key={col.id}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.04)",
                  transition: "background .1s" }}
                onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.03)"}
                onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                <div>
                  <p style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, margin: 0 }}>{col.title}</p>
                  <p style={{ color: "var(--text-faint)", fontSize: 11, margin: 0 }}>{col.anime_count} аниме</p>
                </div>
                <button onClick={() => add(col.id)} disabled={!!done[col.id] || adding === col.id}
                  style={{
                    padding: "5px 12px", borderRadius: 8, border: "none", cursor: done[col.id] ? "default" : "pointer",
                    fontSize: 12, fontWeight: 700,
                    background: done[col.id] ? "rgba(16,185,129,0.15)" : "#7c3aed",
                    color: done[col.id] ? "#34d399" : "#fff",
                    opacity: adding === col.id ? 0.6 : 1, flexShrink: 0,
                  }}>
                  {done[col.id] ? "✓ Добавлено" : adding === col.id ? "..." : "+ Добавить"}
                </button>
              </div>
            ))}
          </div>

          {/* Создать новую */}
          <div style={{ padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {showNew ? (
              <div style={{ display: "flex", gap: 6 }}>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  placeholder="Название коллекции..."
                  onKeyDown={e => e.key === "Enter" && createAndAdd()}
                  autoFocus
                  style={{ flex: 1, background: "var(--bg-elevated)", border: "1px solid var(--border)",
                    borderRadius: 8, color: "#fff", padding: "6px 10px", fontSize: 12, outline: "none" }} />
                <button onClick={createAndAdd}
                  style={{ padding: "6px 12px", borderRadius: 8, background: "#7c3aed",
                    border: "none", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  ✓
                </button>
              </div>
            ) : (
              <button onClick={() => setShowNew(true)}
                style={{ width: "100%", padding: "7px 0", borderRadius: 8, background: "var(--bg-elevated)",
                  border: "1px solid var(--border)", color: "var(--text-muted)",
                  cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                + Новая коллекция
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
