// src/pages/Catalog.jsx
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchAnimeList, fetchGenres, fetchStudios, fetchThemes } from "../api/api";
import AnimeCard from "../components/AnimeCard";
import { AnimeGridSkeleton } from "../components/Skeleton";
import { usePageMeta } from "../hooks/usePageMeta";

const STATUSES  = ["all","ongoing","completed","upcoming"];
const STATUS_RU = { all:"Все", ongoing:"Выходит", completed:"Завершено", upcoming:"Анонс" };
const TYPES     = ["all","tv","movie","ova","ona"];
const TYPE_RU   = { all:"Все", tv:"ТВ", movie:"Фильм", ova:"OVA", ona:"ONA" };
const SORTS     = [
  { value:"rating", label:"По оценке" },
  { value:"newest", label:"Новые" },
  { value:"title",  label:"А → Я" },
];

const btnOn  = { background:"rgba(139,92,246,0.25)", color:"#c4b5fd", border:"1px solid rgba(139,92,246,0.4)" };
const btnOff = { background:"var(--bg-elevated)", color:"var(--text-muted)", border:"1px solid var(--border)" };
const gOn    = { background:"rgba(217,70,239,0.2)", color:"#e879f9", border:"1px solid rgba(217,70,239,0.35)" };
const gOff   = { background:"var(--bg-elevated)", color:"var(--text-muted)", border:"1px solid var(--border)" };
const sOn    = { background:"rgba(251,191,36,0.2)", color:"#d97706", border:"1px solid rgba(251,191,36,0.35)" };
const sOff   = { background:"var(--bg-elevated)", color:"var(--text-muted)", border:"1px solid var(--border)" };
const thOn   = { background:"rgba(99,102,241,0.2)", color:"#6366f1", border:"1px solid rgba(99,102,241,0.35)" };
const thOff  = { background:"var(--bg-elevated)", color:"var(--text-muted)", border:"1px solid var(--border)" };

