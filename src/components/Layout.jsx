// src/components/Layout.jsx
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../App";
import { useState, useEffect, useRef } from "react";
import { globalSearch } from "../api/api";
import NotificationBell from "./NotificationBell";
import { useTheme } from "../context/ThemeContext";

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
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}>
      <header className="sticky top-0 z-50 backdrop-blur-md border-b"
        style={{ backgroundColor: "var(--header-bg)", borderColor: "var(--border)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">

          {/* Логотип */}
          <Link to="/" className="flex items-center flex-shrink-0">
            <span className="text-2xl font-black tracking-tighter"
              style={{ background: "linear-gradient(to right,#a78bfa,#e879f9)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              ANIME
            </span>
            <span className="text-2xl font-black tracking-tighter logo-hunt" style={{ color: "var(--text-primary)" }}>HUNT</span>
          </Link>

          {/* Навигация — десктоп */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: location.pathname === link.to ? "rgba(139,92,246,0.2)" : "transparent",
                  color: location.pathname === link.to ? "#c4b5fd" : "var(--text-muted)",
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
                  className="w-full rounded-xl py-2 pl-9 pr-3 text-sm outline-none"
                  style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>
            </form>

            {/* Выпадающий список результатов */}
            {searchOpen && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden shadow-2xl z-50"
                style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", maxHeight: "420px", overflowY: "auto" }}>
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
                              style={{ backgroundColor: "var(--bg-base)" }}>
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
                              style={{ backgroundColor: "var(--bg-base)", border: "1px solid var(--border)" }}>
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
            <ThemeToggle />
            {user && <NotificationBell />}
            {user ? (
              <>
                <Link to="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
                  style={{ color: "var(--text-secondary)" }}>
                  <span className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: user.avatar_url ? "transparent" : "linear-gradient(135deg,#7c3aed,#a21caf)", border: "1px solid rgba(255,255,255,0.15)" }}>
                    {user.avatar_url
                      ? <img src={user.avatar_url} alt={user.username} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      : user.username[0].toUpperCase()}
                  </span>
                  {user.username}
                </Link>
                <button onClick={handleLogout}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium border"
                  style={{ color: "var(--text-muted)", borderColor: "var(--border)", background: "transparent", cursor: "pointer" }}>
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-4 py-1.5 rounded-lg text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}>Войти</Link>
                <Link to="/register" className="px-4 py-1.5 rounded-lg text-sm font-medium text-white"
                  style={{ background: "linear-gradient(to right,#7c3aed,#a21caf)" }}>Регистрация</Link>
              </>
            )}
          </div>

          {/* Бургер — мобильный */}
          <button className="md:hidden p-2 ml-auto"
            style={{ color: "var(--text-muted)", background: "transparent", border: "none", cursor: "pointer" }}
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
            style={{ backgroundColor: "var(--bg-surface)" }}>
            {navLinks.map(link => (
              <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm"
                style={{ color: location.pathname === link.to ? "#c4b5fd" : "var(--text-secondary)",
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
                className="w-full rounded-xl px-4 py-2 text-sm outline-none"
                style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
            </form>
            <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
              {/* Переключатель темы в мобильном меню */}
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>Тема</span>
                <ThemeToggle />
              </div>
              {user ? (
                <>
                  <Link to="/profile" onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    Профиль ({user.username})
                  </Link>
                  <Link to="/notifications" onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    🔔 Уведомления
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
                    className="block px-3 py-2 text-sm" style={{ color: "var(--text-secondary)" }}>Войти</Link>
                  <Link to="/register" onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-sm" style={{ color: "#a78bfa" }}>Регистрация</Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>

      <footer className="mt-16 border-t py-8 text-center text-sm"
        style={{ color: "var(--text-faint)", borderColor: "var(--border)" }}>
        <p className="font-bold text-lg mb-1"
          style={{ background: "linear-gradient(to right,#a78bfa,#e879f9)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
          ANIMEHUNT
        </p>
        <p>{new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

// ── Кнопка переключения темы ──────────────────────────────────
function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      title={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
      style={{
        background: "none", border: "none", cursor: "pointer",
        padding: 6, borderRadius: 8, display: "flex", alignItems: "center",
        color: "var(--text-faint)",
        transition: "color .15s",
      }}
      onMouseEnter={e => e.currentTarget.style.color = "var(--accent-light)"}
      onMouseLeave={e => e.currentTarget.style.color = "var(--text-faint)"}
    >
      {isDark ? (
        /* Солнце */
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        /* Луна */
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}
