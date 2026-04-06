// src/pages/Login.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { apiLogin } from "../api/api";

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]       = useState({ email:"", password:"" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await apiLogin(form);
      login(user);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="rounded-2xl p-8 shadow-2xl"
          style={{ backgroundColor:"#13151c", border:"1px solid rgba(255,255,255,0.05)" }}>
          <div className="text-center mb-8">
            <span className="text-3xl font-black tracking-tighter"
              style={{ background:"linear-gradient(to right, #a78bfa, #e879f9)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              ANIME
            </span>
            <span className="text-3xl font-black tracking-tighter text-white">HUNT</span>
            <h2 className="text-lg font-bold text-white mt-3">С возвращением</h2>
            <p className="text-sm mt-1" style={{ color:"#6b7280" }}>Войдите в аккаунт</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email" type="email" name="email" value={form.email}
              onChange={handleChange} placeholder="you@example.com" required />
            <Field label="Пароль" type="password" name="password" value={form.password}
              onChange={handleChange} placeholder="••••••••" required />

            {error && (
              <p className="text-sm rounded-lg px-4 py-2"
                style={{ color:"#f87171", backgroundColor:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)" }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white"
              style={{ background:"linear-gradient(to right, #7c3aed, #a21caf)", opacity:loading?0.6:1, cursor:loading?"not-allowed":"pointer", border:"none" }}>
              {loading ? "Входим…" : "Войти"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color:"#6b7280" }}>
            Нет аккаунта?{" "}
            <Link to="/register" className="font-medium" style={{ color:"#a78bfa" }}>Зарегистрироваться</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider" style={{ color:"#9ca3af" }}>{label}</label>
      <input {...props}
        className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
        style={{ backgroundColor:"#0d0f14", border:"1px solid rgba(255,255,255,0.1)" }}
        onFocus={e => e.target.style.borderColor="rgba(139,92,246,0.5)"}
        onBlur={e => e.target.style.borderColor="rgba(255,255,255,0.1)"} />
    </div>
  );
}