export default function Catalog() {
  const [searchParams] = useSearchParams();
  const [query,     setQuery]     = useState(searchParams.get("q")      || "");
  const [status,    setStatus]    = useState(searchParams.get("status") || "all");
  const [type,      setType]      = useState(searchParams.get("type")   || "all");
  const [sort,      setSort]      = useState(searchParams.get("sort")   || "newest");
  const [selGenres, setSelGenres] = useState(
    searchParams.get("genre") ? [searchParams.get("genre")] : []
  );
  const [selStudio, setSelStudio] = useState(searchParams.get("studio") || "");
  const [selTheme,  setSelTheme]  = useState(searchParams.get("theme")  || "");
  const [selYear,   setSelYear]   = useState(searchParams.get("season_year")    || "");
  const [selQuarter,setSelQuarter]= useState(searchParams.get("season_quarter") || "");
  const [showFilters, setShowFilters] = useState(
    // авто-раскрыть фильтры если пришли с активным фильтром
    !!(searchParams.get("studio") || searchParams.get("theme") ||
       searchParams.get("status") || searchParams.get("type") || searchParams.get("genre") ||
       searchParams.get("season_year") || searchParams.get("season_quarter"))
  );

  const [animeList, setAnimeList] = useState([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [genres,    setGenres]    = useState([]);
  const [studios,   setStudios]   = useState([]);
  const [themes,    setThemes]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  const PAGE_SIZE = 24;

  const isNew = searchParams.get("is_new") === "true";
  usePageMeta("Каталог аниме");

  // Загрузка жанров и студий один раз
  useEffect(() => {
    fetchGenres().then(setGenres).catch(() => {});
    fetchStudios().then(setStudios).catch(() => {});
    fetchThemes().then(setThemes).catch(() => {});
  }, []);

  const load = useCallback((p = page) => {
    setLoading(true);
    setError("");
    const params = {
      sort,
      limit: PAGE_SIZE,
      offset: (p - 1) * PAGE_SIZE,
      ...(query     && { q: query }),
      ...(status !== "all" && { status }),
      ...(type   !== "all" && { type }),
      ...(selGenres.length === 1 && { genre: selGenres[0] }),
      ...(selStudio && { studio: selStudio }),
      ...(selTheme && { theme: selTheme }),
      ...(selYear    && { season_year: selYear }),
      ...(selQuarter && { season_quarter: selQuarter }),
    };
    fetchAnimeList(params)
      .then(res => {
        let items = Array.isArray(res) ? res : (res.items || []);
        let tot   = Array.isArray(res) ? items.length : (res.total || 0);
        if (selGenres.length > 1) {
          items = items.filter(a =>
            selGenres.every(g => Array.isArray(a.genres) && a.genres.includes(g))
          );
        }
        setAnimeList(items);
        setTotal(tot);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, status, type, sort, selGenres, selStudio, selTheme, selYear, selQuarter, page]);

  useEffect(() => { load(); }, [load]);

  // Сброс страницы при смене фильтров
  const resetPage = () => setPage(1);

  const toggleGenre = (name) =>
    setSelGenres(prev => prev.includes(name) ? prev.filter(g => g !== name) : [...prev, name]);

  const activeCount =
    selGenres.length +
    (status !== "all" ? 1 : 0) +
    (type   !== "all" ? 1 : 0) +
    (selStudio ? 1 : 0) +
    (selTheme  ? 1 : 0) +
    (selYear   ? 1 : 0);

  const resetFilters = () => {
    setStatus("all"); setType("all"); setSelGenres([]); setQuery(""); setSelStudio(""); setSelTheme(""); setSelYear(""); setSelQuarter(""); setPage(1);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black" style={{ color:"var(--text-primary)" }}>{isNew ? "Новинки" : "Каталог аниме"}</h1>
        <p className="text-sm mt-1" style={{ color:"var(--text-faint)" }}>
          {loading ? "Загрузка…" : `Найдено тайтлов: ${total} • Страница ${page} из ${totalPages || 1}`}
        </p>
      </div>

      {/* Поиск + сортировка */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color:"#6b7280" }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Поиск…"
            className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none"
            style={{ backgroundColor:"var(--bg-surface)", border:"1px solid var(--border)", color:"var(--text-primary)" }}
            onFocus={e => e.target.style.borderColor="rgba(139,92,246,0.4)"}
            onBlur={e => e.target.style.borderColor="rgba(255,255,255,0.1)"} />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="rounded-xl px-3 py-2.5 text-sm outline-none"
          style={{ backgroundColor:"var(--bg-surface)", border:"1px solid var(--border)", color:"var(--text-primary)" }}>
          {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2.5 rounded-xl text-sm font-medium"
          style={showFilters
            ? { background:"rgba(139,92,246,0.2)", border:"1px solid rgba(139,92,246,0.4)", color:"#c4b5fd", cursor:"pointer" }
            : { backgroundColor:"var(--bg-surface)", border:"1px solid var(--border)", color:"var(--text-muted)", cursor:"pointer" }}>
          Фильтры{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
      </div>

      {/* Фильтры */}
      {showFilters && (
        <div className="rounded-2xl p-5 space-y-5"
          style={{ backgroundColor:"var(--bg-surface)", border:"1px solid var(--border)" }}>

          <FG label="Статус">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={status === s ? btnOn : btnOff}>{STATUS_RU[s]}</button>
            ))}
          </FG>

          <FG label="Тип">
            {TYPES.map(t => (
              <button key={t} onClick={() => setType(t)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={type === t ? btnOn : btnOff}>{TYPE_RU[t]}</button>
            ))}
          </FG>

          {/* Студия */}
          {studios.length > 0 && (
            <FG label="Студия">
              <button onClick={() => setSelStudio("")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={selStudio === "" ? btnOn : btnOff}>Все</button>
              {studios.map(s => (
                <button key={s.id} onClick={() => setSelStudio(s.name === selStudio ? "" : s.name)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={selStudio === s.name ? sOn : sOff}>
                  {s.name}
                  {s.anime_count > 0 && (
                    <span className="ml-1.5 opacity-60">({s.anime_count})</span>
                  )}
                </button>
              ))}
            </FG>
          )}

          {/* Жанры */}
          {genres.length > 0 && (
            <FG label="Жанры">
              {genres.map(g => (
                <button key={g.id} onClick={() => toggleGenre(g.name)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={selGenres.includes(g.name) ? gOn : gOff}>{g.name}</button>
              ))}
            </FG>
          )}

          {/* Тема */}
          {themes.length > 0 && (
            <FG label="Тема">
              <button onClick={() => setSelTheme("")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={selTheme === "" ? thOn : thOff}>Все</button>
              {themes.map(t => (
                <button key={t.name} onClick={() => setSelTheme(t.name === selTheme ? "" : t.name)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={selTheme === t.name ? thOn : thOff}>
                  {t.name}
                  {t.anime_count > 0 && (
                    <span className="ml-1.5 opacity-60">({t.anime_count})</span>
                  )}
                </button>
              ))}
            </FG>
          )}

          {/* Сезон выхода */}
          <FG label="Год выхода">
            {["", ...Array.from({ length: 15 }, (_, i) => String(new Date().getFullYear() - i))].map(y => (
              <button key={y || "any"} onClick={() => { setSelYear(y); setSelQuarter(""); resetPage(); }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={selYear === y
                  ? { background: "rgba(234,179,8,0.18)", color: "#fbbf24", border: "1px solid rgba(234,179,8,0.4)" }
                  : { background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                {y || "Все годы"}
              </button>
            ))}
          </FG>

          {selYear && (
            <FG label="Сезон">
              {[
                { v: "", l: "Весь год" },
                { v: "1", l: "❄ Зима" },
                { v: "2", l: "🌸 Весна" },
                { v: "3", l: "☀ Лето" },
                { v: "4", l: "🍂 Осень" },
              ].map(({ v, l }) => (
                <button key={v || "all"} onClick={() => { setSelQuarter(v); resetPage(); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={selQuarter === v
                    ? { background: "rgba(234,179,8,0.18)", color: "#fbbf24", border: "1px solid rgba(234,179,8,0.4)" }
                    : { background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                  {l}
                </button>
              ))}
            </FG>
          )}

          <button onClick={resetFilters}
            style={{ background:"transparent", border:"none", color:"var(--text-faint)", cursor:"pointer", fontSize:"0.75rem" }}>
            Сбросить фильтры
          </button>
        </div>
      )}

      {/* Активные фильтры — теги */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {status !== "all" && (
            <FilterTag label={STATUS_RU[status]} onRemove={() => setStatus("all")} />
          )}
          {type !== "all" && (
            <FilterTag label={TYPE_RU[type]} onRemove={() => setType("all")} />
          )}
          {selStudio && (
            <FilterTag label={selStudio} onRemove={() => setSelStudio("")} color="amber" />
          )}
          {selTheme && (
            <FilterTag label={selTheme} onRemove={() => setSelTheme("")} color="indigo" />
          )}
          {selYear && (
            <FilterTag
              label={selQuarter
                ? `${["","Зима","Весна","Лето","Осень"][+selQuarter]} ${selYear}`
                : selYear}
              onRemove={() => { setSelYear(""); setSelQuarter(""); }}
              color="yellow"
            />
          )}
          {selGenres.map(g => (
            <FilterTag key={g} label={g} onRemove={() => toggleGenre(g)} color="fuchsia" />
          ))}
        </div>
      )}

      {/* Результаты */}
      {error ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-sm mb-3" style={{ color:"var(--danger)" }}>{error}</p>
          <button onClick={load} className="text-sm px-4 py-2 rounded-xl"
            style={{ background:"rgba(139,92,246,0.2)", color:"#c4b5fd", border:"none", cursor:"pointer" }}>
            Повторить
          </button>
        </div>
      ) : loading ? (
        <AnimeGridSkeleton count={24} />
      ) : animeList.length === 0 ? (
        <div className="text-center py-24" style={{ color:"var(--text-veryfaint)" }}>
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-sm">Ничего не найдено</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {animeList.map(a => <AnimeCard key={a.id} anime={a} />)}
          </div>
          {totalPages > 1 && (
            <Pagination page={page} total={totalPages} onChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
          )}
        </>
      )}
    </div>
  );
}

function Pagination({ page, total, onChange }) {
  const pages = [];
  const delta = 2;
  const left  = Math.max(1, page - delta);
  const right = Math.min(total, page + delta);
  if (left > 1)     pages.push(1, left > 2 ? "…" : null);
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total) pages.push(right < total - 1 ? "…" : null, total);
  const filtered = pages.filter(p => p !== null);

  const btn = (label, target, active = false, disabled = false) => (
    <button key={label + target} onClick={() => !disabled && onChange(target)} disabled={disabled}
      style={{
        minWidth: 36, height: 36, borderRadius: 10, border: "none",
        background: active ? "rgba(139,92,246,0.3)" : "var(--bg-elevated)",
        color: active ? "#c4b5fd" : disabled ? "var(--text-veryfaint)" : "var(--text-muted)",
        cursor: disabled ? "default" : "pointer", fontSize: 13, fontWeight: active ? 700 : 400,
        outline: active ? "1px solid rgba(139,92,246,0.5)" : "none",
        transition: "background 0.15s",
      }}>
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 24, flexWrap: "wrap" }}>
      {btn("←", page - 1, false, page === 1)}
      {filtered.map((p, i) =>
        p === "…"
          ? <span key={"ellipsis" + i} style={{ color: "#4b5563", alignSelf: "center", padding: "0 4px" }}>…</span>
          : btn(p, p, p === page)
      )}
      {btn("→", page + 1, false, page === total)}
    </div>
  );
}

function FG({ label, children }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color:"var(--text-faint)" }}>{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterTag({ label, onRemove, color }) {
  const colors = {
    default: { background:"rgba(139,92,246,0.2)", color:"#c4b5fd", border:"1px solid rgba(139,92,246,0.3)" },
    amber:   { background:"rgba(251,191,36,0.2)",  color:"#fde68a", border:"1px solid rgba(251,191,36,0.3)" },
    fuchsia: { background:"rgba(217,70,239,0.2)",  color:"#e879f9", border:"1px solid rgba(217,70,239,0.3)" },
    indigo:  { background:"rgba(99,102,241,0.2)",   color:"#a5b4fc", border:"1px solid rgba(99,102,241,0.3)" },
  };
  const style = colors[color] || colors.default;
  return (
    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" style={style}>
      {label}
      <button onClick={onRemove}
        style={{ background:"transparent", border:"none", color:"inherit", cursor:"pointer", padding:0, lineHeight:1, opacity:0.7 }}>
        ✕
      </button>
    </span>
  );
}
