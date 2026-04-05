// src/components/Layout.jsx
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../App";
import { useState } from "react";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navLinks = [
    { to: "/",        label: "Home" },
    { to: "/catalog", label: "Catalog" },
    { to: "/about",   label: "About" },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0d0f14", color: "white" }}>
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-white/5"
        style={{ backgroundColor: "rgba(13,15,20,0.92)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

          <Link to="/" className="flex items-center">
            <span className="text-2xl font-black tracking-tighter"
              style={{ background: "linear-gradient(to right, #a78bfa, #e879f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              ANIME
            </span>
            <span className="text-2xl font-black tracking-tighter text-white">HUNT</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: location.pathname === link.to ? "rgba(139,92,246,0.2)" : "transparent",
                  color: location.pathname === link.to ? "#c4b5fd" : "#9ca3af",
                }}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link to="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
                  style={{ color: "#d1d5db" }}>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #a21caf)" }}>
                    {user.username[0].toUpperCase()}
                  </span>
                  {user.username}
                </Link>
                <button onClick={handleLogout}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium border"
                  style={{ color: "#9ca3af", borderColor: "rgba(255,255,255,0.1)", background: "transparent" }}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-4 py-1.5 rounded-lg text-sm font-medium"
                  style={{ color: "#d1d5db" }}>Sign In</Link>
                <Link to="/register" className="px-4 py-1.5 rounded-lg text-sm font-medium text-white"
                  style={{ background: "linear-gradient(to right, #7c3aed, #a21caf)" }}>Register</Link>
              </>
            )}
          </div>

          <button className="md:hidden p-2" style={{ color: "#9ca3af", background: "transparent", border: "none", cursor: "pointer" }}
            onClick={() => setMenuOpen(!menuOpen)}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              {menuOpen
                ? <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                : <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
              }
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-white/5 px-4 py-3 space-y-1"
            style={{ backgroundColor: "#13151c" }}>
            {navLinks.map(link => (
              <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm" style={{ color: "#d1d5db" }}>
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
              {user ? (
                <>
                  <Link to="/profile" onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-sm" style={{ color: "#d1d5db" }}>
                    Profile ({user.username})
                  </Link>
                  <button onClick={() => { handleLogout(); setMenuOpen(false); }}
                    className="text-left px-3 py-2 text-sm" style={{ color: "#f87171", background: "transparent", border: "none", cursor: "pointer" }}>
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-sm" style={{ color: "#d1d5db" }}>Sign In</Link>
                  <Link to="/register" onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 text-sm" style={{ color: "#a78bfa" }}>Register</Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      <footer className="mt-16 border-t border-white/5 py-8 text-center text-sm"
        style={{ color: "#4b5563" }}>
        <p className="font-bold text-lg mb-1"
          style={{ background: "linear-gradient(to right, #a78bfa, #e879f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          ANIMEHUNT
        </p>
        <p>Your anime encyclopedia © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
