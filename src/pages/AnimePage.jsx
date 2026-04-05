// src/pages/AnimePage.jsx
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../App";
import {
  getAnimeById, getGenresByIds, getStudioById,
  getSeasonsByAnimeId, getCharactersByAnimeId,
  getCommentsByAnimeId, addComment,
  staff,
} from "../api/db";

const STATUS_STYLES = {
  completed: { color: "#34d399", background: "rgba(16,185,129,0.1)",  border: "1px solid rgba(16,185,129,0.25)" },
  ongoing:   { color: "#60a5fa", background: "rgba(59,130,246,0.1)",  border: "1px solid rgba(59,130,246,0.25)" },
  upcoming:  { color: "#fbbf24", background: "rgba(245,158,11,0.1)",  border: "1px solid rgba(245,158,11,0.25)" },
};

const TABS = ["Overview", "Characters", "Seasons", "Staff", "Comments"];

export default function AnimePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const anime = getAnimeById(id);
  const [activeTab, setActiveTab] = useState("Overview");
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState(() => getCommentsByAnimeId(id));

  if (!anime) return (
    <div className="text-center py-32" style={{ color: "#6b7280" }}>
      <p className="text-4xl mb-4">😶</p>
      <p>Anime not found.</p>
      <Link to="/catalog" className="text-sm mt-2 inline-block" style={{ color: "#a78bfa" }}>
        ← Back to catalog
      </Link>
    </div>
  );

  const genres  = getGenresByIds(anime.genre_ids);
  const studio  = getStudioById(anime.studio_id);
  const seasons = getSeasonsByAnimeId(id);
  const chars   = getCharactersByAnimeId(id);
  const statusStyle = STATUS_STYLES[anime.status] || { color: "#9ca3af", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" };

  const handleComment = (e) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    const newC = addComment(anime.id, user.id, user.username, commentText.trim());
    setComments(prev => [...prev, newC]);
    setCommentText("");
  };

  return (
    <div className="space-y-8">

      {/* Banner */}
      <div className="relative -mx-4 sm:-mx-6 -mt-8 overflow-hidden rounded-2xl" style={{ height: "300px" }}>
        {anime.poster_url && (
          <img src={anime.poster_url} alt={anime.title}
            className="w-full h-full object-cover object-top"
            style={{ filter: "brightness(0.25)" }} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #0d0f14 0%, rgba(13,15,20,0.5) 60%, transparent 100%)" }} />

        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 flex gap-6 items-end">
          <div className="hidden sm:block rounded-xl overflow-hidden flex-shrink-0 shadow-xl"
            style={{ width: "112px", height: "160px", border: "2px solid rgba(255,255,255,0.1)" }}>
            {anime.poster_url
              ? <img src={anime.poster_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full" style={{ backgroundColor: "#1a1d26" }} />
            }
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={statusStyle}>
                {anime.status}
              </span>
              <span className="text-xs uppercase" style={{ color: "#6b7280" }}>{anime.type}</span>
              {anime.is_new && (
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(217,70,239,0.2)", color: "#e879f9", border: "1px solid rgba(217,70,239,0.2)" }}>
                  NEW
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{anime.title}</h1>
            {anime.title_jp && <p className="text-sm mt-0.5" style={{ color: "#6b7280" }}>{anime.title_jp}</p>}

            <div className="flex flex-wrap gap-4 mt-3 text-sm" style={{ color: "#9ca3af" }}>
              {anime.rating && (
                <span className="font-bold flex items-center gap-1" style={{ color: "#fbbf24" }}>
                  ⭐ {anime.rating.toFixed(1)}
                </span>
              )}
              {anime.episodes && <span>{anime.episodes} episodes</span>}
              {anime.duration_min && <span>{anime.duration_min} min/ep</span>}
              {studio && <span>{studio.name}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors"
            style={{
              color: activeTab === tab ? "#c4b5fd" : "#6b7280",
              borderBottom: activeTab === tab ? "2px solid #8b5cf6" : "2px solid transparent",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === tab ? "2px solid #8b5cf6" : "2px solid transparent",
              cursor: "pointer",
            }}>
            {tab}
            {tab === "Comments" && comments.length > 0 && (
              <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.1)" }}>
                {comments.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "Overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: "#6b7280" }}>Synopsis</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#d1d5db" }}>{anime.synopsis || "No synopsis available."}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: "#6b7280" }}>Genres</h3>
              <div className="flex flex-wrap gap-2">
                {genres.map(g => (
                  <span key={g.id} className="px-3 py-1 rounded-full text-xs"
                    style={{ background: "rgba(139,92,246,0.1)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.2)" }}>
                    {g.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-0">
            {[
              ["Status",   anime.status],
              ["Type",     anime.type?.toUpperCase()],
              ["Episodes", anime.episodes ?? "?"],
              ["Duration", anime.duration_min ? `${anime.duration_min} min` : "—"],
              ["Aired",    `${anime.aired_from?.slice(0,4) || "?"} – ${anime.aired_to?.slice(0,4) || "?"}`],
              ["Studio",   studio?.name || "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center py-2 text-sm"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ color: "#6b7280" }}>{label}</span>
                <span className="font-medium text-white capitalize">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "Characters" && (
        chars.length === 0
          ? <Empty text="No characters listed yet." />
          : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {chars.map(c => (
                <div key={c.id} className="rounded-xl p-4"
                  style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="w-16 h-16 rounded-full overflow-hidden mb-3"
                    style={{ backgroundColor: "#1a1d26", border: "1px solid rgba(255,255,255,0.1)" }}>
                    {c.image_url
                      ? <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xl font-bold"
                          style={{ color: "#4b5563" }}>{c.name[0]}</div>
                    }
                  </div>
                  <p className="font-semibold text-sm text-white">{c.name}</p>
                  <p className="text-xs capitalize mt-0.5" style={{ color: "#6b7280" }}>{c.role}</p>
                  {c.description && <p className="text-xs mt-2 line-clamp-3" style={{ color: "#9ca3af" }}>{c.description}</p>}
                </div>
              ))}
            </div>
          )
      )}

      {activeTab === "Seasons" && (
        seasons.length === 0
          ? <Empty text="Season data not available." />
          : (
            <div className="space-y-3">
              {seasons.map(s => (
                <div key={s.id} className="px-5 py-4 rounded-xl flex items-center justify-between"
                  style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div>
                    <p className="font-semibold text-sm text-white">
                      Season {s.season_num}{s.title ? ` — ${s.title}` : ""}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>{s.aired_from?.slice(0,4) || "TBA"}</p>
                  </div>
                  <span className="text-sm" style={{ color: "#9ca3af" }}>{s.episodes} eps</span>
                </div>
              ))}
            </div>
          )
      )}

      {activeTab === "Staff" && (
        staff.length === 0
          ? <Empty text="Staff data not available." />
          : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {staff.map(s => (
                <div key={s.id} className="rounded-xl p-4"
                  style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="font-semibold text-sm text-white">{s.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#a78bfa" }}>{s.role}</p>
                  {s.bio && <p className="text-xs mt-2 line-clamp-2" style={{ color: "#6b7280" }}>{s.bio}</p>}
                </div>
              ))}
            </div>
          )
      )}

      {activeTab === "Comments" && (
        <div className="space-y-6">
          {user ? (
            <form onSubmit={handleComment} className="space-y-3">
              <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                placeholder="Share your thoughts…" rows={3}
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none resize-none transition-all"
                style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
                onFocus={e => e.target.style.borderColor = "rgba(139,92,246,0.4)"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
              />
              <button type="submit" disabled={!commentText.trim()}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: commentText.trim() ? "linear-gradient(to right, #7c3aed, #a21caf)" : "rgba(255,255,255,0.1)", opacity: commentText.trim() ? 1 : 0.5 }}>
                Post Comment
              </button>
            </form>
          ) : (
            <div className="rounded-xl px-5 py-4 text-sm" style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.05)", color: "#6b7280" }}>
              <Link to="/login" style={{ color: "#a78bfa" }}>Sign in</Link> to leave a comment.
            </div>
          )}

          {comments.length === 0
            ? <Empty text="No comments yet. Be the first!" />
            : (
              <div className="space-y-3">
                {comments.map(c => (
                  <div key={c.id} className="rounded-xl px-5 py-4"
                    style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: "linear-gradient(135deg, #7c3aed, #a21caf)" }}>
                        {c.username?.[0]?.toUpperCase() || "U"}
                      </span>
                      <span className="text-sm font-medium text-white">{c.username}</span>
                      <span className="text-xs ml-auto" style={{ color: "#4b5563" }}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: "#d1d5db" }}>{c.body}</p>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}

    </div>
  );
}

function Empty({ text }) {
  return <div className="py-16 text-center text-sm" style={{ color: "#4b5563" }}>{text}</div>;
}
