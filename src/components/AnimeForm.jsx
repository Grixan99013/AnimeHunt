// src/components/AnimeForm.jsx
import { useState, useEffect } from "react";
import {
  STATUS_LABELS, TYPE_LABELS, createAnime, updateAnime, uploadAdminImage,
} from "../api/api";

const STATUSES = ["ongoing", "completed", "upcoming", "cancelled"];
const TYPES = ["tv", "movie", "ova", "ona", "special"];
const AGE_RATINGS = ["", "G", "PG", "PG-13", "R-17", "R+"];

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

function dateInput(v) {
  if (v == null || v === "") return "";
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export default function AnimeForm({
  animeId,
  initial,
  genreList,
  studioList,
  onSaved,
  onCancel,
  submitAddLabel = "Добавить на сайт",
  submitEditLabel = "Сохранить изменения",
  onAfterSave,
}) {
  const isEdit = Boolean(animeId);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [title, setTitle] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [titleJp, setTitleJp] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [status, setStatus] = useState("ongoing");
  const [type, setType] = useState("tv");
  const [episodes, setEpisodes] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [airedFrom, setAiredFrom] = useState("");
  const [airedTo, setAiredTo] = useState("");
  const [studioId, setStudioId] = useState("");
  const [studioNewName, setStudioNewName] = useState("");
  const [posterBusy, setPosterBusy] = useState(false);
  const [bannerBusy, setBannerBusy] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [seasonNum, setSeasonNum] = useState("");
  const [ageRating, setAgeRating] = useState("");
  const [genreIds, setGenreIds] = useState(() => new Set());
  const [themesText, setThemesText] = useState("");

  useEffect(() => {
    if (!initial) return;
    setTitle(initial.title || "");
    setTitleEn(initial.title_en || "");
    setTitleJp(initial.title_jp || "");
    setSynopsis(initial.synopsis || "");
    setPosterUrl(initial.poster_url || "");
    setBannerUrl(initial.banner_url || "");
    setStatus(initial.status || "ongoing");
    setType(initial.type || "tv");
    setEpisodes(initial.episodes != null ? String(initial.episodes) : "");
    setDurationMin(initial.duration_min != null ? String(initial.duration_min) : "");
    setAiredFrom(dateInput(initial.aired_from));
    setAiredTo(dateInput(initial.aired_to));
    setStudioId(initial.studio_id != null ? String(initial.studio_id) : "");
    setStudioNewName("");
    setIsNew(Boolean(initial.is_new));
    setSeasonNum(initial.season_num != null ? String(initial.season_num) : "");
    setAgeRating(initial.age_rating || "");
    const th = Array.isArray(initial.themes) ? initial.themes : [];
    setThemesText(th.join(", "));
  }, [initial]);

  useEffect(() => {
    if (!initial || !genreList?.length) return;
    const names = Array.isArray(initial.genres) ? initial.genres : [];
    const ids = new Set(genreList.filter(g => names.includes(g.name)).map(g => g.id));
    setGenreIds(ids);
  }, [initial, genreList]);

  const toggleGenre = (id) => {
    setGenreIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const buildBody = () => {
    const themes = themesText
      .split(/[,;\n]/)
      .map(s => s.trim())
      .filter(Boolean);
    const body = {
      title: title.trim(),
      title_en: titleEn.trim() || null,
      title_jp: titleJp.trim() || null,
      synopsis: synopsis.trim() || null,
      poster_url: posterUrl.trim() || null,
      banner_url: bannerUrl.trim() || null,
      status,
      type,
      episodes: episodes === "" ? null : Number(episodes),
      duration_min: durationMin === "" ? null : Number(durationMin),
      aired_from: airedFrom || null,
      aired_to: airedTo || null,
      is_new: isNew,
      season_num: seasonNum === "" ? null : Number(seasonNum),
      age_rating: ageRating || null,
      genre_ids: [...genreIds],
      themes,
    };
    if (studioNewName.trim()) body.studio_new_name = studioNewName.trim();
    else body.studio_id = studioId === "" ? null : Number(studioId);
    return body;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setErr("");
    if (!title.trim()) {
      setErr("Укажите название");
      return;
    }
    setSaving(true);
    try {
      const body = buildBody();
      if (isEdit) {
        await updateAnime(animeId, body);
        await onAfterSave?.();
        onSaved?.({ id: animeId });
      } else {
        const r = await createAnime(body);
        await onAfterSave?.();
        onSaved?.(r);
      }
    } catch (e2) {
      setErr(e2.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {err && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)" }}>
          {err}
        </div>
      )}

      <div>
        <label style={labelStyle}>Название *</label>
        <input required value={title} onChange={e => setTitle(e.target.value)} style={inputStyle}
          onFocus={e => { e.target.style.borderColor = "rgba(139,92,246,0.4)"; }}
          onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Название (англ.)</label>
          <input value={titleEn} onChange={e => setTitleEn(e.target.value)} style={inputStyle}
            onFocus={e => { e.target.style.borderColor = "rgba(139,92,246,0.4)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
        </div>
        <div>
          <label style={labelStyle}>Название (яп.)</label>
          <input value={titleJp} onChange={e => setTitleJp(e.target.value)} style={inputStyle}
            onFocus={e => { e.target.style.borderColor = "rgba(139,92,246,0.4)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Описание</label>
        <textarea value={synopsis} onChange={e => setSynopsis(e.target.value)} rows={5} style={{ ...inputStyle, resize: "vertical" }}
          onFocus={e => { e.target.style.borderColor = "rgba(139,92,246,0.4)"; }}
          onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label style={labelStyle}>Постер — ссылка или файл</label>
          <input value={posterUrl} onChange={e => setPosterUrl(e.target.value)} style={inputStyle}
            placeholder="https://…"
            onFocus={e => { e.target.style.borderColor = "rgba(139,92,246,0.4)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
          <input type="file" accept="image/*" disabled={posterBusy}
            className="text-xs w-full"
            style={{ color: "#9ca3af" }}
            onChange={async e => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setPosterBusy(true);
              try {
                const url = await uploadAdminImage(f);
                setPosterUrl(url);
              } catch (e2) {
                setErr(e2.message || "Ошибка загрузки постера");
              } finally {
                setPosterBusy(false);
              }
            }} />
          {posterUrl && (
            <img src={posterUrl} alt="" className="w-20 h-28 rounded-lg object-cover mt-1"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }} />
          )}
        </div>
        <div className="space-y-2">
          <label style={labelStyle}>Баннер — ссылка или файл</label>
          <input value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} style={inputStyle}
            placeholder="https://…"
            onFocus={e => { e.target.style.borderColor = "rgba(139,92,246,0.4)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
          <input type="file" accept="image/*" disabled={bannerBusy}
            className="text-xs w-full"
            style={{ color: "#9ca3af" }}
            onChange={async e => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setBannerBusy(true);
              try {
                const url = await uploadAdminImage(f);
                setBannerUrl(url);
              } catch (e2) {
                setErr(e2.message || "Ошибка загрузки баннера");
              } finally {
                setBannerBusy(false);
              }
            }} />
          {bannerUrl && (
            <img src={bannerUrl} alt="" className="w-full max-h-24 rounded-lg object-cover mt-1"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Статус</label>
          <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            {STATUSES.map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Тип</label>
          <select value={type} onChange={e => setType(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            {TYPES.map(t => (
              <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Эпизоды</label>
          <input type="number" min={0} value={episodes} onChange={e => setEpisodes(e.target.value)} style={inputStyle}
            onFocus={e => { e.target.style.borderColor = "rgba(139,92,246,0.4)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
        </div>
        <div>
          <label style={labelStyle}>Длительность эпизода (мин.)</label>
          <input type="number" min={0} value={durationMin} onChange={e => setDurationMin(e.target.value)} style={inputStyle}
            onFocus={e => { e.target.style.borderColor = "rgba(139,92,246,0.4)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Начало показа</label>
          <input type="date" value={airedFrom} onChange={e => setAiredFrom(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Конец показа</label>
          <input type="date" value={airedTo} onChange={e => setAiredTo(e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label style={labelStyle}>Студия из списка</label>
          <select
            value={studioId}
            onChange={e => {
              setStudioId(e.target.value);
              setStudioNewName("");
            }}
            disabled={Boolean(studioNewName.trim())}
            style={{ ...inputStyle, cursor: "pointer", opacity: studioNewName.trim() ? 0.5 : 1 }}>
            <option value="">— не указано —</option>
            {studioList.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Или новая студия (если нет в списке)</label>
          <input
            value={studioNewName}
            onChange={e => {
              setStudioNewName(e.target.value);
              if (e.target.value.trim()) setStudioId("");
            }}
            placeholder="Название студии — будет создана или найдена по имени"
            style={inputStyle}
            onFocus={e => { e.target.style.borderColor = "rgba(139,92,246,0.4)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
          <p className="text-xs mt-1" style={{ color: "#6b7280" }}>
            Если заполнено, выбор из списка не используется.
          </p>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Возрастной рейтинг</label>
        <select value={ageRating} onChange={e => setAgeRating(e.target.value)} style={{ ...inputStyle, cursor: "pointer", maxWidth: "20rem" }}>
          {AGE_RATINGS.map(a => (
            <option key={a || "none"} value={a}>{a || "— не указано —"}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: "#d1d5db" }}>
          <input type="checkbox" checked={isNew} onChange={e => setIsNew(e.target.checked)} className="rounded" />
          Новинка
        </label>
        <div className="flex items-center gap-2">
          <span style={{ ...labelStyle, marginBottom: 0 }}>Номер сезона</span>
          <input type="number" min={0} value={seasonNum} onChange={e => setSeasonNum(e.target.value)}
            className="w-24 rounded-lg px-3 py-2 text-sm text-white outline-none"
            style={{ backgroundColor: "#0d0f14", border: "1px solid rgba(255,255,255,0.1)" }} />
        </div>
      </div>

      {genreList.length > 0 && (
        <div>
          <p style={labelStyle}>Жанры</p>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto rounded-xl p-3"
            style={{ background: "#0d0f14", border: "1px solid rgba(255,255,255,0.06)" }}>
            {genreList.map(g => (
              <button key={g.id} type="button" onClick={() => toggleGenre(g.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  background: genreIds.has(g.id) ? "rgba(217,70,239,0.2)" : "rgba(255,255,255,0.05)",
                  color: genreIds.has(g.id) ? "#e879f9" : "#9ca3af",
                  border: genreIds.has(g.id) ? "1px solid rgba(217,70,239,0.35)" : "1px solid transparent",
                  cursor: "pointer",
                }}>
                {g.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label style={labelStyle}>Темы (через запятую)</label>
        <textarea value={themesText} onChange={e => setThemesText(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }}
          placeholder="школа, романтика, …"
          onFocus={e => { e.target.style.borderColor = "rgba(139,92,246,0.4)"; }}
          onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }} />
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{
            background: "linear-gradient(to right,#7c3aed,#a21caf)",
            opacity: saving ? 0.6 : 1,
            cursor: saving ? "not-allowed" : "pointer",
            border: "none",
          }}>
          {saving ? "Сохранение…" : (isEdit ? submitEditLabel : submitAddLabel)}
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
