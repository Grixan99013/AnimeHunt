// src/pages/Register.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { registerUser } from "../api/db";

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]     = useState({ username: "", email: "", password: "", confirm: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const user = registerUser({ username: form.username, email: form.email, password: form.password });
      login(user);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Password strength
  const strength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 6)  s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p) && /[0-9]/.test(p)) s++;
    return s; // 0-3
  })();
  const strengthLabel = ["", "Weak", "Medium", "Strong"];
  const strengthColor = ["", "bg-red-500", "bg-amber-500", "bg-emerald-500"];

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-[#13151c] border border-white/5 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <span className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
              ANI<span className="text-white">VERSE</span>
            </span>
            <h2 className="text-lg font-bold text-white mt-3">Create account</h2>
            <p className="text-sm text-gray-500 mt-1">Join the community</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              label="Username"
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="your_username"
              required
              minLength={3}
            />
            <Field
              label="Email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full bg-[#0d0f14] border border-white/10 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-all"
              />
              {form.password && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${strengthColor[strength]}`}
                      style={{ width: `${(strength / 3) * 100}%` }}
                    />
                  </div>
                  <span className={`text-xs ${["","text-red-400","text-amber-400","text-emerald-400"][strength]}`}>
                    {strengthLabel[strength]}
                  </span>
                </div>
              )}
            </div>
            <Field
              label="Confirm Password"
              type="password"
              name="confirm"
              value={form.confirm}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 transition-all text-white shadow-lg shadow-violet-500/20"
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</label>
      <input
        {...props}
        className="w-full bg-[#0d0f14] border border-white/10 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-all"
      />
    </div>
  );
}
