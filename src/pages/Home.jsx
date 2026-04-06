// src/pages/Home.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAnimeList } from "../api/api";
import AnimeCard from "../components/AnimeCard";

export default function Home() {
  const [query, setQuery]         = useState("");
  const [newReleases, setNew]     = useState([]);
  const [topRated, setTop]        = useState([]);
  const [featured, setFeatured]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      fetchAnimeList({ is_new: true, limit: 8 }),
      fetchAnimeList({ sort: "rating", limit: 4 }),
    ]).then(([newList, topList]) => {
      setNew(newList);
      setTop(topList);
      setFeatured(newList[0] || topList[0] || null);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/catalog?q=${encodeURIComponent(query.trim())}`);
  };

  if (loading) return <Loader />;

  return (
    <div className="space-y-16">

      {/* Герой */}
      {featured && (
        <section className="relative -mx-4 sm:-mx-6 -mt-8 overflow-hidden rounded-2xl flex items-end"
          style={{ height: "460px" }}>
          <div className="absolute inset-0">
            <img src={featured.poster_url} alt={featured.title}
              className="w-full h-full object-cover object-top"
              style={{ transform: "scale(1.05)", filter: "brightness(0.35)" }} />
            <div className="absolute inset-0"
              style={{ background: "linear-gradient(to right, #0d0f14, rgba(13,15,20,0.6), transparent)" }} />
            <div className="absolute inset-0"
              style={{ background: "linear-gradient(to top, #0d0f14, transparent)" }} />
          </div>
          <div className="relative px-8 pb-10 max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(217,70,239,0.3)", color: "#e879f9" }}>В ЦЕНТРЕ ВНИМАНИЯ</span>
            </div>
            <h2 className="text-4xl font-black tracking-tight text-white mb-2">{featured.title}</h2>
            {featured.title_jp && <p className="text-sm mb-1" style={{ color: "#6b7280" }}>{featured.title_jp}</p>}
            {featured.synopsis && (
              <p className="text-sm leading-relaxed mb-6 line-clamp-3" style={{ color: "#d1d5db" }}>{featured.synopsis}</p>
            )}
            <a href={`/anime/${featured.id}`}
              className="inline-block px-5 py-2.5 rounded-xl text-white font-semibold text-sm"
              style={{ background: "linear-gradient(to right, #7c3aed, #a21caf)", boxShadow: "0 4px 20px rgba(124,58,237,0.35)" }}>
              Подробнее
            </a>
          </div>
        </section>
      )}

      {/* Поиск */}
      <section>
        <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "#6b7280" }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Поиск аниме по названию…"
              className="w-full rounded-2xl py-4 pl-12 pr-32 text-sm text-white outline-none"
              style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.1)" }}
              onFocus={e => e.target.style.borderColor = "rgba(139,92,246,0.5)"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
            <button type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 rounded-xl text-white text-sm font-semibold"
              style={{ background: "linear-gradient(to right, #7c3aed, #a21caf)" }}>Найти</button>
          </div>
        </form>
      </section>

      {/* Новинки */}
      {newReleases.length > 0 && (
        <section>
          <SectionHeader title="Новинки" subtitle="Последние и анонсированные тайтлы" href="/catalog?is_new=true" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
            {newReleases.map(a => <AnimeCard key={a.id} anime={a} />)}
          </div>
        </section>
      )}

      {/* Топ по оценке */}
      {topRated.length > 0 && (
        <section>
          <SectionHeader title="Топ по оценке" subtitle="Самые высокооцениваемые тайтлы" href="/catalog?sort=rating" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            {topRated.map(a => <AnimeCard key={a.id} anime={a} />)}
          </div>
        </section>
      )}

    </div>
  );
}

function SectionHeader({ title, subtitle, href }) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <p className="text-sm mt-0.5" style={{ color: "#6b7280" }}>{subtitle}</p>
      </div>
      <a href={href} className="text-sm" style={{ color: "#a78bfa" }}>Смотреть все →</a>
    </div>
  );
}

function Loader() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4" style={{ color: "#6b7280" }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-violet-500 animate-spin"
        style={{ borderColor: "rgba(255,255,255,0.1)", borderTopColor: "#8b5cf6" }} />
      <p className="text-sm">Загружаем данные…</p>
    </div>
  );
}
