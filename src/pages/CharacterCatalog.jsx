// src/pages/CharacterCatalog.jsx
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { fetchCharacterList } from "../api/api";
import { CharacterCardSkeleton } from "../components/Skeleton";
import { usePageMeta } from "../hooks/usePageMeta";

const GENDERS = [
  { value: "all", label: "Все" },
  { value: "М",   label: "Мужской" },
  { value: "Ж",   label: "Женский" },
];

const SORTS = [
  { value: "favorites", label: "По популярности" },
  { value: "name",      label: "А → Я" },
  { value: "newest",    label: "Новые" },
];

const ROLES = { main: "Главный", supporting: "Второстепенный", extra: "Эпизодический" };
const ROLE_FILTER = [
  { value: "all",        label: "Все роли" },
  { value: "main",       label: "Главные" },
  { value: "supporting", label: "Второстепенные" },
  { value: "extra",      label: "Эпизодические" },
];
const PAGE_SIZE = 36;

const btnOn  = { background:"rgba(139,92,246,0.25)", color:"#c4b5fd", border:"1px solid rgba(139,92,246,0.4)" };
const btnOff = { background:"rgba(255,255,255,0.05)", color:"#9ca3af", border:"1px solid transparent" };

export default function CharacterCatalog() {
  const [searchParams] = useSearchParams();
  const [query,  setQuery]  = useState(searchParams.get("q") || "");
  const [gender, setGender] = useState("all");
  const [sort,   setSort]   = useState("favorites");

  const [role,   setRole]   = useState("all");
  const [page,   setPage]   = useState(1);
  const [chars,   setChars]  = useState([]);
  const [total,   setTotal]  = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]  = useState("");

  const load = useCallback((p = page) => {
    setLoading(true);
    setError("");
    fetchCharacterList({
      sort, limit: PAGE_SIZE, offset: (p - 1) * PAGE_SIZE,
      ...(query  && { q: query }),
      ...(gender !== "all" && { gender }),
      ...(role !== "all" && { role }),
    })
      .then(data => {
        const items = Array.isArray(data) ? data : (data.items || []);
        const tot   = data.total ?? items.length;
        setChars(items);
        setTotal(tot);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [query, gender, sort, role, page]);

  useEffect(() => { setPage(1); }, [query, gender, sort, role]);
  useEffect(() => { load(page); }, [load, page]);
  usePageMeta("Персонажи");

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-2xl font-black text-white">Персонажи</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-faint)" }}>
          {loading ? "Загрузка…" : `Найдено: ${total}`}
        </p>
      </div>

      {/* Поиск + сортировка */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "var(--text-faint)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск персонажа по имени…"
            className="w-full rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none"
            style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
            onFocus={e => e.target.style.borderColor = "rgba(139,92,246,0.4)"}
            onBlur={e  => e.target.style.borderColor = "var(--border)"}
          />
        </div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="rounded-xl px-3 py-2.5 text-sm outline-none"
          style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
          {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Фильтр по полу */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider self-center mr-1"
          style={{ color: "var(--text-faint)" }}>Пол:</span>
        {GENDERS.map(g => (
          <button key={g.value} onClick={() => setGender(g.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={gender === g.value ? btnOn : btnOff}>
            {g.label}
          </button>
        ))}
      </div>

      {/* Результаты */}
      {error ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-sm mb-3" style={{ color: "#f87171" }}>{error}</p>
          <button onClick={load}
            className="text-sm px-4 py-2 rounded-xl"
            style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd", border: "none", cursor: "pointer" }}>
            Повторить
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array(18).fill(0).map((_,i) => <CharacterCardSkeleton key={i} />)}
        </div>
      ) : chars.length === 0 ? (
        <div className="text-center py-24" style={{ color: "var(--text-veryfaint)" }}>
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-sm">Ничего не найдено</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {chars.map(c => (
              <CharacterCard key={c.id} c={c} />
            ))}
          </div>
          {Math.ceil(total / PAGE_SIZE) > 1 && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 24 }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: page <= 1 ? "not-allowed" : "pointer", background: "var(--bg-elevated)", color: "var(--text-muted)", opacity: page <= 1 ? 0.4 : 1 }}>
                ← Назад
              </button>
              <span style={{ alignSelf: "center", fontSize: 13, color: "var(--text-muted)" }}>
                {page} / {Math.ceil(total / PAGE_SIZE)}
              </span>
              <button disabled={page >= Math.ceil(total / PAGE_SIZE)} onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: page >= Math.ceil(total / PAGE_SIZE) ? "not-allowed" : "pointer", background: "var(--bg-elevated)", color: "var(--text-muted)", opacity: page >= Math.ceil(total / PAGE_SIZE) ? 0.4 : 1 }}>
                Вперёд →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CharacterCard({ c }) {
  const favCount = c.favorites_count || 0;
  const roleLabel = ROLES[c.role] || c.role || "";

  return (
    <Link
      to={`/character/${c.id}`}
      className="group flex flex-col rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", textDecoration: "none" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(139,92,246,0.35)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>

      {/* Аватар */}
      <div className="relative overflow-hidden"
        style={{ height: "120px", backgroundColor: "var(--bg-elevated)" }}>
        {c.image_url ? (
          <img src={c.image_url} alt={c.name}
            className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
            loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl font-black"
            style={{ color: "var(--text-veryfaint)" }}>
            {c.name?.[0] || "?"}
          </div>
        )}

        {/* Пол */}
        {c.gender && (
          <span className="absolute top-2 right-2 text-xs font-bold px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: c.gender === "Ж" ? "rgba(244,63,94,0.3)" : "rgba(59,130,246,0.3)",
              color: c.gender === "Ж" ? "#fb7185" : "#93c5fd",
            }}>
            {c.gender === "Ж" ? "♀" : c.gender === "М" ? "♂" : c.gender}
          </span>
        )}

        {/* Избранное */}
        {favCount > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full px-2 py-0.5"
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
            <span style={{ color: "#f43f5e", fontSize: "0.65rem" }}>♥</span>
            <span className="text-xs font-bold" style={{ color: "#f43f5e" }}>{favCount}</span>
          </div>
        )}
      </div>

      {/* Инфо */}
      <div className="p-3 flex flex-col flex-1 gap-1">
        <p className="font-bold text-sm text-white leading-tight line-clamp-1 group-hover:text-violet-300 transition-colors">
          {c.name}
        </p>
        {c.name_jp && (
          <p className="text-xs line-clamp-1" style={{ color: "var(--text-veryfaint)" }}>{c.name_jp}</p>
        )}
        {roleLabel && (
          <p className="text-xs mt-auto pt-1" style={{ color: "var(--text-faint)" }}>{roleLabel}</p>
        )}
        {c.primary_anime_title && (
          <p className="text-xs line-clamp-1" style={{ color: "var(--text-faint)" }}>
            {c.primary_anime_title}
          </p>
        )}
      </div>
    </Link>
  );
}
