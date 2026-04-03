// src/pages/Home.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { animeList } from "../api/db";
import AnimeCard from "../components/AnimeCard";

const featured = animeList.find(a => a.id === 5); // Frieren as hero
const newReleases = animeList.filter(a => a.is_new);
const topRated   = [...animeList].filter(a => a.rating).sort((a,b) => b.rating - a.rating).slice(0,4);

export default function Home() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/catalog?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="space-y-16">

      {/* ── Hero ── */}
      {featured && (
        <section className="relative -mx-4 sm:-mx-6 -mt-8 overflow-hidden rounded-2xl h-[460px] flex items-end">
          {/* Background */}
          <div className="absolute inset-0">
            <img
              src={featured.poster_url}
              alt={featured.title}
              className="w-full h-full object-cover object-top scale-105"
              style={{ filter: "brightness(0.35)" }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0d0f14] via-[#0d0f14]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f14] via-transparent to-transparent" />
          </div>

          {/* Content */}
          <div className="relative px-8 pb-10 max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-fuchsia-500/30 text-fuchsia-300">FEATURED</span>
              <span className="text-xs text-gray-400">{featured.type.toUpperCase()} · {featured.aired_from?.slice(0,4)}</span>
            </div>
            <h2 className="text-4xl font-black tracking-tight text-white mb-2">{featured.title}</h2>
            <p className="text-sm text-gray-500 mb-1">{featured.title_jp}</p>
            <p className="text-gray-300 text-sm leading-relaxed line-clamp-3 mb-6">{featured.synopsis}</p>
            <div className="flex gap-3">
              <a
                href={`/anime/${featured.id}`}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-sm transition-all shadow-lg shadow-violet-500/30"
              >
                Details
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ── Search ── */}
      <section>
        <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search anime by title…"
              className="w-full bg-[#13151c] border border-white/10 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 rounded-2xl py-4 pl-12 pr-32 text-white placeholder-gray-500 text-sm outline-none transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-semibold transition-all"
            >
              Search
            </button>
          </div>
        </form>
      </section>

      {/* ── New Releases ── */}
      <section>
        <SectionHeader title="New Releases" subtitle="Latest & upcoming titles" href="/catalog?filter=new" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
          {newReleases.map(anime => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      </section>

      {/* ── Top Rated ── */}
      <section>
        <SectionHeader title="Top Rated" subtitle="Highest community scores" href="/catalog?sort=rating" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          {topRated.map(anime => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      </section>

    </div>
  );
}

function SectionHeader({ title, subtitle, href }) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
      </div>
      <a href={href} className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
        View all →
      </a>
    </div>
  );
}
