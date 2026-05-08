// src/pages/SeriesPage.jsx
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { usePageMeta } from "../hooks/usePageMeta";
import { STATUS_LABELS, STATUS_STYLES, TYPE_LABELS } from "../api/api";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

async function fetchSeriesPage(id) {
  const res = await fetch(`${BASE}/anime/series/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка загрузки");
  return data;
}

export default function SeriesPage() {
  const { id } = useParams();
  const [series, setSeries] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetchSeriesPage(id)
      .then(setSeries)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  usePageMeta(
    series ? `Серия: ${series.title}` : "Серия",
    series?.description || undefined
  );

  if (loading) return (
    <div className="flex items-center justify-center py-32" style={{ color: "#6b7280" }}>
      <div className="w-8 h-8 rounded-full border-2 animate-spin"
        style={{ borderColor: "rgba(255,255,255,0.1)", borderTopColor: "#8b5cf6" }} />
    </div>
  );

  if (error) return (
    <div className="text-center py-24" style={{ color: "#6b7280" }}>
      <p className="text-4xl mb-3">⚠️</p>
      <p>{error}</p>
      <Link to="/catalog" style={{ color: "#7c3aed" }}>← Вернуться в каталог</Link>
    </div>
  );

  if (!series) return null;

  const totalEpisodes = series.entries.reduce((s, e) => s + (e.episodes || 0), 0);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Заголовок */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 12, color: "#7c3aed", fontWeight: 600, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>
          Серия аниме
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", margin: 0 }}>
          {series.title}
        </h1>
        {series.description && (
          <p style={{ color: "#9ca3af", marginTop: 10, fontSize: 14, lineHeight: 1.7 }}>
            {series.description}
          </p>
        )}
        <div style={{ marginTop: 12, display: "flex", gap: 16, fontSize: 13, color: "#6b7280" }}>
          <span>{series.entries.length} частей</span>
          {totalEpisodes > 0 && <span>{totalEpisodes} эпизодов всего</span>}
        </div>
      </div>

      {/* Список частей */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {series.entries.map((anime, idx) => {
          const statusStyle = STATUS_STYLES[anime.status] || {};
          const rating = anime.avg_rating ? Number(anime.avg_rating).toFixed(1) : null;
          return (
            <Link
              key={anime.id}
              to={`/anime/${anime.id}`}
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  background: "#13151c",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 14,
                  display: "flex",
                  gap: 16,
                  padding: 16,
                  transition: "border-color .15s",
                  cursor: "pointer",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(124,58,237,0.35)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"}
              >
                {/* Номер */}
                <div style={{
                  minWidth: 40, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, fontWeight: 900, color: "rgba(124,58,237,0.5)",
                }}>
                  {idx + 1}
                </div>

                {/* Постер */}
                <div style={{ width: 64, minWidth: 64, height: 90, borderRadius: 8, overflow: "hidden", background: "#1a1d26", flexShrink: 0 }}>
                  {anime.poster_url
                    ? <img src={anime.poster_url} alt={anime.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                    : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#374151", fontSize: 20 }}>🎬</div>
                  }
                </div>

                {/* Инфо */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                    <h3 style={{ color: "#fff", fontWeight: 700, fontSize: 15, margin: 0, lineHeight: 1.3 }}>
                      {anime.title}
                    </h3>
                    {anime.season_num && (
                      <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 10, background: "rgba(124,58,237,0.2)", color: "#c4b5fd", flexShrink: 0 }}>
                        Сезон {anime.season_num}
                      </span>
                    )}
                  </div>
                  {anime.title_jp && (
                    <p style={{ fontSize: 12, color: "#6b7280", margin: "3px 0 0" }}>{anime.title_jp}</p>
                  )}
                  <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                      ...statusStyle,
                    }}>
                      {STATUS_LABELS[anime.status] || anime.status}
                    </span>
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>
                      {TYPE_LABELS[anime.type] || anime.type}
                      {anime.episodes ? ` · ${anime.episodes} эп.` : ""}
                    </span>
                    {anime.aired_from && (
                      <span style={{ fontSize: 12, color: "#6b7280" }}>
                        {String(anime.aired_from).slice(0, 4)}
                        {anime.aired_to && anime.aired_to !== anime.aired_from
                          ? ` – ${String(anime.aired_to).slice(0, 4)}`
                          : ""}
                      </span>
                    )}
                    {anime.studio_name && (
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{anime.studio_name}</span>
                    )}
                  </div>
                  {anime.synopsis && (
                    <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {anime.synopsis}
                    </p>
                  )}
                </div>

                {/* Рейтинг */}
                {rating && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 50 }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#fbbf24" }}>{rating}</div>
                    <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>{anime.rating_count} оценок</div>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {series.entries.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#6b7280" }}>
          В этой серии пока нет аниме
        </div>
      )}
    </div>
  );
}
