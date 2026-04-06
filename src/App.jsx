// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { createContext, useContext, useState } from "react";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import AnimePage from "./pages/AnimePage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";

export const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("anime_user");
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      // Убираем token из объекта user для отображения
      const { token, ...userOnly } = parsed;
      return userOnly;
    } catch { return null; }
  });

  const login = (userData) => setUser(userData);

  const logout = () => {
    setUser(null);
    localStorage.removeItem("anime_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/"          element={<Home />} />
            <Route path="/catalog"   element={<Catalog />} />
            <Route path="/anime/:id" element={<AnimePage />} />
            <Route path="/login"     element={<Login />} />
            <Route path="/register"  element={<Register />} />
            <Route path="/profile"   element={<PrivateRoute><Profile /></PrivateRoute>} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}
