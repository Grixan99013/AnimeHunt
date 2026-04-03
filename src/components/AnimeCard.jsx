// src/components/AnimeCard.jsx
import { Link } from "react-router-dom";
import { getGenresByIds, getStudioById } from "../api/db";

const STATUS_COLORS = {
  completed: "bg-emerald-500/20 text-emerald-400",
  ongoing:   "bg-blue-500/20   text-blue-400",
  upcoming:  "bg-amber-500/20  text-amber-400",
  cancelled: "bg-red-500/20    text-red-400",
};

const TYPE_LABELS = {
  tv:      "TV",
  movie:   "Movie",
  ova:     "OVA",
  ona:     "ONA",
  special: "Special",
};

export default function AnimeCard({ anime }) {
  const genres  = getGenresByIds(anime.genre_ids).slice(0, 3);
  const studio  = getStudioById(anime.studio_id);
  const status  = STATUS_COLORS[anime.status] || "bg-gray-500/20 text-gray-400";

  return (
    <Link
      to={`/anime/${anime.id}`}
      className="group relative flex flex-col bg-[#13151c] rounded-2xl overflow-hidden border border-white/5 hover:border-violet-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1"
    >
      {/* Poster */}
      <div className="relative h-64 overflow-hidden bg-[#1a1d26]">
        {anime.poster_url ? (
          <img
            src={anime.poster_url}
            alt={anime.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-700">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#13151c] via-transparent to-transparent opacity-0 group-hover:opacity-60 transition-opacity" />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm ${status}`}>
            {anime.status.charAt(0).toUpperCase() + anime.status.slice(1)}
          </span>
          {anime.is_new && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-fuchsia-500/30 text-fuchsia-300 backdrop-blur-sm">
              NEW
            </span>
          )}
        </div>

        {/* Type badge */}
        <span className="absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-black/50 text-gray-300 backdrop-blur-sm">
          {TYPE_LABELS[anime.type] || anime.type}
        </span>

        {/* Rating */}
        {anime.rating && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5">
            <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            <span className="text-xs font-bold text-amber-400">{anime.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <h3 className="font-bold text-white text-sm leading-tight line-clamp-2 group-hover:text-violet-300 transition-colors">
          {anime.title}
        </h3>
        {anime.title_jp && (
          <p className="text-xs text-gray-500">{anime.title_jp}</p>
        )}

        <div className="flex flex-wrap gap-1 mt-1">
          {genres.map(g => (
            <span key={g.id} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
              {g.name}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-2 flex items-center justify-between text-xs text-gray-500">
          <span>{studio?.name || "—"}</span>
          <span>{anime.aired_from ? anime.aired_from.slice(0, 4) : "TBA"}</span>
        </div>
      </div>
    </Link>
  );
}
