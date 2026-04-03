// src/pages/About.jsx
import { animeList, studios } from "../api/db";

export default function About() {
  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-black text-white mb-2">About Aniverse</h1>
        <p className="text-gray-400 leading-relaxed">
          Aniverse is a community-driven anime encyclopedia where fans can discover, track,
          and discuss their favourite anime series, movies, and OVAs. Our database is built
          and maintained by passionate fans from around the world.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Titles",   value: animeList.length },
          { label: "Studios",  value: studios.length },
          { label: "Users",    value: "∞" },
          { label: "Comments", value: "∞" },
        ].map(s => (
          <div key={s.label} className="bg-[#13151c] border border-white/5 rounded-2xl p-5 text-center">
            <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#13151c] border border-white/5 rounded-2xl p-6 space-y-3 text-sm text-gray-400 leading-relaxed">
        <h2 className="text-white font-bold text-base">Stack</h2>
        <ul className="space-y-1">
          <li>⚡ <strong className="text-gray-200">React 18</strong> — UI framework</li>
          <li>🎨 <strong className="text-gray-200">Tailwind CSS</strong> — styling</li>
          <li>🔀 <strong className="text-gray-200">React Router v6</strong> — routing</li>
          <li>🗄 <strong className="text-gray-200">PostgreSQL</strong> — database</li>
        </ul>
      </div>
    </div>
  );
}
