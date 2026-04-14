// src/components/Layout.jsx
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../App";
import { useState, useEffect, useRef } from "react";
import { globalSearch } from "../api/api";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Глобальный поиск
  const [searchQuery, setSearchQuery]   = useState("");
  const [searchOpen, setSearchOpen]     = useState(false);
  const [searchResults, setSearchResults] = useState({ anime: [], characters: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef  = useRef(null);
  const debounceRef = useRef(null);

  const handleLogout = () => { logout(); navigate("/"); };

  // Закрыть поиск при клике вне
  useEffect(() => {
    const handler = e => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Закрыть поиск при переходе
  useEffect(() => {
    setSearchOpen(false);
    setSearchQuery("");
  }, [location.pathname]);

  const handleSearchInput = e => {
    const q = e.target.value;
    setSearchQuery(q);
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setSearchResults({ anime: [], characters: [] }); setSearchOpen(false); return; }
    setSearchLoading(true);
    setSearchOpen(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await globalSearch(q);
        setSearchResults(res);
      } catch {}
      finally { setSearchLoading(false); }
    }, 300);
  };

  const handleSearchSubmit = e => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // Переходим на каталог аниме с параметром поиска
    navigate(`/catalog?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const goToCharacterSearch = () => {
    navigate(`/characters?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchOpen(false);
  };

  const hasResults = searchResults.anime.length > 0 || searchResults.characters.length > 0;

  const navLinks = [
    { to: "/",           label: "Главная"    },
    { to: "/catalog",    label: "Аниме"      },
    { to: "/characters", label: "Персонажи"  },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0d0f14", color: "white" }}>
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-white/5"
        style={{ backgroundColor: "rgba(13,15,20,0.92)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">

          {/* Логотип */}
          <Link to="/" className="flex items-center flex-shrink-0">
            <span className="text-2xl font-black tracking-tighter"
              style={{ background: "linear-gradient(to right,#a78bfa,#e879f9)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              ANIME
            </span>
            <span className="text-2xl font-black tracking-tighter text-white">HUNT</span>
          </Link>

          {/* Навигация — десктоп */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: location.pathname === link.to ? "rgba(139,92,246,0.2)" : "transparent",
                  color: location.pathname === link.to ? "#c4b5fd" : "#9ca3af",
                }}>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Глобальный поиск */}
          <div ref={searchRef} className="flex-1 relative max-w-sm hidden md:block">
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: "#6b7280" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input
                  value={searchQuery}
                  onChange={handleSearchInput}
                  onFocus={() => searchQuery.trim() && setSearchOpen(true)}
                  placeholder="Поиск аниме и персонажей…"
                  className="w-full rounded-xl py-2 pl-9 pr-3 text-sm text-white outline-none"
                  style={{ backgroundColor: "#1a1d26", border: "1px solid rgba(255,255,255,0.08)" }}
                />
              </div>
            </form>

            {/* Выпадающий список результатов */}
            {searchOpen && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden shadow-2xl z-50"
                style={{ backgroundColor: "#1a1d26", border: "1px solid rgba(255,255,255,0.08)", maxHeight: "420px", overflowY: "auto" }}>
                {searchLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-5 h-5 rounded-full border-2 animate-spin"
                      style={{ borderColor: "rgba(255,255,255,0.1)", borderTopColor: "#8b5cf6" }} />
                  </div>
                ) : !hasResults ? (
                  <p className="text-sm text-center py-6" style={{ color: "#4b5563" }}>Ничего не найдено</p>
                ) : (
                  <>
                    {/* Аниме */}
                    {searchResults.anime.length > 0 && (
                      <div>
                        <div className="px-4 py-2 flex items-center justify-between"
                          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#6b7280" }}>
                            Аниме
                          </span>
                          <button
                            onClick={() => { navigate(`/catalog?q=${encodeURIComponent(searchQuery)}`); setSearchOpen(false); }}
                            className="text-xs" style={{ color: "#a78bfa", background: "none", border: "none", cursor: "pointer" }}>
                            Все →
                          </button>
                        </div>
                        {searchResults.anime.map(a => (
                          <Link key={a.id} to={`/anime/${a.id}`}
                            className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                            style={{ textDecoration: "none" }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                            <div className="w-8 h-11 rounded-lg overflow-hidden flex-shrink-0"
                              style={{ backgroundColor: "#0d0f14" }}>
                              {a.poster_url
                                ? <img src={a.poster_url} alt="" className="w-full h-full object-cover" />
                                : <div className="w-full h-full" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{a.title}</p>
                              {a.title_jp && (
                                <p className="text-xs truncate" style={{ color: "#6b7280" }}>{a.title_jp}</p>
                              )}
                            </div>
                            {a.avg_rating && (
                              <span className="text-xs font-bold flex-shrink-0" style={{ color: "#fbbf24" }}>
                                ★ {Number(a.avg_rating).toFixed(1)}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Персонажи */}
                    {searchResults.characters.length > 0 && (
                      <div style={{ borderTop: searchResults.anime.length > 0 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                        <div className="px-4 py-2 flex items-center justify-between"
                          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#6b7280" }}>
                            Персонажи
                          </span>
                          <button
                            onClick={goToCharacterSearch}
                            className="text-xs" style={{ color: "#a78bfa", background: "none", border: "none", cursor: "pointer" }}>
                            Все →
                          </button>
                        </div>
                        {searchResults.characters.map(c => (
                          <Link key={c.id} to={`/character/${c.id}`}
                            className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                            style={{ textDecoration: "none" }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)"}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
                              style={{ backgroundColor: "#0d0f14", border: "1px solid rgba(255,255,255,0.08)" }}>
                              {c.image_url
                                ? <img src={c.image_url} alt="" className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-xs font-bold"
                                    style={{ color: "#4b5563" }}>{c.name?.[0]}</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                              {c.primary_anime_title && (
                                <p className="text-xs truncate" style={{ color: "#6b7280" }}>{c.primary_anime_title}</p>
                              )}
                            </div>
                            {c.favorites_count > 0 && (
                              <span className="text-xs flex-shrink-0" style={{ color: "#f43f5e" }}>
                                ♥ {c.favorites_count}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Правая часть — авторизация */}
          <div className="hidden md:flex items-center gap-3 ml-auto flex-shrink-0">
            {user ? (
              <>
                <Link to="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
                  style={{ color: "#d1d5db" }}>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#a21caf)" }}>
                    {user.username[0].toUpperCase()}
                  </span>
                  {user.username}
                </Link>
                <button onClick={handleLogout}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium border"
                  style={{ color: "#9ca3af", borderColor: "rgba(255,255,255,0.1)", background: "transparent", cursor: "pointer" }}>
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-4 py-1.5 rounded-lg text-sm font-medium"
                  style={{ color: "#d1d5db" }}>Войти</Link>
                <Link to="/register" className="px-4 py-1.5 rounded-lg text-sm font-medium text-white"
                  style={{ background: "linear-gradient(to right,#7c3aed,#a21caf)" }}>Регистрация</Link>
              </>
            )}
          </div>

          {/* Бургер — мобильный */}
          <button className="md:hidden p-2 ml-auto"
            style={{ color: "#9ca3af", background: "transparent", border: "none", cursor: "pointer" }}
            onClick={() => setMenuOpen(!menuOpen)}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              {menuOpen
                ? <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                : <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
              }
            </svg>
          </button>
        </div>

        {/* Мобильное меню */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/5 px-4 py-3 space-y-1"
            style={{ backgroundColor: "#13151c" }}>
            {navLinks.map(link => (
              <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm"
                style={{ color: location.pathname === link.to ? "#c4b5fd" : "#d1d5db",
                          backgroundColor: location.pathname === link.to ? "rgba(139,92,246,0.15)" : "transparent" }}>
                {link.label}
              </Link>
            ))}
            {/* Мобильный поиск */}
            <form onSubmit={e => { e.preventDefault(); navigate(`/catalog?q=${encodeURIComponent(searchQuery)}`); setMenuOpen(false); }}
              className="pt-2">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Поиск…"
                className="w-full rounded-xl px-4 py-2 text-sm text-white outline-none"
                style={{ backgroundColor: "#1a1d26", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </form>
            <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
              {user ? (
                <>
                  <Link to="/profile" onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-sm" style={{ color: "#d1d5db" }}>
                    Профиль ({user.username})
                  </Link>
                  <button onClick={() => { handleLogout(); setMenuOpen(false); }}
                    className="text-left px-3 py-2 text-sm"
                    style={{ color: "#f87171", background: "transparent", border: "none", cursor: "pointer" }}>
                    Выйти
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-sm" style={{ color: "#d1d5db" }}>Войти</Link>
                  <Link to="/register" onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-sm" style={{ color: "#a78bfa" }}>Регистрация</Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>

      <footer className="mt-16 border-t border-white/5 py-8 text-center text-sm"
        style={{ color: "#4b5563" }}>
        <p className="font-bold text-lg mb-1"
          style={{ background: "linear-gradient(to right,#a78bfa,#e879f9)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
          ANIMEHUNT
        </p>
        <p>{new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
