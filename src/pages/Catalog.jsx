// src/pages/Catalog.jsx
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchAnimeList, fetchGenres } from "../api/api";
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

export default function Catalog() {
  const [searchParams] = useSearchParams();
  const [query,  setQuery]  = useState(searchParams.get("q") || "");
  const [status, setStatus] = useState("all");
  const [type,   setType]   = useState("all");
  const [sort,   setSort]   = useState(searchParams.get("sort") || "newest");
  const [selGenres, setSelGenres] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const [animeList, setAnimeList] = useState([]);
  const [genres, setGenres]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  const isNew = searchParams.get("is_new") === "true";

  // Загрузка жанров один раз
  useEffect(() => {
    fetchGenres().then(setGenres).catch(() => {});
  }, []);

  // Загрузка аниме при изменении фильтров
  const load = useCallback(() => {
    setLoading(true);
    setError("");
    const params = {
      sort,
      ...(query  && { q: query }),
      ...(status !== "all" && { status }),
      ...(type   !== "all" && { type }),
      ...(isNew  && { is_new: true }),
      ...(selGenres.length === 1 && { genre: selGenres[0] }),
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
  }, [query, status, type, sort, selGenres, isNew]);

  useEffect(() => { load(); }, [load]);

  const toggleGenre = (name) =>
    setSelGenres(prev => prev.includes(name) ? prev.filter(g => g !== name) : [...prev, name]);

  const activeCount = selGenres.length + (status !== "all" ? 1 : 0) + (type !== "all" ? 1 : 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">{isNew ? "Новинки" : "Каталог аниме"}</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
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
                style={status===s ? btnOn : btnOff}>{STATUS_RU[s]}</button>
            ))}
          </FG>
          <FG label="Тип">
            {TYPES.map(t => (
              <button key={t} onClick={() => setType(t)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={type===t ? btnOn : btnOff}>{TYPE_RU[t]}</button>
            ))}
          </FG>
          {genres.length > 0 && (
            <FG label="Жанры">
              {genres.map(g => (
                <button key={g.id} onClick={() => toggleGenre(g.name)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={selGenres.includes(g.name) ? gOn : gOff}>{g.name}</button>
              ))}
            </FG>
          )}
          <button onClick={() => { setStatus("all"); setType("all"); setSelGenres([]); setQuery(""); }}
            style={{ background:"transparent", border:"none", color:"#6b7280", cursor:"pointer", fontSize:"0.75rem" }}>
            Сбросить фильтры
          </button>
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
