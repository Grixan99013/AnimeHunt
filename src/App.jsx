// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { createContext, useContext, useState } from "react";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import AnimePage from "./pages/AnimePage";
import CharacterPage from "./pages/CharacterPage";
import CharacterCatalog from "./pages/CharacterCatalog";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import AdminPage from "./pages/AdminPage";

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

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/"              element={<Home />} />
            <Route path="/catalog"       element={<Catalog />} />
            <Route path="/anime/:id"     element={<AnimePage />} />
            <Route path="/characters"    element={<CharacterCatalog />} />
            <Route path="/character/:id" element={<CharacterPage />} />
            <Route path="/login"         element={<Login />} />
            <Route path="/register"      element={<Register />} />
            <Route path="/profile"            element={<Private><Profile /></Private>} />
            <Route path="/profile/:username" element={<Profile />} />
            <Route path="/admin"         element={<AdminOnly><AdminPage /></AdminOnly>} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}
