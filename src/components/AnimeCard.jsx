// src/components/AnimeCard.jsx
import { Link } from "react-router-dom";
import { getGenresByIds, getStudioById } from "../api/db";

// Используем inline-стили для динамических цветов — Tailwind не может
// сканировать классы собранные динамически через переменные объекта
const STATUS_STYLES = {
  completed: { background: "rgba(16,185,129,0.15)", color: "#34d399" },
  ongoing:   { background: "rgba(59,130,246,0.15)", color: "#60a5fa" },
  upcoming:  { background: "rgba(245,158,11,0.15)", color: "#fbbf24" },
  cancelled: { background: "rgba(239,68,68,0.15)",  color: "#f87171" },
};

const TYPE_LABELS = {
  tv: "TV", movie: "Movie", ova: "OVA", ona: "ONA", special: "Special",
};

export default function AnimeCard({ anime }) {
  const genres = getGenresByIds(anime.genre_ids).slice(0, 3);
  const studio = getStudioById(anime.studio_id);
  const statusStyle = STATUS_STYLES[anime.status] || { background: "rgba(107,114,128,0.15)", color: "#9ca3af" };

  return (
    <Link
      to={`/anime/${anime.id}`}
      className="group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
      style={{
        backgroundColor: "#13151c",
        border: "1px solid rgba(255,255,255,0.05)",
        textDecoration: "none",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"}
    >
      {/* Poster */}
      <div className="relative overflow-hidden" style={{ height: "256px", backgroundColor: "#1a1d26" }}>
        {anime.poster_url ? (
          <img
            src={anime.poster_url}
            alt={anime.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ color: "#374151" }}>
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
          </div>
        )}

        {/* Badges top-left */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={statusStyle}>
            {anime.status.charAt(0).toUpperCase() + anime.status.slice(1)}
          </span>
          {anime.is_new && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(217,70,239,0.25)", color: "#e879f9" }}>
              NEW
            </span>
          )}
        </div>

        {/* Type badge top-right */}
        <span className="absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: "rgba(0,0,0,0.55)", color: "#d1d5db" }}>
          {TYPE_LABELS[anime.type] || anime.type}
        </span>

        {/* Rating bottom-right */}
        {anime.rating && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full px-2 py-0.5"
            style={{ background: "rgba(0,0,0,0.65)" }}>
            <svg className="w-3 h-3" fill="#fbbf24" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            <span className="text-xs font-bold" style={{ color: "#fbbf24" }}>{anime.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <h3 className="font-bold text-sm leading-tight line-clamp-2 transition-colors"
          style={{ color: "white" }}
          onMouseEnter={e => e.target.style.color = "#c4b5fd"}
          onMouseLeave={e => e.target.style.color = "white"}>
          {anime.title}
        </h3>
        {anime.title_jp && (
          <p className="text-xs" style={{ color: "#6b7280" }}>{anime.title_jp}</p>
        )}

        <div className="flex flex-wrap gap-1 mt-1">
          {genres.map(g => (
            <span key={g.id} className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.05)", color: "#9ca3af" }}>
              {g.name}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-2 flex items-center justify-between text-xs"
          style={{ color: "#6b7280" }}>
          <span>{studio?.name || "—"}</span>
          <span>{anime.aired_from ? anime.aired_from.slice(0, 4) : "TBA"}</span>
        </div>
      </div>
    </Link>
  );
}
