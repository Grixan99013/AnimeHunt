// src/components/EditCharacterForm.jsx
// Форма редактирования персонажа (только для admin)
import { useState, useEffect } from "react";
import { updateCharacter, uploadAdminImage, ROLE_LABELS } from "../api/api";

const inputStyle = {
  width: "100%", borderRadius: "0.75rem", padding: "0.625rem 0.875rem",
  fontSize: "0.875rem", color: "#fff", outline: "none",
  backgroundColor: "#0d0f14", border: "1px solid rgba(255,255,255,0.1)",
};
const labelStyle = {
  display: "block", fontSize: "0.75rem", fontWeight: 600,
  letterSpacing: "0.05em", color: "#6b7280", marginBottom: "0.35rem",
};
const focusIn  = e => { e.target.style.borderColor = "rgba(139,92,246,0.4)"; };
const focusOut = e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; };

const ROLES = ["main", "supporting", "extra"];
const GENDERS = ["", "М", "Ж", "Неизвестно"];

export default function EditCharacterForm({ character, onSaved, onCancel }) {
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  const [name,        setName]        = useState("");
  const [nameJp,      setNameJp]      = useState("");
  const [role,        setRole]        = useState("supporting");
  const [description, setDescription] = useState("");
  const [imageUrl,    setImageUrl]    = useState("");
  const [age,         setAge]         = useState("");
  const [gender,      setGender]      = useState("");
  const [abilities,   setAbilities]   = useState("");
  const [imgBusy,     setImgBusy]     = useState(false);

  // Заполняем из пришедшего персонажа
  useEffect(() => {
    if (!character) return;
    setName(character.name || "");
    setNameJp(character.name_jp || "");
    setRole(character.role || "supporting");
    setDescription(character.description || "");
    setImageUrl(character.image_url || "");
    setAge(character.age || "");
    setGender(character.gender || "");
    setAbilities(character.abilities || "");
  }, [character]);

  const handleImageFile = async e => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    setImgBusy(true);
    try { setImageUrl(await uploadAdminImage(f)); }
    catch (e2) { setErr(e2.message || "Ошибка загрузки изображения"); }
    finally { setImgBusy(false); }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setErr("");
    if (!name.trim()) { setErr("Укажите имя персонажа"); return; }
    setSaving(true);
    try {
      const r = await updateCharacter(character.id, {
        name: name.trim(),
        name_jp: nameJp.trim() || null,
        role,
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        age: age.trim() || null,
        gender: gender.trim() || null,
        abilities: abilities.trim() || null,
      });
      onSaved?.(r.character);
    } catch (e2) {
      setErr(e2.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {err && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)" }}>
          {err}
        </div>
      )}

      {/* Имя */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Имя *</label>
          <input required value={name} onChange={e => setName(e.target.value)}
            style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
        </div>
        <div>
          <label style={labelStyle}>Имя (яп.)</label>
          <input value={nameJp} onChange={e => setNameJp(e.target.value)}
            style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
        </div>
      </div>

      {/* Роль */}
      <div>
        <label style={labelStyle}>Роль персонажа (каталог)</label>
        <select value={role} onChange={e => setRole(e.target.value)}
          style={{ ...inputStyle, cursor: "pointer", maxWidth: "20rem" }}>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
        </select>
      </div>

      {/* Описание */}
      <div>
        <label style={labelStyle}>Описание</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          rows={4} style={{ ...inputStyle, resize: "vertical" }}
          onFocus={focusIn} onBlur={focusOut} />
      </div>

      {/* Изображение */}
      <div>
        <label style={labelStyle}>Портрет — ссылка</label>
        <input value={imageUrl} onChange={e => setImageUrl(e.target.value)}
          placeholder="https://…" style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
      </div>
      <div>
        <label style={labelStyle}>Портрет — загрузить файл</label>
        <input type="file" accept="image/*" disabled={imgBusy}
          className="text-sm w-full" style={{ color: "#9ca3af" }}
          onChange={handleImageFile} />
        {imgBusy && <p className="text-xs mt-1" style={{ color: "#6b7280" }}>Загрузка…</p>}
      </div>
      {imageUrl && (
        <div className="flex items-center gap-3">
          <img src={imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }} />
          <button type="button" onClick={() => setImageUrl("")}
            className="text-xs" style={{ color: "#f87171", background: "none", border: "none", cursor: "pointer" }}>
            Убрать фото
          </button>
        </div>
      )}

      {/* Характеристики */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label style={labelStyle}>Возраст</label>
          <input value={age} onChange={e => setAge(e.target.value)}
            placeholder="19" style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
        </div>
        <div>
          <label style={labelStyle}>Пол</label>
          <select value={gender} onChange={e => setGender(e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}>
            {GENDERS.map(g => (
              <option key={g || "none"} value={g}>
                {g === "" ? "— не указано —" : g === "М" ? "Мужской" : g === "Ж" ? "Женский" : g}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Способности</label>
          <input value={abilities} onChange={e => setAbilities(e.target.value)}
            style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
        </div>
      </div>

      {/* Кнопки */}
      <div className="flex flex-wrap gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{
            background: "linear-gradient(to right,#7c3aed,#a21caf)",
            opacity: saving ? 0.6 : 1,
            cursor: saving ? "not-allowed" : "pointer",
            border: "none",
          }}>
          {saving ? "Сохранение…" : "Сохранить изменения"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: "rgba(255,255,255,0.05)", color: "#9ca3af", border: "none", cursor: "pointer" }}>
            Отмена
          </button>
        )}
      </div>
    </form>
  );
}
