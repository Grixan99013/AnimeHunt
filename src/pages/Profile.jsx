// src/pages/Profile.jsx
import { useAuth } from "../App";
import { comments, ROLES } from "../api/db";

export default function Profile() {
  const { user, logout } = useAuth();
  const userComments = comments.filter(c => c.user_id === user.id);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-black text-white">My Profile</h1>

      {/* User card */}
      <div className="bg-[#13151c] border border-white/5 rounded-2xl p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-2xl font-black text-white flex-shrink-0">
          {user.username[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="text-lg font-bold text-white">{user.username}</p>
          <p className="text-sm text-gray-500">{user.email}</p>
          <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 capitalize">
            {ROLES[user.role_id] || "user"}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Comments", value: userComments.length },
          { label: "Watchlist", value: 0 },
          { label: "Ratings", value: 0 },
        ].map(s => (
          <div key={s.label} className="bg-[#13151c] border border-white/5 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent comments */}
      {userComments.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">My Comments</h3>
          <div className="space-y-3">
            {userComments.map(c => (
              <div key={c.id} className="bg-[#13151c] border border-white/5 rounded-xl px-4 py-3 text-sm">
                <p className="text-gray-300">{c.body}</p>
                <p className="text-xs text-gray-600 mt-1">{new Date(c.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={logout}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
      >
        Sign Out
      </button>
    </div>
  );
}
