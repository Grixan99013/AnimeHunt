// src/pages/Register.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { apiRegister } from "../api/api";

export default function Register() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]       = useState({ username:"", email:"", password:"", confirm:"" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) { setError("Пароль должен содержать не менее 6 символов."); return; }
    if (form.password !== form.confirm) { setError("Пароли не совпадают."); return; }
    setLoading(true);
    try {
      const user = await apiRegister({ username:form.username, email:form.email, password:form.password });
      login(user);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const strength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 6) s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p) && /[0-9]/.test(p)) s++;
    return s;
  })();
  const strengthLabel = ["","Слабый","Средний","Сильный"];
  const strengthColor = ["","#ef4444","#f59e0b","#10b981"];

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="rounded-2xl p-8 shadow-2xl"
          style={{ backgroundColor:"#13151c", border:"1px solid rgba(255,255,255,0.05)" }}>
          <div className="text-center mb-8">
            <span className="text-3xl font-black tracking-tighter"
              style={{ background:"linear-gradient(to right, #a78bfa, #e879f9)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              ANIME
            </span>
            <span className="text-3xl font-black tracking-tighter text-white">HUNT</span>
            <h2 className="text-lg font-bold text-white mt-3">Создать аккаунт</h2>
            <p className="text-sm mt-1" style={{ color:"#6b7280" }}>Присоединяйтесь к сообществу</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Имя пользователя" type="text" name="username" value={form.username}
              onChange={handleChange} placeholder="your_username" required minLength={3} />
            <Field label="Email" type="email" name="email" value={form.email}
              onChange={handleChange} placeholder="you@example.com" required />
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color:"#9ca3af" }}>Пароль</label>
              <input type="password" name="password" value={form.password} onChange={handleChange}
                placeholder="••••••••" required minLength={6}
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                style={{ backgroundColor:"#0d0f14", border:"1px solid rgba(255,255,255,0.1)" }}
                onFocus={e => e.target.style.borderColor="rgba(139,92,246,0.5)"}
                onBlur={e => e.target.style.borderColor="rgba(255,255,255,0.1)"} />
              {form.password && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 rounded-full h-1.5 overflow-hidden" style={{ background:"rgba(255,255,255,0.05)" }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width:`${(strength/3)*100}%`, backgroundColor:strengthColor[strength] }} />
                  </div>
                  <span className="text-xs" style={{ color:strengthColor[strength] }}>{strengthLabel[strength]}</span>
                </div>
              )}
            </div>
            <Field label="Подтвердите пароль" type="password" name="confirm" value={form.confirm}
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
              {loading ? "Создаём аккаунт…" : "Зарегистрироваться"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color:"#6b7280" }}>
            Уже есть аккаунт?{" "}
            <Link to="/login" className="font-medium" style={{ color:"#a78bfa" }}>Войти</Link>
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
