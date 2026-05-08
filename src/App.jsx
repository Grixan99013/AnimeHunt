// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { createContext, useContext, useState, lazy, Suspense } from "react";
import Layout from "./components/Layout";
import { ThemeProvider } from "./context/ThemeContext";

// Lazy-loaded страницы (code splitting)
const Home             = lazy(() => import("./pages/Home"));
const Catalog          = lazy(() => import("./pages/Catalog"));
const AnimePage        = lazy(() => import("./pages/AnimePage"));
const CharacterPage    = lazy(() => import("./pages/CharacterPage"));
const CharacterCatalog = lazy(() => import("./pages/CharacterCatalog"));
const SeriesPage       = lazy(() => import("./pages/SeriesPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const CollectionPage   = lazy(() => import("./pages/CollectionsPage"));
const Login            = lazy(() => import("./pages/Login"));
const Register         = lazy(() => import("./pages/Register"));
const Profile          = lazy(() => import("./pages/Profile"));
const AdminPage        = lazy(() => import("./pages/AdminPage"));

export const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { const s=localStorage.getItem("anime_user"); if(!s) return null; const {token,...u}=JSON.parse(s); return u; }
    catch { return null; }
  });
  const login  = u => setUser(u);
  const logout = () => { setUser(null); localStorage.removeItem("anime_user"); };
  return <AuthContext.Provider value={{user,login,logout}}>{children}</AuthContext.Provider>;
}

function Private({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function AdminOnly({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role_id !== 1) return <Navigate to="/" replace />;
  return children;
}

function PageLoader() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)",
        borderTopColor: "#8b5cf6", animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <Router>
        <Layout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/"                   element={<Home />} />
              <Route path="/catalog"            element={<Catalog />} />
              <Route path="/anime/:id"          element={<AnimePage />} />
              <Route path="/characters"         element={<CharacterCatalog />} />
              <Route path="/character/:id"      element={<CharacterPage />} />
              <Route path="/series/:id"         element={<SeriesPage />} />
              <Route path="/notifications"      element={<Private><NotificationsPage /></Private>} />
              <Route path="/collections/:id"    element={<CollectionPage />} />
              <Route path="/login"              element={<Login />} />
              <Route path="/register"           element={<Register />} />
              <Route path="/profile"            element={<Private><Profile /></Private>} />
              <Route path="/profile/:username"  element={<Profile />} />
              <Route path="/admin"              element={<AdminOnly><AdminPage /></AdminOnly>} />
            </Routes>
          </Suspense>
        </Layout>
      </Router>
    </AuthProvider>
    </ThemeProvider>
  );
}
