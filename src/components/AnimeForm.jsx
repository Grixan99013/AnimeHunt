// src/components/AnimeForm.jsx
import { useState, useEffect, useCallback } from "react";
import {
  STATUS_LABELS, TYPE_LABELS,
  createAnime, updateAnime, uploadAdminImage, fetchSeriesList,
} from "../api/api";

const STATUSES   = ["ongoing", "completed", "upcoming", "cancelled"];
const TYPES      = ["tv", "movie", "ova", "ona", "special"];
const AGE_RATINGS = ["", "G", "PG", "PG-13", "R-17", "R+"];

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

function dateInput(v) {
  if (v == null || v === "") return "";
  return String(v).length >= 10 ? String(v).slice(0, 10) : String(v);
}

// ── Блок секции (заголовок + контент) ─────────────────────────
function Section({ title, children }) {
  return (
    <div className="space-y-4">
      <p className="text-xs font-bold uppercase tracking-widest"
        style={{ color: "#6b7280", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.5rem" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

export default function AnimeForm({
  animeId,
  initial,
  genreList,
  studioList,
  onSaved,
  onCancel,
  submitAddLabel  = "Добавить на сайт",
  submitEditLabel = "Сохранить изменения",
  onAfterSave,
}) {
  const isEdit = Boolean(animeId);
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  // Основные поля
  const [title,       setTitle]       = useState("");
  const [titleEn,     setTitleEn]     = useState("");
  const [titleJp,     setTitleJp]     = useState("");
  const [synopsis,    setSynopsis]    = useState("");
  const [posterUrl,   setPosterUrl]   = useState("");
  const [bannerUrl,   setBannerUrl]   = useState("");
  const [status,      setStatus]      = useState("ongoing");
  const [type,        setType]        = useState("tv");
  const [episodes,    setEpisodes]    = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [airedFrom,   setAiredFrom]   = useState("");
  const [airedTo,     setAiredTo]     = useState("");
  const [studioId,    setStudioId]    = useState("");
  const [studioNewName, setStudioNewName] = useState("");
  const [isNew,       setIsNew]       = useState(false);
  const [seasonNum,   setSeasonNum]   = useState("");
  const [ageRating,   setAgeRating]   = useState("");
  const [genreIds,    setGenreIds]    = useState(() => new Set());
  const [themesText,  setThemesText]  = useState("");
  const [posterBusy,  setPosterBusy]  = useState(false);
  const [bannerBusy,  setBannerBusy]  = useState(false);

  // Серия
  const [seriesList,   setSeriesList]   = useState([]);   // [{id, title, entries:[]}]
  const [seriesMode,   setSeriesMode]   = useState("none");  // "none"|"existing"|"new"
  const [seriesId,     setSeriesId]     = useState("");
  const [seriesTitle,  setSeriesTitle]  = useState("");
  const [seriesDesc,   setSeriesDesc]   = useState("");
  const [sortOrder,    setSortOrder]    = useState("");
  const [seriesLoading, setSeriesLoading] = useState(false);

  // Загрузка списка серий
  const loadSeries = useCallback(async () => {
    setSeriesLoading(true);
    try { setSeriesList(await fetchSeriesList()); }
    catch {} finally { setSeriesLoading(false); }
  }, []);

  useEffect(() => { loadSeries(); }, [loadSeries]);

  // Заполнение формы при редактировании
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

  // Жанры из initial
  useEffect(() => {
    if (!initial || !genreList?.length) return;
    const names = Array.isArray(initial.genres) ? initial.genres : [];
    setGenreIds(new Set(genreList.filter(g => names.includes(g.name)).map(g => g.id)));
  }, [initial, genreList]);

  // Серия из initial
  useEffect(() => {
    if (!initial || !seriesList.length) return;
    const ser = initial.series;
    if (ser?.series_id) {
      setSeriesMode("existing");
      setSeriesId(String(ser.series_id));
      // sort_order текущего аниме в серии
      const entry = ser.entries?.find(e => String(e.id) === String(animeId));
      if (entry) setSortOrder(String(seriesList.find(s => s.id === ser.series_id)
        ?.entries?.findIndex(e => e.id === entry.id) + 1 || ""));
    }
  }, [initial, seriesList, animeId]);

  const toggleGenre = id => {
    setGenreIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const buildBody = () => {
    const themes = themesText.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
    const body = {
      title:       title.trim(),
      title_en:    titleEn.trim() || null,
      title_jp:    titleJp.trim() || null,
      synopsis:    synopsis.trim() || null,
      poster_url:  posterUrl.trim() || null,
      banner_url:  bannerUrl.trim() || null,
      status,
      type,
      episodes:    episodes === "" ? null : Number(episodes),
      duration_min: durationMin === "" ? null : Number(durationMin),
      aired_from:  airedFrom || null,
      aired_to:    airedTo || null,
      is_new:      isNew,
      season_num:  seasonNum === "" ? null : Number(seasonNum),
      age_rating:  ageRating || null,
      genre_ids:   [...genreIds],
      themes,
    };
    if (studioNewName.trim()) body.studio_new_name = studioNewName.trim();
    else body.studio_id = studioId === "" ? null : Number(studioId);

    // Серия
    if (seriesMode === "none") {
      body.series = { mode: "none" };
    } else if (seriesMode === "existing" && seriesId) {
      body.series = {
        mode:       "existing",
        series_id:  Number(seriesId),
        sort_order: sortOrder !== "" ? Number(sortOrder) : 99,
      };
    } else if (seriesMode === "new" && seriesTitle.trim()) {
      body.series = {
        mode:               "new",
        series_title:       seriesTitle.trim(),
        series_description: seriesDesc.trim() || null,
        sort_order:         sortOrder !== "" ? Number(sortOrder) : 99,
      };
    }

    return body;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setErr("");
    if (!title.trim()) { setErr("Укажите название"); return; }
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

  // Превью постера выбранной серии
  const selectedSeries = seriesList.find(s => String(s.id) === seriesId);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {err && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.25)" }}>
          {err}
        </div>
      )}

      {/* ── Основная информация ────────────────────────────── */}
      <Section title="Основная информация">
        <div>
          <label style={labelStyle}>Название *</label>
          <input required value={title} onChange={e => setTitle(e.target.value)}
            style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>Название (англ.)</label>
            <input value={titleEn} onChange={e => setTitleEn(e.target.value)}
              style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
          </div>
          <div>
            <label style={labelStyle}>Название (яп.)</label>
            <input value={titleJp} onChange={e => setTitleJp(e.target.value)}
              style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Описание</label>
          <textarea value={synopsis} onChange={e => setSynopsis(e.target.value)}
            rows={5} style={{ ...inputStyle, resize: "vertical" }}
            onFocus={focusIn} onBlur={focusOut} />
        </div>
      </Section>

      {/* ── Изображения ────────────────────────────────────── */}
      <Section title="Изображения">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label style={labelStyle}>Постер — ссылка или файл</label>
            <input value={posterUrl} onChange={e => setPosterUrl(e.target.value)}
              style={inputStyle} placeholder="https://…" onFocus={focusIn} onBlur={focusOut} />
            <input type="file" accept="image/*" disabled={posterBusy}
              className="text-xs w-full" style={{ color: "#9ca3af" }}
              onChange={async e => {
                const f = e.target.files?.[0]; e.target.value = "";
                if (!f) return; setPosterBusy(true);
                try { setPosterUrl(await uploadAdminImage(f)); }
                catch (e2) { setErr(e2.message || "Ошибка загрузки постера"); }
                finally { setPosterBusy(false); }
              }} />
            {posterUrl && (
              <img src={posterUrl} alt="" className="w-20 h-28 rounded-lg object-cover mt-1"
                style={{ border: "1px solid rgba(255,255,255,0.1)" }} />
            )}
          </div>
          <div className="space-y-2">
            <label style={labelStyle}>Баннер — ссылка или файл</label>
            <input value={bannerUrl} onChange={e => setBannerUrl(e.target.value)}
              style={inputStyle} placeholder="https://…" onFocus={focusIn} onBlur={focusOut} />
            <input type="file" accept="image/*" disabled={bannerBusy}
              className="text-xs w-full" style={{ color: "#9ca3af" }}
              onChange={async e => {
                const f = e.target.files?.[0]; e.target.value = "";
                if (!f) return; setBannerBusy(true);
                try { setBannerUrl(await uploadAdminImage(f)); }
                catch (e2) { setErr(e2.message || "Ошибка загрузки баннера"); }
                finally { setBannerBusy(false); }
              }} />
            {bannerUrl && (
              <img src={bannerUrl} alt="" className="w-full max-h-24 rounded-lg object-cover mt-1"
                style={{ border: "1px solid rgba(255,255,255,0.1)" }} />
            )}
          </div>
        </div>
      </Section>

      {/* ── Параметры ──────────────────────────────────────── */}
      <Section title="Параметры">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>Статус</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Тип</label>
            <select value={type} onChange={e => setType(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}>
              {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>Эпизоды</label>
            <input type="number" min={0} value={episodes} onChange={e => setEpisodes(e.target.value)}
              style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
          </div>
          <div>
            <label style={labelStyle}>Длительность эпизода (мин.)</label>
            <input type="number" min={0} value={durationMin} onChange={e => setDurationMin(e.target.value)}
              style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}>Начало показа</label>
            <input type="date" value={airedFrom} onChange={e => setAiredFrom(e.target.value)}
              style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Конец показа</label>
            <input type="date" value={airedTo} onChange={e => setAiredTo(e.target.value)}
              style={inputStyle} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Возрастной рейтинг</label>
          <select value={ageRating} onChange={e => setAgeRating(e.target.value)}
            style={{ ...inputStyle, cursor: "pointer", maxWidth: "20rem" }}>
            {AGE_RATINGS.map(a => <option key={a || "none"} value={a}>{a || "— не указано —"}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: "#d1d5db" }}>
            <input type="checkbox" checked={isNew} onChange={e => setIsNew(e.target.checked)} />
            Новинка
          </label>
          <div className="flex items-center gap-2">
            <span style={{ ...labelStyle, marginBottom: 0 }}>Номер сезона</span>
            <input type="number" min={0} value={seasonNum} onChange={e => setSeasonNum(e.target.value)}
              className="w-24 rounded-lg px-3 py-2 text-sm text-white outline-none"
              style={{ backgroundColor: "#0d0f14", border: "1px solid rgba(255,255,255,0.1)" }}
              onFocus={focusIn} onBlur={focusOut} />
          </div>
        </div>
      </Section>

      {/* ── Студия ─────────────────────────────────────────── */}
      <Section title="Студия">
        <div>
          <label style={labelStyle}>Студия из списка</label>
          <select value={studioId}
            onChange={e => { setStudioId(e.target.value); setStudioNewName(""); }}
            disabled={Boolean(studioNewName.trim())}
            style={{ ...inputStyle, cursor: "pointer", opacity: studioNewName.trim() ? 0.5 : 1 }}>
            <option value="">— не указано —</option>
            {studioList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Или новая студия (если нет в списке)</label>
          <input value={studioNewName}
            onChange={e => { setStudioNewName(e.target.value); if (e.target.value.trim()) setStudioId(""); }}
            placeholder="Название — будет создана или найдена по имени"
            style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
        </div>
      </Section>

      {/* ── Привязка к серии ───────────────────────────────── */}
      <Section title="Серия (цикл сезонов)">
        {/* Переключатель режима */}
        <div className="flex flex-wrap gap-2">
          {[
            { v: "none",     label: "Без серии" },
            { v: "existing", label: "Существующая серия" },
            { v: "new",      label: "Создать новую серию" },
          ].map(opt => (
            <button key={opt.v} type="button" onClick={() => setSeriesMode(opt.v)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: seriesMode === opt.v ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.05)",
                color:      seriesMode === opt.v ? "#c4b5fd" : "#9ca3af",
                border:     seriesMode === opt.v ? "1px solid rgba(139,92,246,0.4)" : "1px solid transparent",
                cursor:     "pointer",
              }}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Существующая серия */}
        {seriesMode === "existing" && (
          <div className="space-y-3 rounded-xl p-4"
            style={{ backgroundColor: "#0d0f14", border: "1px solid rgba(139,92,246,0.2)" }}>
            <div>
              <label style={labelStyle}>Выберите серию</label>
              {seriesLoading ? (
                <p className="text-xs" style={{ color: "#6b7280" }}>Загрузка…</p>
              ) : (
                <select value={seriesId} onChange={e => setSeriesId(e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">— выберите серию —</option>
                  {seriesList.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Показываем текущий состав серии */}
            {selectedSeries && (
              <div className="rounded-lg p-3 space-y-2"
                style={{ backgroundColor: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}>
                <p className="text-xs font-semibold" style={{ color: "#a78bfa" }}>
                  Текущий состав серии «{selectedSeries.title}»:
                </p>
                <div className="space-y-1">
                  {(selectedSeries.entries || []).map((entry, idx) => (
                    <div key={entry.id} className="flex items-center gap-2 text-xs"
                      style={{ color: String(entry.id) === String(animeId) ? "#c4b5fd" : "#9ca3af" }}>
                      <span style={{ color: "#6b7280", minWidth: "16px" }}>{idx + 1}.</span>
                      <span>{entry.title}</span>
                      {entry.season_num && (
                        <span className="px-1.5 rounded"
                          style={{ backgroundColor: "rgba(251,191,36,0.15)", color: "#fde68a" }}>
                          С{entry.season_num}
                        </span>
                      )}
                      {String(entry.id) === String(animeId) && (
                        <span style={{ color: "#c4b5fd" }}>(этот тайтл)</span>
                      )}
                    </div>
                  ))}
                  {/* Новая запись */}
                  {!animeId && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: "#34d399" }}>
                      <span style={{ color: "#6b7280", minWidth: "16px" }}>+</span>
                      <span>{title || "Новый тайтл"}</span>
                      <span style={{ color: "#34d399" }}>(будет добавлен)</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label style={labelStyle}>Порядок в серии (sort_order)</label>
              <input type="number" min={1} value={sortOrder} onChange={e => setSortOrder(e.target.value)}
                placeholder="Например: 2 (для второго сезона)"
                style={{ ...inputStyle, maxWidth: "160px" }} onFocus={focusIn} onBlur={focusOut} />
              <p className="text-xs mt-1" style={{ color: "#4b5563" }}>
                Определяет порядок отображения частей серии. 1 = первый сезон.
              </p>
            </div>
          </div>
        )}

        {/* Новая серия */}
        {seriesMode === "new" && (
          <div className="space-y-3 rounded-xl p-4"
            style={{ backgroundColor: "#0d0f14", border: "1px solid rgba(139,92,246,0.2)" }}>
            <div>
              <label style={labelStyle}>Название серии *</label>
              <input value={seriesTitle} onChange={e => setSeriesTitle(e.target.value)}
                placeholder="Например: «Атака Титанов»"
                style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div>
              <label style={labelStyle}>Описание серии</label>
              <textarea value={seriesDesc} onChange={e => setSeriesDesc(e.target.value)}
                rows={2} placeholder="Краткое описание цикла (необязательно)"
                style={{ ...inputStyle, resize: "vertical" }} onFocus={focusIn} onBlur={focusOut} />
            </div>
            <div>
              <label style={labelStyle}>Порядок этого тайтла в серии</label>
              <input type="number" min={1} value={sortOrder} onChange={e => setSortOrder(e.target.value)}
                placeholder="1" style={{ ...inputStyle, maxWidth: "160px" }}
                onFocus={focusIn} onBlur={focusOut} />
            </div>
          </div>
        )}

        {seriesMode === "none" && (
          <p className="text-xs" style={{ color: "#4b5563" }}>
            Тайтл будет отдельным произведением, не связанным с серией.
          </p>
        )}
      </Section>

      {/* ── Жанры ─────────────────────────────────────────── */}
      {genreList.length > 0 && (
        <Section title="Жанры">
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto rounded-xl p-3"
            style={{ background: "#0d0f14", border: "1px solid rgba(255,255,255,0.06)" }}>
            {genreList.map(g => (
              <button key={g.id} type="button" onClick={() => toggleGenre(g.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  background: genreIds.has(g.id) ? "rgba(217,70,239,0.2)" : "rgba(255,255,255,0.05)",
                  color:      genreIds.has(g.id) ? "#e879f9" : "#9ca3af",
                  border:     genreIds.has(g.id) ? "1px solid rgba(217,70,239,0.35)" : "1px solid transparent",
                  cursor:     "pointer",
                }}>
                {g.name}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* ── Темы ──────────────────────────────────────────── */}
      <Section title="Темы">
        <div>
          <label style={labelStyle}>Темы (через запятую)</label>
          <textarea value={themesText} onChange={e => setThemesText(e.target.value)}
            rows={2} placeholder="школа, романтика, …"
            style={{ ...inputStyle, resize: "vertical" }} onFocus={focusIn} onBlur={focusOut} />
        </div>
      </Section>

      {/* ── Кнопки ────────────────────────────────────────── */}
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
