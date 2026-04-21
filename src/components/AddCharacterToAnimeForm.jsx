// src/components/AddCharacterToAnimeForm.jsx
import { useState, useEffect, useCallback } from "react";
import {
  addCharacterToAnime, fetchCharacterList, uploadAdminImage, ROLE_LABELS,
} from "../api/api";

const inputStyle = {
  width: "100%",
  borderRadius: "0.75rem",
  padding: "0.625rem 0.875rem",
  fontSize: "0.875rem",
  color: "#fff",
  outline: "none",
  backgroundColor: "#0d0f14",
  border: "1px solid rgba(255,255,255,0.1)",
};
const labelStyle = { display: "block", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.05em", color: "#6b7280", marginBottom: "0.35rem" };

const ROLES_IN = ["main", "supporting", "extra"];

export default function AddCharacterToAnimeForm({ animeId, onSuccess, onCancel }) {
  const [mode, setMode] = useState("new");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [searchQ, setSearchQ] = useState("");
  const [searchHits, setSearchHits] = useState([]);
  const [linkId, setLinkId] = useState("");

  const [name, setName] = useState("");
  const [nameJp, setNameJp] = useState("");
  const [role, setRole] = useState("supporting");
  const [roleInAnime, setRoleInAnime] = useState("main");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [abilities, setAbilities] = useState("");

  const runSearch = useCallback(async (q) => {
    const t = q?.trim();
    if (!t || t.length < 2) {
      setSearchHits([]);
      return;
    }
    try {
      const rows = await fetchCharacterList({ q: t, limit: 12 });
      setSearchHits(Array.isArray(rows) ? rows : []);
    } catch {
      setSearchHits([]);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => runSearch(searchQ), 300);
    return () => clearTimeout(t);
  }, [searchQ, runSearch]);

  const pickHit = (c) => {
    setLinkId(String(c.id));
    setSearchQ(c.name);
    setSearchHits([]);
  };

  const handleImageFile = async e => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const url = await uploadAdminImage(f);
      setImageUrl(url);
    } catch (e2) {
      setErr(e2.message || "Не удалось загрузить файл");
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      if (mode === "link") {
        const cid = parseInt(linkId, 10);
        if (!Number.isInteger(cid)) {
          setErr("Выберите персонажа из поиска или введите id");
          setSaving(false);
          return;
        }
        await addCharacterToAnime(animeId, {
          mode: "link",
          character_id: cid,
          role_in_anime: roleInAnime,
        });
      } else {
        if (!name.trim()) {
          setErr("Укажите имя персонажа");
          setSaving(false);
          return;
        }
        await addCharacterToAnime(animeId, {
          mode: "new",
          name: name.trim(),
          name_jp: nameJp.trim() || null,
          role,
          role_in_anime: roleInAnime,
          description: description.trim() || null,
          image_url: imageUrl.trim() || null,
          age: age.trim() || null,
          gender: gender.trim() || null,
          abilities: abilities.trim() || null,
        });
      }
      onSuccess?.();
    } catch (e2) {
      setErr(e2.message || "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {err && (
        <div className="rounded-xl px-4 py-2 text-sm" style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5" }}>{err}</div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={() => setMode("new")}
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{
            background: mode === "new" ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.05)",
            color: mode === "new" ? "#c4b5fd" : "#9ca3af",
            border: mode === "new" ? "1px solid rgba(139,92,246,0.4)" : "1px solid transparent",
            cursor: "pointer",
          }}>
          Новый персонаж
        </button>
        <button type="button" onClick={() => setMode("link")}
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{
            background: mode === "link" ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.05)",
            color: mode === "link" ? "#c4b5fd" : "#9ca3af",
            border: mode === "link" ? "1px solid rgba(139,92,246,0.4)" : "1px solid transparent",
            cursor: "pointer",
          }}>
          Уже в базе (этот же персонаж в другом тайтле)
        </button>
      </div>

      <div>
        <label style={labelStyle}>Роль в этом аниме</label>
        <select value={roleInAnime} onChange={e => setRoleInAnime(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
          {ROLES_IN.map(r => (
            <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
          ))}
        </select>
      </div>

      {mode === "link" ? (
        <div className="space-y-2">
          <label style={labelStyle}>Поиск по имени</label>
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Минимум 2 символа…" style={inputStyle} />
          {searchHits.length > 0 && (
            <div className="rounded-xl overflow-hidden max-h-48 overflow-y-auto" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              {searchHits.map(c => (
                <button key={c.id} type="button" onClick={() => pickHit(c)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm"
                  style={{ background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.05)", color: "#e5e7eb", cursor: "pointer" }}>
                  {c.image_url && <img src={c.image_url} alt="" className="w-8 h-8 rounded-full object-cover" />}
                  <span>{c.name}{c.name_jp ? ` · ${c.name_jp}` : ""}</span>
                  <span className="ml-auto text-xs" style={{ color: "#6b7280" }}>id {c.id}</span>
                </button>
              ))}
            </div>
          )}
          <div>
            <label style={labelStyle}>Id персонажа (если знаете)</label>
            <input value={linkId} onChange={e => setLinkId(e.target.value)} placeholder="например 12" style={inputStyle} />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label style={labelStyle}>Имя *</label>
            <input required value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Имя (яп.)</label>
            <input value={nameJp} onChange={e => setNameJp(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Общая роль персонажа (каталог)</label>
            <select value={role} onChange={e => setRole(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {ROLES_IN.map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Описание</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          </div>
          <div>
            <label style={labelStyle}>URL портрета</label>
            <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} style={inputStyle} placeholder="https://…" />
          </div>
          <div>
            <label style={labelStyle}>Или файл портрета</label>
            <input type="file" accept="image/*" onChange={handleImageFile}
              className="text-sm w-full"
              style={{ color: "#9ca3af" }} />
          </div>
          {imageUrl && (
            <div className="flex items-center gap-3">
              <img src={imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover" style={{ border: "1px solid rgba(255,255,255,0.1)" }} />
              <button type="button" onClick={() => setImageUrl("")}
                className="text-xs" style={{ color: "#f87171", background: "none", border: "none", cursor: "pointer" }}>Сбросить</button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Возраст</label>
              <input value={age} onChange={e => setAge(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Пол</label>
              <input value={gender} onChange={e => setGender(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Способности</label>
            <input value={abilities} onChange={e => setAbilities(e.target.value)} style={inputStyle} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button type="submit" disabled={saving}
          className="px-5 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(to right,#7c3aed,#a21caf)", opacity: saving ? 0.6 : 1, border: "none", cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? "…" : "Добавить к тайтлу"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="px-5 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "rgba(255,255,255,0.05)", color: "#9ca3af", border: "none", cursor: "pointer" }}>
            Отмена
          </button>
        )}
      </div>
    </form>
  );
}
