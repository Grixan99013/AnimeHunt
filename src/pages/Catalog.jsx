// src/pages/Catalog.jsx
import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { animeList, genres } from "../api/db";
import AnimeCard from "../components/AnimeCard";

const STATUSES = ["all", "ongoing", "completed", "upcoming"];
const TYPES    = ["all", "tv", "movie", "ova", "ona"];
const SORTS    = [
  { value: "rating",  label: "Top Rated" },
  { value: "newest",  label: "Newest" },
  { value: "title",   label: "A → Z" },
];

// Стили кнопок — inline чтобы избежать проблем с динамическим Tailwind
const btnActive   = { background: "rgba(139,92,246,0.25)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.4)" };
const btnInactive = { background: "rgba(255,255,255,0.05)", color: "#9ca3af", border: "1px solid transparent" };
const btnGenreActive   = { background: "rgba(217,70,239,0.2)", color: "#e879f9", border: "1px solid rgba(217,70,239,0.35)" };
const btnGenreInactive = { background: "rgba(255,255,255,0.05)", color: "#9ca3af", border: "1px solid transparent" };

export default function Catalog() {
  const [searchParams] = useSearchParams();
  const [query,  setQuery]  = useState(searchParams.get("q") || "");
  const [status, setStatus] = useState("all");
  const [type,   setType]   = useState("all");
  const [sort,   setSort]   = useState(searchParams.get("sort") || "rating");
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const onlyNew = searchParams.get("filter") === "new";

  useEffect(() => {
    if (searchParams.get("q")) setQuery(searchParams.get("q"));
  }, []);

  const toggleGenre = (id) =>
    setSelectedGenres(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);

  const filtered = useMemo(() => {
    let list = [...animeList];
    if (onlyNew)  list = list.filter(a => a.is_new);
    if (query)    list = list.filter(a =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      (a.title_jp && a.title_jp.includes(query))
    );
    if (status !== "all") list = list.filter(a => a.status === status);
    if (type   !== "all") list = list.filter(a => a.type   === type);
    if (selectedGenres.length > 0)
      list = list.filter(a => selectedGenres.every(g => a.genre_ids.includes(g)));

    if (sort === "rating") list.sort((a,b) => (b.rating||0) - (a.rating||0));
    else if (sort === "newest") list.sort((a,b) => new Date(b.aired_from||0) - new Date(a.aired_from||0));
    else list.sort((a,b) => a.title.localeCompare(b.title));
    return list;
  }, [query, status, type, sort, selectedGenres, onlyNew]);

  const activeFilterCount = selectedGenres.length + (status !== "all" ? 1 : 0) + (type !== "all" ? 1 : 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">
          {onlyNew ? "New Releases" : "Anime Catalog"}
        </h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>{filtered.length} titles found</p>
      </div>

      {/* Search + controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#6b7280" }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search titles…"
            className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none transition-all"
            style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.1)" }}
            onFocus={e => e.target.style.borderColor = "rgba(139,92,246,0.4)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
          />
        </div>

        <select value={sort} onChange={e => setSort(e.target.value)}
          className="rounded-xl px-3 py-2.5 text-sm outline-none"
          style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.1)", color: "#d1d5db" }}>
          {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <button onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={showFilters
            ? { background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)", color: "#c4b5fd" }
            : { backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.1)", color: "#9ca3af" }
          }>
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="rounded-2xl p-5 space-y-5"
          style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#6b7280" }}>Status</p>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={status === s ? btnActive : btnInactive}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#6b7280" }}>Type</p>
            <div className="flex flex-wrap gap-2">
              {TYPES.map(t => (
                <button key={t} onClick={() => setType(t)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={type === t ? btnActive : btnInactive}>
                  {t === "all" ? "All" : t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#6b7280" }}>Genres</p>
            <div className="flex flex-wrap gap-2">
              {genres.map(g => (
                <button key={g.id} onClick={() => toggleGenre(g.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={selectedGenres.includes(g.id) ? btnGenreActive : btnGenreInactive}>
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => { setStatus("all"); setType("all"); setSelectedGenres([]); setQuery(""); }}
            className="text-xs transition-colors"
            style={{ background: "transparent", border: "none", color: "#6b7280", cursor: "pointer" }}
            onMouseEnter={e => e.target.style.color = "#f87171"}
            onMouseLeave={e => e.target.style.color = "#6b7280"}>
            Clear all filters
          </button>
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-24" style={{ color: "#4b5563" }}>
          <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p className="text-sm">No anime found matching your criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(anime => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      )}
    </div>
  );
}
