// src/pages/AnimePage.jsx
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../App";
import {
  getAnimeById, getGenresByIds, getStudioById,
  getSeasonsByAnimeId, getCharactersByAnimeId,
  getCommentsByAnimeId, addComment,
  seiyu, staff,
} from "../api/db";

const STATUS_COLORS = {
  completed: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  ongoing:   "text-blue-400   bg-blue-500/10   border-blue-500/20",
  upcoming:  "text-amber-400  bg-amber-500/10  border-amber-500/20",
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
    <div className="text-center py-32 text-gray-500">
      <p className="text-4xl mb-4">😶</p>
      <p>Anime not found.</p>
      <Link to="/catalog" className="text-violet-400 hover:underline text-sm mt-2 inline-block">← Back to catalog</Link>
    </div>
  );

  const genres   = getGenresByIds(anime.genre_ids);
  const studio   = getStudioById(anime.studio_id);
  const seasons  = getSeasonsByAnimeId(id);
  const chars    = getCharactersByAnimeId(id);
  const statusCls = STATUS_COLORS[anime.status] || "text-gray-400 bg-white/5 border-white/10";

  const handleComment = (e) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    const newC = addComment(anime.id, user.id, user.username, commentText.trim());
    setComments(prev => [...prev, newC]);
    setCommentText("");
  };

  return (
    <div className="space-y-8">

      {/* ── Banner / Header ── */}
      <div className="relative -mx-4 sm:-mx-6 -mt-8 h-[300px] overflow-hidden rounded-2xl">
        {anime.poster_url && (
          <img
            src={anime.poster_url}
            alt={anime.title}
            className="w-full h-full object-cover object-top"
            style={{ filter: "brightness(0.25)" }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f14] via-[#0d0f14]/50" />

        <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 flex gap-6 items-end">
          {/* Poster thumbnail */}
          <div className="hidden sm:block w-28 h-40 rounded-xl overflow-hidden border-2 border-white/10 flex-shrink-0 shadow-xl">
            {anime.poster_url
              ? <img src={anime.poster_url} alt="" className="w-full h-full object-cover"/>
              : <div className="w-full h-full bg-[#1a1d26]" />
            }
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusCls}`}>
                {anime.status}
              </span>
              <span className="text-xs text-gray-500 uppercase">{anime.type}</span>
              {anime.is_new && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/20">NEW</span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{anime.title}</h1>
            {anime.title_jp && <p className="text-gray-500 text-sm mt-0.5">{anime.title_jp}</p>}

            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-400">
              {anime.rating && (
                <span className="flex items-center gap-1 text-amber-400 font-bold">
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

      {/* ── Tabs ── */}
      <div className="border-b border-white/5 flex gap-1 overflow-x-auto pb-px">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
              activeTab === tab
                ? "text-violet-300 border-b-2 border-violet-500"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab}
            {tab === "Comments" && comments.length > 0 && (
              <span className="ml-1.5 text-xs bg-white/10 px-1.5 py-0.5 rounded-full">{comments.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}

      {activeTab === "Overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Synopsis</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{anime.synopsis || "No synopsis available."}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Genres</h3>
              <div className="flex flex-wrap gap-2">
                {genres.map(g => (
                  <span key={g.id} className="px-3 py-1 rounded-full bg-violet-500/10 text-violet-300 text-xs border border-violet-500/20">{g.name}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <InfoBox label="Status"   value={anime.status} />
            <InfoBox label="Type"     value={anime.type.toUpperCase()} />
            <InfoBox label="Episodes" value={anime.episodes ?? "?"} />
            <InfoBox label="Duration" value={anime.duration_min ? `${anime.duration_min} min` : "—"} />
            <InfoBox label="Aired"    value={`${anime.aired_from?.slice(0,4) || "?"} – ${anime.aired_to?.slice(0,4) || "?"}`} />
            <InfoBox label="Studio"   value={studio?.name || "—"} />
          </div>
        </div>
      )}

      {activeTab === "Characters" && (
        <div>
          {chars.length === 0
            ? <Empty text="No characters listed yet." />
            : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {chars.map(c => (
                  <div key={c.id} className="bg-[#13151c] rounded-xl overflow-hidden border border-white/5 p-4">
                    <div className="w-16 h-16 rounded-full bg-[#1a1d26] overflow-hidden mb-3 border border-white/10">
                      {c.image_url
                        ? <img src={c.image_url} alt={c.name} className="w-full h-full object-cover"/>
                        : <div className="w-full h-full flex items-center justify-center text-gray-600 text-xl font-bold">{c.name[0]}</div>
                      }
                    </div>
                    <p className="font-semibold text-sm text-white">{c.name}</p>
                    <p className="text-xs text-gray-500 capitalize mt-0.5">{c.role}</p>
                    {c.description && <p className="text-xs text-gray-400 mt-2 line-clamp-3">{c.description}</p>}
                  </div>
                ))}
              </div>
            )}
        </div>
      )}

      {activeTab === "Seasons" && (
        <div>
          {seasons.length === 0
            ? <Empty text="Season data not available." />
            : (
              <div className="space-y-3">
                {seasons.map(s => (
                  <div key={s.id} className="bg-[#13151c] border border-white/5 rounded-xl px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm text-white">Season {s.season_num} {s.title ? `— ${s.title}` : ""}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.aired_from?.slice(0,4) || "TBA"}</p>
                    </div>
                    <span className="text-sm text-gray-400">{s.episodes} eps</span>
                  </div>
                ))}
              </div>
            )}
        </div>
      )}

      {activeTab === "Staff" && (
        <div>
          {staff.length === 0
            ? <Empty text="Staff data not available." />
            : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {staff.map(s => (
                  <div key={s.id} className="bg-[#13151c] border border-white/5 rounded-xl p-4">
                    <p className="font-semibold text-sm text-white">{s.name}</p>
                    <p className="text-xs text-violet-400 mt-0.5">{s.role}</p>
                    {s.bio && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{s.bio}</p>}
                  </div>
                ))}
              </div>
            )}
        </div>
      )}

      {activeTab === "Comments" && (
        <div className="space-y-6">
          {/* New comment form */}
          {user ? (
            <form onSubmit={handleComment} className="space-y-3">
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Share your thoughts…"
                rows={3}
                className="w-full bg-[#13151c] border border-white/10 focus:border-violet-500/40 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 outline-none resize-none transition-all"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 disabled:opacity-40 disabled:cursor-not-allowed hover:from-violet-500 hover:to-fuchsia-500 transition-all text-white"
              >
                Post Comment
              </button>
            </form>
          ) : (
            <div className="bg-[#13151c] border border-white/5 rounded-xl px-5 py-4 text-sm text-gray-500">
              <Link to="/login" className="text-violet-400 hover:underline">Sign in</Link> to leave a comment.
            </div>
          )}

          {/* Comment list */}
          {comments.length === 0
            ? <Empty text="No comments yet. Be the first!" />
            : (
              <div className="space-y-3">
                {comments.map(c => (
                  <div key={c.id} className="bg-[#13151c] border border-white/5 rounded-xl px-5 py-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xs font-bold">
                        {c.username?.[0]?.toUpperCase() || "U"}
                      </span>
                      <span className="text-sm font-medium text-white">{c.username}</span>
                      <span className="text-xs text-gray-600 ml-auto">{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-300">{c.body}</p>
                  </div>
                ))}
              </div>
            )}
        </div>
      )}

    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-white font-medium capitalize">{value}</span>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="py-16 text-center text-gray-600 text-sm">{text}</div>
  );
}
