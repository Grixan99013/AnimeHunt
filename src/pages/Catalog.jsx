// src/pages/Catalog.jsx
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchAnimeList, fetchGenres, fetchStudios, fetchThemes } from "../api/api";
import AnimeCard from "../components/AnimeCard";

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
const btnOff = { background:"rgba(255,255,255,0.05)", color:"#9ca3af", border:"1px solid transparent" };
const gOn    = { background:"rgba(217,70,239,0.2)", color:"#e879f9", border:"1px solid rgba(217,70,239,0.35)" };
const gOff   = { background:"rgba(255,255,255,0.05)", color:"#9ca3af", border:"1px solid transparent" };
const sOn    = { background:"rgba(251,191,36,0.2)", color:"#fde68a", border:"1px solid rgba(251,191,36,0.35)" };
const sOff   = { background:"rgba(255,255,255,0.05)", color:"#9ca3af", border:"1px solid transparent" };
const thOn   = { background:"rgba(99,102,241,0.2)", color:"#a5b4fc", border:"1px solid rgba(99,102,241,0.35)" };
const thOff  = { background:"rgba(255,255,255,0.05)", color:"#9ca3af", border:"1px solid transparent" };

export default function Catalog() {
  const [searchParams] = useSearchParams();
  const [query,     setQuery]     = useState(searchParams.get("q") || "");
  const [status,    setStatus]    = useState("all");
  const [type,      setType]      = useState("all");
  const [sort,      setSort]      = useState(searchParams.get("sort") || "newest");
  const [selGenres, setSelGenres] = useState([]);
  const [selStudio, setSelStudio] = useState("");   // фильтр по студии (название)
  const [selTheme,  setSelTheme]  = useState("");   // тема аниме
  const [showFilters, setShowFilters] = useState(false);

  const [animeList, setAnimeList] = useState([]);
  const [genres,    setGenres]    = useState([]);
  const [studios,   setStudios]   = useState([]);
  const [themes,    setThemes]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  const isNew = searchParams.get("is_new") === "true";

  // Загрузка жанров и студий один раз
  useEffect(() => {
    fetchGenres().then(setGenres).catch(() => {});
    fetchStudios().then(setStudios).catch(() => {});
    fetchThemes().then(setThemes).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    const params = {
      sort,
      ...(query     && { q: query }),
      ...(status !== "all" && { status }),
      ...(type   !== "all" && { type }),
      ...(isNew  && { is_new: true }),
      ...(selGenres.length === 1 && { genre: selGenres[0] }),
      ...(selStudio && { studio: selStudio }),
      ...(selTheme && { theme: selTheme }),
    };
    fetchAnimeList(params)
      .then(data => {
        // Клиентская фильтрация по нескольким жанрам
        if (selGenres.length > 1) {
          data = data.filter(a =>
            selGenres.every(g => Array.isArray(a.genres) && a.genres.includes(g))
          );
        }
        setAnimeList(data);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [query, status, type, sort, selGenres, selStudio, selTheme, isNew]);

  useEffect(() => { load(); }, [load]);

  const toggleGenre = (name) =>
    setSelGenres(prev => prev.includes(name) ? prev.filter(g => g !== name) : [...prev, name]);

  const activeCount =
    selGenres.length +
    (status !== "all" ? 1 : 0) +
    (type   !== "all" ? 1 : 0) +
    (selStudio ? 1 : 0) +
    (selTheme ? 1 : 0);

  const resetFilters = () => {
    setStatus("all"); setType("all"); setSelGenres([]); setQuery(""); setSelStudio(""); setSelTheme("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">{isNew ? "Новинки" : "Каталог аниме"}</h1>
        <p className="text-sm mt-1" style={{ color:"#6b7280" }}>
          {loading ? "Загрузка…" : `Найдено тайтлов: ${animeList.length}`}
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
            className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none"
            style={{ backgroundColor:"#13151c", border:"1px solid rgba(255,255,255,0.1)" }}
            onFocus={e => e.target.style.borderColor="rgba(139,92,246,0.4)"}
            onBlur={e => e.target.style.borderColor="rgba(255,255,255,0.1)"} />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="rounded-xl px-3 py-2.5 text-sm outline-none"
          style={{ backgroundColor:"#13151c", border:"1px solid rgba(255,255,255,0.1)", color:"#d1d5db" }}>
          {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2.5 rounded-xl text-sm font-medium"
          style={showFilters
            ? { background:"rgba(139,92,246,0.2)", border:"1px solid rgba(139,92,246,0.4)", color:"#c4b5fd", cursor:"pointer" }
            : { backgroundColor:"#13151c", border:"1px solid rgba(255,255,255,0.1)", color:"#9ca3af", cursor:"pointer" }}>
          Фильтры{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
      </div>

      {/* Фильтры */}
      {showFilters && (
        <div className="rounded-2xl p-5 space-y-5"
          style={{ backgroundColor:"#13151c", border:"1px solid rgba(255,255,255,0.05)" }}>

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

          <button onClick={resetFilters}
            style={{ background:"transparent", border:"none", color:"#6b7280", cursor:"pointer", fontSize:"0.75rem" }}>
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
          {selGenres.map(g => (
            <FilterTag key={g} label={g} onRemove={() => toggleGenre(g)} color="fuchsia" />
          ))}
        </div>
      )}

      {/* Результаты */}
      {error ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-sm mb-3" style={{ color:"#f87171" }}>{error}</p>
          <button onClick={load} className="text-sm px-4 py-2 rounded-xl"
            style={{ background:"rgba(139,92,246,0.2)", color:"#c4b5fd", border:"none", cursor:"pointer" }}>
            Повторить
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array(10).fill(0).map((_,i) => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ height:"340px", backgroundColor:"#13151c" }} />
          ))}
        </div>
      ) : animeList.length === 0 ? (
        <div className="text-center py-24" style={{ color:"#4b5563" }}>
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-sm">Ничего не найдено</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {animeList.map(a => <AnimeCard key={a.id} anime={a} />)}
        </div>
      )}
    </div>
  );
}

function FG({ label, children }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color:"#6b7280" }}>{label}</p>
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
