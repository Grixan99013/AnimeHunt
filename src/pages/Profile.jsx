// src/pages/Profile.jsx
import { useState, useEffect, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import {
  fetchWatchlist, fetchMyComments, fetchMyFavorites, fetchMyReviews,
  upsertWatchlist, removeFromWatchlist,
  ROLES, WATCH_STATUSES, changePassword, deleteAccount, updateUserProfile,
} from "../api/api";
import { usePageMeta } from "../hooks/usePageMeta";
import RatingsHistory, { ScoreBarChart } from "../components/RatingsHistory";
import { UserCollections } from "../pages/CollectionsPage";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

function getToken() {
  try { const r = localStorage.getItem("anime_user"); return r ? JSON.parse(r).token : null; }
  catch { return null; }
}

async function req(path, opts = {}) {
  const h = { "Content-Type": "application/json" };
  const t = getToken(); if (t) h["Authorization"] = `Bearer ${t}`;
  Object.assign(h, opts.headers || {});
  const res = await fetch(`${BASE}${path}`, { ...opts, headers: h });
  const d = await res.json();
  if (!res.ok) throw new Error(d.error || `Ошибка ${res.status}`);
  return d;
}

const fetchPublicProfile = (username) => req(`/user/profile/${username}`);
const updatePrivacy      = (data)     => req("/user/privacy", { method: "PATCH", body: JSON.stringify(data) });

const TABS_OWN    = ["Списки", "Коллекции", "Избранное", "Рецензии", "Комментарии", "Настройки"];
const TABS_OTHER  = ["Списки", "Коллекции", "Избранное", "Рецензии"];

// ── Аватар хелпер ───────────────────────────────────────────
function Avatar({ url, username, size = 64, onClick }) {
  const letter = (username || "?")[0].toUpperCase();
  return (
    <div
      onClick={onClick}
      className="rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-black text-white"
      style={{
        width: size, height: size, flexShrink: 0,
        background: url ? "transparent" : "linear-gradient(135deg,#7c3aed,#a21caf)",
        cursor: onClick ? "pointer" : "default",
        border: "2px solid var(--border)",
        fontSize: size * 0.35,
      }}>
      {url
        ? <img src={url} alt={username} className="w-full h-full object-cover" />
        : letter}
    </div>
  );
}

// ── Компонент загрузки аватара ───────────────────────────────
function AvatarUploader({ user, onUpdate }) {
  const fileRef    = useRef(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Максимальный размер — 5 МБ"); return; }
    setPreview(URL.createObjectURL(file));

    const upload = async () => {
      setLoading(true);
      try {
        const t = getToken();
        const fd = new FormData();
        fd.append("avatar", file);
        const res = await fetch(`${BASE}/user/avatar`, {
          method: "POST",
          headers: { Authorization: `Bearer ${t}` },
          body: fd,
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        onUpdate(d);
      } catch (err) { alert(err.message); setPreview(null); }
      finally { setLoading(false); }
    };
    upload();
  };

  const handleDelete = async () => {
    if (!confirm("Удалить аватар?")) return;
    setLoading(true);
    try {
      await req("/user/avatar", { method: "DELETE" });
      onUpdate({ avatar_url: null });
      setPreview(null);
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  const currentUrl = preview || user.avatar_url;

  return (
    <div className="flex items-center gap-4">
      {/* Аватар с кликом */}
      <div className="relative group">
        <Avatar url={currentUrl} username={user.username} size={80} onClick={() => fileRef.current?.click()} />
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: "rgba(0,0,0,0.55)", cursor: "pointer" }}
          onClick={() => fileRef.current?.click()}>
          {loading
            ? <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
            : <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold text-white">Аватар профиля</p>
        <p className="text-xs" style={{ color: "var(--text-faint)" }}>JPG, PNG, GIF, WEBP · до 5 МБ</p>
        <div className="flex gap-2">
          <button onClick={() => fileRef.current?.click()} disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ backgroundColor: "rgba(139,92,246,0.2)", color: "#c4b5fd", border: "none", cursor: "pointer" }}>
            Изменить
          </button>
          {currentUrl && (
            <button onClick={handleDelete} disabled={loading}
              className="text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#f87171", border: "none", cursor: "pointer" }}>
              Удалить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Смена пароля ─────────────────────────────────────────────
function PasswordChange() {
  const [cur, setCur]   = useState("");
  const [nw,  setNw]    = useState("");
  const [nw2, setNw2]   = useState("");
  const [err, setErr]   = useState("");
  const [ok,  setOk]    = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setErr(""); setOk(false);
    if (!cur || !nw || !nw2) return setErr("Заполните все поля");
    if (nw.length < 6)       return setErr("Новый пароль — минимум 6 символов");
    if (nw !== nw2)          return setErr("Пароли не совпадают");
    setSaving(true);
    try {
      await changePassword({ current_password: cur, new_password: nw });
      setOk(true); setCur(""); setNw(""); setNw2("");
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const inp = (val, set, placeholder, type = "password") => (
    <input type={type} value={val} onChange={e => { set(e.target.value); setErr(""); setOk(false); }}
      placeholder={placeholder}
      className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
      style={{ backgroundColor: "var(--bg-base)", border: "1px solid var(--border)" }} />
  );

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-white">Смена пароля</h3>
      {inp(cur, setCur, "Текущий пароль")}
      {inp(nw,  setNw,  "Новый пароль")}
      {inp(nw2, setNw2, "Повторите новый пароль")}
      {err && <p className="text-xs" style={{ color: "#f87171" }}>{err}</p>}
      {ok  && <p className="text-xs" style={{ color: "#34d399" }}>Пароль успешно изменён!</p>}
      <button onClick={submit} disabled={saving}
        className="px-5 py-2 rounded-xl text-sm font-semibold"
        style={{ background: saving ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.25)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.35)", cursor: saving ? "not-allowed" : "pointer" }}>
        {saving ? "Сохранение…" : "Изменить пароль"}
      </button>
    </div>
  );
}

// ── Настройки приватности ─────────────────────────────────────
function PrivacySettings({ privacy, onChange }) {
  const [saving, setSaving] = useState(false);
  const [local, setLocal]   = useState(privacy);

  const save = async (newVal) => {
    setSaving(true);
    try {
      await updatePrivacy(newVal);
      setLocal(newVal);
      onChange(newVal);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const toggle = (key) => {
    const next = { ...local, [key]: !local[key] };
    save(next);
  };

  const rows = [
    { key: "hide_email",     label: "Скрыть email",            desc: "Другие пользователи не увидят ваш email" },
    { key: "hide_watchlist", label: "Скрыть список просмотра", desc: "Другие пользователи не смогут видеть ваши списки аниме" },
  ];

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-white">Приватность</h3>
      {rows.map(r => (
        <div key={r.key}
          className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{ backgroundColor: "var(--bg-base)", border: "1px solid var(--border)" }}>
          <div>
            <p className="text-sm font-medium text-white">{r.label}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>{r.desc}</p>
          </div>
          <button
            onClick={() => toggle(r.key)}
            disabled={saving}
            className="relative flex-shrink-0 ml-4"
            style={{
              width: 44, height: 24, borderRadius: 12,
              backgroundColor: local[r.key] ? "#7c3aed" : "var(--bg-elevated)",
              border: "none", cursor: saving ? "not-allowed" : "pointer",
              transition: "background-color 0.2s",
              opacity: saving ? 0.6 : 1,
            }}>
            <span style={{
              position: "absolute", top: 3, left: local[r.key] ? 23 : 3,
              width: 18, height: 18, borderRadius: "50%",
              backgroundColor: "white", transition: "left 0.2s",
              display: "block",
            }} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Главная страница профиля ─────────────────────────────────
export default function ProfilePage() {
  const { username } = useParams();          // /profile/:username или /profile (свой)
  const { user: authUser, logout, login } = useAuth();
  const navigate = useNavigate();

  const isSelf = !username || (authUser && authUser.username === username);

  // Данные профиля
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  // Свои данные (комментарии только у себя)
  const [myComments, setMyComments] = useState([]);

  const [activeTab, setActiveTab] = useState("Списки");
  const TABS = isSelf ? TABS_OWN : TABS_OTHER;

  // Локальный стейт watchlist — позволяет обновлять без перезагрузки
  // ⚠️ Хук ДОЛЖЕН быть до любых conditional return
  const [localWatchlist, setLocalWatchlist] = useState(null);
  useEffect(() => { setLocalWatchlist(null); }, [profile]);  // сброс при смене профиля

  useEffect(() => {
    setLoading(true);
    setError("");
    const target = username || authUser?.username;
    if (!target) { navigate("/login"); return; }

    fetchPublicProfile(target)
      .then(p => {
        setProfile(p);
        if (isSelf) {
          // Загружаем свои комментарии отдельно
          fetchMyComments().then(setMyComments).catch(() => {});
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [username, authUser?.username]);

  // После обновления аватара — обновляем auth контекст
  const handleAvatarUpdate = ({ avatar_url, token, user: updUser }) => {
    if (token && updUser) {
      localStorage.setItem("anime_user", JSON.stringify({ ...updUser, token }));
      login(updUser);
    }
    setProfile(p => ({ ...p, avatar_url: avatar_url || null }));
  };

  const handlePrivacyChange = (newPrivacy) => {
    setProfile(p => ({ ...p, ...newPrivacy }));
  };

  if (!authUser && !username) return null;

  if (loading) return (
    <div className="flex justify-center py-32">
      <div className="w-8 h-8 rounded-full border-2 animate-spin"
        style={{ borderColor: "var(--border)", borderTopColor: "#8b5cf6" }} />
    </div>
  );

  if (error || !profile) return (
    <div className="text-center py-24" style={{ color: "var(--text-faint)" }}>
      <p className="text-4xl mb-4">😶</p>
      <p>{error || "Пользователь не найден"}</p>
      <Link to="/" style={{ color: "#a78bfa" }} className="text-sm mt-2 inline-block">← На главную</Link>
    </div>
  );

  // Производные от profile — обычные переменные, не хуки
  const watchlist = profile ? (localWatchlist ?? (profile.watchlist || [])) : [];
  const byStatus  = Object.keys(WATCH_STATUSES).reduce((acc, k) => {
    acc[k] = watchlist.filter(e => e.status === k);
    return acc;
  }, {});

  const handleWatchlistUpdate = (animeId, newEntry) => {
    setLocalWatchlist(prev => {
      const base = prev ?? (profile?.watchlist || []);
      if (!newEntry) return base.filter(e => e.id !== animeId);
      return base.map(e => e.id === animeId ? { ...e, ...newEntry } : e);
    });
  };

  const stats = profile?.stats || {};

  return (
    <div className="max-w-3xl mx-auto space-y-8">

      {/* Заголовок */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-black text-white">
          {isSelf ? "Мой профиль" : `Профиль: ${profile.username}`}
        </h1>
      </div>

      {/* Карточка пользователя */}
      <div className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>

        {/* Баннер */}
        {profile.banner_url && (
          <div style={{ height: 130, overflow: "hidden" }}>
            <img src={profile.banner_url} alt="banner"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              onError={e => { e.target.parentElement.style.display = "none"; }} />
          </div>
        )}

        <div className="p-6">
          <div className="flex items-start gap-5">
            {/* Аватар */}
            <div className="flex-shrink-0" style={{ marginTop: profile.banner_url ? -40 : 0 }}>
              <div style={{ border: "3px solid var(--bg-surface)", borderRadius: "50%", display: "inline-block" }}>
                <Avatar url={profile.avatar_url} username={profile.username} size={72} />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <p className="text-lg font-bold text-white">{profile.username}</p>
                  <span className="inline-block mt-0.5 text-xs px-2 py-0.5 rounded-full capitalize"
                    style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd" }}>
                    {ROLES[profile.role_id] || "пользователь"}
                  </span>
                </div>
                <p className="text-xs" style={{ color: "var(--text-veryfaint)" }}>
                  на сайте с {new Date(profile.created_at).toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
                </p>
              </div>

              {/* Мета-строка: email, локация, сайт */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                {profile.email && (
                  <span className="text-sm flex items-center gap-1" style={{ color: "var(--text-faint)" }}>
                    ✉ {profile.email}
                    {isSelf && profile.hide_email && (
                      <span className="text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: "var(--bg-elevated)", color: "var(--text-veryfaint)" }}>скрыт</span>
                    )}
                  </span>
                )}
                {!profile.email && !isSelf && (
                  <span className="text-sm" style={{ color: "var(--text-veryfaint)" }}>✉ Email скрыт</span>
                )}
                {profile.location && (
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>📍 {profile.location}</span>
                )}
                {profile.website && (
                  <a href={profile.website} target="_blank" rel="noopener noreferrer"
                    className="text-sm" style={{ color: "#7c3aed", textDecoration: "none" }}>
                    🔗 {profile.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>

              {isSelf && profile.role_id === 1 && (
                <Link to="/admin"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white mt-3"
                  style={{ background: "linear-gradient(to right,#7c3aed,#a21caf)", textDecoration: "none" }}>
                  Комната администратора
                </Link>
              )}
            </div>
          </div>

          {/* Биография */}
          {profile.bio && (
            <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--text-muted)", maxWidth: 560 }}>
              {profile.bio}
            </p>
          )}

          {/* Социальные сети */}
          {profile.social_links && Object.values(profile.social_links).some(Boolean) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {Object.entries(profile.social_links).map(([net, raw]) => {
                if (!raw) return null;
                const icons = { vk:"VK", telegram:"TG", twitter:"𝕏", discord:"DS", youtube:"YT", mal:"MAL" };
                const href = resolveSocialUrl(net, raw);
                if (!href) return null;
                return (
                  <a key={net} href={href} target="_blank" rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded-full font-semibold"
                    style={{
                      background: "rgba(124,58,237,0.12)", color: "#a78bfa",
                      border: "1px solid rgba(124,58,237,0.25)", textDecoration: "none",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background="rgba(124,58,237,0.25)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background="rgba(124,58,237,0.12)"; }}>
                    {icons[net] || net} ↗
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: "Смотрю",    value: stats.watching  || 0, color: "#60a5fa" },
          { label: "Просмотрено", value: stats.completed || 0, color: "#34d399" },
          { label: "Планы",     value: stats.planned   || 0, color: "#a78bfa" },
          { label: "Отложено",  value: stats.on_hold   || 0, color: "#fbbf24" },
          { label: "Дропнуто",  value: stats.dropped   || 0, color: "#f87171" },
          { label: "Избранных", value: stats.favorites || 0, color: "#f43f5e" },
          { label: "Рецензий",  value: stats.reviews   || 0, color: "#fbbf24" },
          { label: "Коммент.",  value: stats.comments  || 0, color: "#e879f9" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-3 text-center"
            style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Табы */}
      <div className="flex gap-1 overflow-x-auto" style={{ borderBottom: "1px solid var(--border)" }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-2 text-sm font-medium whitespace-nowrap"
            style={{
              color: activeTab === tab ? "#c4b5fd" : "#6b7280",
              borderBottom: activeTab === tab ? "2px solid #8b5cf6" : "2px solid transparent",
              background: "transparent", border: "none",
              borderBottom: activeTab === tab ? "2px solid #8b5cf6" : "2px solid transparent",
              cursor: "pointer",
            }}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Списки ─────────────────────────────────────────── */}
      {activeTab === "Списки" && (
        <div>
          {/* Кнопки экспорта (только для себя, если есть записи) */}
          {isSelf && profile.watchlist !== null && watchlist.length > 0 && (
            <ExportWatchlist watchlist={watchlist} username={profile.username} />
          )}
          {/* Список скрыт */}
          {profile.watchlist === null ? (
            <div className="text-center py-16" style={{ color: "var(--text-veryfaint)" }}>
              <p className="text-3xl mb-3">🔒</p>
              <p className="text-sm">Пользователь скрыл свои списки</p>
            </div>
          ) : watchlist.length === 0 ? (
            <Empty icon="📋" text="Список пуст" link={isSelf ? "/catalog" : null} linkText="Перейти в каталог →" />
          ) : (
            <div className="space-y-8">
              {Object.entries(WATCH_STATUSES).map(([key, meta]) => {
                const items = byStatus[key] || [];
                if (!items.length) return null;
                return (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="text-base font-bold" style={{ color: meta.color }}>{meta.label}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: meta.bg, color: meta.color }}>{items.length}</span>
                    </div>
                    <div className="space-y-2">
                      {items.map(entry => <WatchEntry key={entry.id} entry={entry} statusKey={key} isSelf={isSelf} onUpdate={handleWatchlistUpdate} allStatuses={WATCH_STATUSES} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* График распределения оценок */}
          {profile.watchlist !== null && watchlist.length > 0 && (
            <div className="mt-8">
              <ScoreBarChart username={profile.username} isSelf={isSelf} />
            </div>
          )}
        </div>
      )}

      {/* ── Избранное ─────────────────────────────────────── */}
      {activeTab === "Избранное" && (
        profile.favorites?.length === 0 ? (
          <Empty icon="♡" text="Нет избранных персонажей" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(profile.favorites || []).map(fav => (
              <Link key={fav.id} to={`/character/${fav.id}`}
                className="flex items-center gap-4 rounded-xl px-4 py-3 transition-all group"
                style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", textDecoration: "none" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(244,63,94,0.3)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
                  style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                  {fav.image_url
                    ? <img src={fav.image_url} alt={fav.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center font-bold" style={{ color: "var(--text-veryfaint)" }}>{fav.name[0]}</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-white truncate group-hover:text-pink-400 transition-colors">{fav.name}</p>
                  {fav.name_jp && <p className="text-xs truncate" style={{ color: "var(--text-veryfaint)" }}>{fav.name_jp}</p>}
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>из <span style={{ color: "#a78bfa" }}>{fav.anime_title}</span></p>
                </div>
                <span className="text-lg flex-shrink-0" style={{ color: "#f43f5e" }}>♥</span>
              </Link>
            ))}
          </div>
        )
      )}

      {/* ── Рецензии ─────────────────────────────────────── */}
      {activeTab === "Рецензии" && (
        !profile.reviews?.length ? (
          <Empty icon="📝" text="Рецензий пока нет" link={isSelf ? "/catalog" : null} linkText="Найти аниме →" />
        ) : (
          <div className="space-y-4">
            {(profile.reviews || []).map(rv => (
              <Link key={rv.id} to={`/anime/${rv.anime_id}`}
                className="block rounded-2xl overflow-hidden transition-all"
                style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", textDecoration: "none" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(251,191,36,0.25)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: "var(--bg-elevated)" }}>
                    {rv.anime_poster && <img src={rv.anime_poster} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold mb-0.5" style={{ color: "#a78bfa" }}>{rv.anime_title}</p>
                    <p className="font-bold text-sm text-white truncate">{rv.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>{new Date(rv.created_at).toLocaleDateString("ru-RU")}</p>
                  </div>
                  <div className="flex-shrink-0 text-center">
                    <p className="text-xl font-black" style={{ color: "#fbbf24" }}>★ {rv.score}</p>
                    <p className="text-xs" style={{ color: "var(--text-faint)" }}>/10</p>
                  </div>
                </div>
                <div className="px-5 pb-4">
                  <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: "var(--text-muted)" }}>{rv.body}</p>
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      {/* ── Коллекции ──────────────────────────────────────── */}
      {activeTab === "Коллекции" && (
        <UserCollections username={profile.username} isSelf={isSelf} />
      )}

      {/* ── История оценок ──────────────────────────────────── */}
      {/* ── Комментарии (только свои) ─────────────────────── */}
      {activeTab === "Комментарии" && isSelf && (
        !myComments.length ? (
          <Empty icon="💬" text="Вы ещё не оставляли комментариев" />
        ) : (
          <div className="space-y-3">
            {myComments.map(c => (
              <Link key={c.id} to={`/anime/${c.anime_id}`}
                className="block rounded-xl px-4 py-3 text-sm transition-all"
                style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", textDecoration: "none" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(139,92,246,0.2)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                <p className="text-xs font-semibold mb-1" style={{ color: "#a78bfa" }}>{c.anime_title}</p>
                <p style={{ color: "var(--text-secondary)" }}>{c.body}</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-veryfaint)" }}>{new Date(c.created_at).toLocaleDateString("ru-RU")}</p>
              </Link>
            ))}
          </div>
        )
      )}

      {/* ── Настройки (только свои) ──────────────────────── */}
      {activeTab === "Настройки" && isSelf && (
        <div className="space-y-6">
          {/* Аватар */}
          <div className="rounded-2xl p-5 space-y-5"
            style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <h3 className="font-semibold text-white">Аватар профиля</h3>
            <AvatarUploader user={profile} onUpdate={handleAvatarUpdate} />
          </div>

          {/* Расширенный профиль */}
          <div className="rounded-2xl p-5 space-y-4"
            style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <ProfileEditor profile={profile} onUpdate={updated => setProfile(p => ({ ...p, ...updated }))} />
          </div>

          {/* Смена пароля */}
          <div className="rounded-2xl p-5"
            style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <PasswordChange />
          </div>

          {/* Приватность */}
          <div className="rounded-2xl p-5"
            style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            <PrivacySettings
              privacy={{ hide_email: profile.hide_email, hide_watchlist: profile.hide_watchlist }}
              onChange={handlePrivacyChange}
            />
          </div>

          {/* Удаление аккаунта */}
          <DeleteAccount onDeleted={() => { logout(); navigate("/"); }} />

          {/* Выйти */}
          <button onClick={logout}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", background: "transparent", cursor: "pointer" }}>
            Выйти из аккаунта
          </button>
        </div>
      )}

      {/* Кнопка выйти — для своего профиля вне настроек */}
      {isSelf && activeTab !== "Настройки" && (
        <button onClick={logout}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", background: "transparent", cursor: "pointer" }}>
          Выйти из аккаунта
        </button>
      )}
    </div>
  );
}


// ── Экспорт списка в CSV / JSON ────────────────────────────────
function ExportWatchlist({ watchlist, username }) {
  const [open, setOpen] = useState(false);

  function downloadCSV() {
    const headers = ["ID", "Название", "Название (JP)", "Статус", "Эпизоды просмотрено", "Всего эпизодов", "Моя оценка", "Тип", "Год"];
    const rows = watchlist.map(e => [
      e.id,
      `"${(e.title || "").replace(/"/g, '""')}"`,
      `"${(e.title_jp || "").replace(/"/g, '""')}"`,
      e.status,
      e.episodes_watched || 0,
      e.episodes || "",
      e.my_rating || "",
      e.type || "",
      e.aired_from ? String(e.aired_from).slice(0, 4) : "",
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${username}_animelist.csv`; a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  function downloadJSON() {
    const data = watchlist.map(e => ({
      id: e.id,
      title: e.title,
      title_jp: e.title_jp || null,
      status: e.status,
      episodes_watched: e.episodes_watched || 0,
      episodes: e.episodes || null,
      my_rating: e.my_rating || null,
      type: e.type || null,
      year: e.aired_from ? String(e.aired_from).slice(0, 4) : null,
    }));
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), username, list: data }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${username}_animelist.json`; a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16, position: "relative" }}>
      <button onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 14px", borderRadius: 9,
          border: "1px solid var(--border)", background: "var(--bg-elevated)",
          color: "var(--text-muted)", cursor: "pointer", fontSize: 13, fontWeight: 600,
        }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Экспорт ({watchlist.length})
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 90 }} />
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 100,
            background: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: 12, padding: 8, minWidth: 180,
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)",
              textTransform: "uppercase", letterSpacing: "0.06em", padding: "2px 10px 6px" }}>
              Скачать список
            </p>
            {[
              { label: "CSV (таблица)", icon: "📊", fn: downloadCSV, desc: "Excel, Google Sheets" },
              { label: "JSON (данные)", icon: "📋", fn: downloadJSON, desc: "для разработчиков" },
            ].map(opt => (
              <button key={opt.label} onClick={opt.fn}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "8px 10px", background: "none",
                  border: "none", borderRadius: 8, cursor: "pointer", textAlign: "left",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-elevated)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>
                <span style={{ fontSize: 16 }}>{opt.icon}</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{opt.label}</p>
                  <p style={{ fontSize: 11, color: "var(--text-faint)", margin: 0 }}>{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function WatchEntry({ entry, statusKey, isSelf, onUpdate, allStatuses }) {
  const [editing, setEditing]   = useState(false);
  const [epVal, setEpVal]       = useState(entry.episodes_watched || 0);
  const [stVal, setStVal]       = useState(statusKey);
  const [saving, setSaving]     = useState(false);
  const [hover, setHover]       = useState(false);

  // Синхронизируем при изменении entry снаружи
  useEffect(() => {
    setEpVal(entry.episodes_watched || 0);
    setStVal(statusKey);
  }, [entry.episodes_watched, statusKey]);

  const maxEp = entry.episodes || null;
  const pct   = maxEp ? Math.min(100, (epVal / maxEp) * 100) : 0;

  async function handleSave(e) {
    e.preventDefault();
    e.stopPropagation();
    setSaving(true);
    try {
      // Автоперевод в "completed" если эпизоды заполнены до максимума
      let finalStatus = stVal;
      if (maxEp && epVal >= maxEp && stVal === "watching") {
        finalStatus = "completed";
      }
      await upsertWatchlist(entry.id, finalStatus, epVal);
      onUpdate(entry.id, { status: finalStatus, episodes_watched: epVal });
      setStVal(finalStatus);
      setEditing(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Удалить «${entry.title}» из списков?`)) return;
    try {
      await removeFromWatchlist(entry.id);
      onUpdate(entry.id, null);
    } catch (err) {
      alert(err.message);
    }
  }

  function handleIncEp(e) {
    e.preventDefault(); e.stopPropagation();
    if (!maxEp || epVal < maxEp) setEpVal(v => v + 1);
  }
  function handleDecEp(e) {
    e.preventDefault(); e.stopPropagation();
    if (epVal > 0) setEpVal(v => v - 1);
  }

  const statusMeta = allStatuses?.[stVal] || {};

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 14, overflow: "hidden",
        border: `1px solid ${hover && !editing ? "rgba(139,92,246,0.25)" : "var(--border)"}`,
        background: "var(--bg-surface)", transition: "border-color .18s",
        position: "relative",
      }}>

      {/* ── Основная строка ──────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px" }}>
        {/* Постер */}
        <Link to={`/anime/${entry.id}`} onClick={e => editing && e.preventDefault()}
          style={{
            width: 40, height: 56, borderRadius: 8, overflow: "hidden",
            flexShrink: 0, display: "block",
            background: "var(--bg-elevated)", textDecoration: "none",
          }}>
          {entry.poster_url
            ? <img src={entry.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : null}
        </Link>

        {/* Инфо */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link to={`/anime/${entry.id}`}
            style={{ textDecoration: "none", display: "block" }}>
            <p style={{
              fontWeight: 600, fontSize: 14, color: "var(--text-primary)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              margin: 0, lineHeight: 1.3,
              transition: "color .15s",
            }}
            onMouseEnter={e => e.target.style.color = "#a78bfa"}
            onMouseLeave={e => e.target.style.color = "var(--text-primary)"}>
              {entry.title}
            </p>
          </Link>
          {entry.title_jp && (
            <p style={{ fontSize: 11, color: "var(--text-faint)", margin: "2px 0 0",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {entry.title_jp}
            </p>
          )}

          {/* Прогресс-бар эпизодов */}
          {maxEp && !editing && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
              <div style={{ flex: 1, height: 3, borderRadius: 99, background: "var(--bg-elevated)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 99,
                  width: `${pct}%`,
                  background: pct >= 100 ? "#34d399" : "linear-gradient(to right,#7c3aed,#a78bfa)",
                  transition: "width .3s",
                }} />
              </div>
              <span style={{ fontSize: 11, color: "var(--text-faint)", flexShrink: 0 }}>
                {entry.episodes_watched || 0}/{maxEp} эп.
              </span>
            </div>
          )}
        </div>

        {/* Рейтинг */}
        {entry.my_rating && !editing && (
          <div style={{
            display: "flex", alignItems: "center", gap: 3,
            padding: "3px 8px", borderRadius: 8, flexShrink: 0,
            background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.2)",
          }}>
            <span style={{ color: "#fbbf24", fontSize: 11 }}>★</span>
            <span style={{ color: "#fbbf24", fontWeight: 800, fontSize: 13 }}>{entry.my_rating}</span>
          </div>
        )}

        {/* Кнопки (только для себя) */}
        {isSelf && !editing && (
          <div style={{ display: "flex", gap: 4, flexShrink: 0, opacity: hover ? 1 : 0, transition: "opacity .15s" }}>
            <button onClick={e => { e.preventDefault(); setEditing(true); }}
              title="Редактировать"
              style={{
                background: "var(--bg-elevated)", border: "1px solid var(--border)",
                color: "var(--text-muted)", borderRadius: 7,
                width: 28, height: 28, cursor: "pointer", fontSize: 13,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>✏️</button>
            <button onClick={handleRemove}
              title="Удалить из списка"
              style={{
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                color: "#f87171", borderRadius: 7,
                width: 28, height: 28, cursor: "pointer", fontSize: 13,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>✕</button>
          </div>
        )}
      </div>

      {/* ── Панель редактирования ──────────────────────────── */}
      {editing && (
        <div style={{
          borderTop: "1px solid var(--border)",
          padding: "12px 14px", background: "var(--bg-elevated)",
        }}
          onClick={e => e.stopPropagation()}>

          {/* Статус */}
          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)",
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              Статус
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.entries(allStatuses || {}).map(([k, meta]) => (
                <button key={k}
                  onClick={e => { e.preventDefault(); setStVal(k); }}
                  style={{
                    padding: "4px 12px", borderRadius: 8, fontSize: 12,
                    fontWeight: 600, cursor: "pointer", border: "none",
                    background: stVal === k ? meta.bg : "var(--bg-surface)",
                    color: stVal === k ? meta.color : "var(--text-faint)",
                    outline: stVal === k ? `1.5px solid ${meta.color}40` : "1px solid var(--border)",
                    outlineOffset: stVal === k ? 0 : -1,
                    transition: "all .15s",
                  }}>
                  {meta.label}
                </button>
              ))}
            </div>
          </div>

          {/* Эпизоды */}
          {maxEp && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)",
                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Просмотрено эпизодов
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={handleDecEp} disabled={epVal <= 0}
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    border: "1px solid var(--border)", background: "var(--bg-surface)",
                    color: "var(--text-muted)", cursor: epVal <= 0 ? "not-allowed" : "pointer",
                    fontSize: 16, fontWeight: 700, opacity: epVal <= 0 ? 0.4 : 1,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>−</button>

                <div style={{ flex: 1, position: "relative" }}>
                  <div style={{ height: 6, borderRadius: 99, background: "var(--bg-surface)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 99,
                      width: `${Math.min(100, (epVal / maxEp) * 100)}%`,
                      background: epVal >= maxEp ? "#34d399" : "linear-gradient(to right,#7c3aed,#a78bfa)",
                      transition: "width .2s",
                    }} />
                  </div>
                  <p style={{ textAlign: "center", marginTop: 4, fontSize: 12, color: "var(--text-muted)" }}>
                    <span style={{ fontWeight: 700, color: epVal >= maxEp ? "#34d399" : "var(--text-primary)" }}>
                      {epVal}
                    </span>
                    <span style={{ color: "var(--text-faint)" }}> / {maxEp}</span>
                    {epVal >= maxEp && stVal === "watching" && (
                      <span style={{ color: "#34d399", fontSize: 11, marginLeft: 6 }}>
                        → будет перенесено в «Просмотрено»
                      </span>
                    )}
                  </p>
                </div>

                <button onClick={handleIncEp} disabled={!!maxEp && epVal >= maxEp}
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    border: "1px solid var(--border)", background: "var(--bg-surface)",
                    color: "var(--text-muted)", cursor: (maxEp && epVal >= maxEp) ? "not-allowed" : "pointer",
                    fontSize: 16, fontWeight: 700, opacity: (maxEp && epVal >= maxEp) ? 0.4 : 1,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>+</button>

                {/* Быстрые кнопки */}
                <button onClick={e => { e.preventDefault(); setEpVal(maxEp); }}
                  style={{
                    padding: "4px 10px", borderRadius: 8, fontSize: 11,
                    border: "1px solid rgba(52,211,153,0.3)", background: "rgba(52,211,153,0.1)",
                    color: "#34d399", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap",
                  }}>
                  Все {maxEp}
                </button>
              </div>
            </div>
          )}

          {/* Кнопки сохранить / отмена */}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={e => { e.preventDefault(); setEditing(false); setEpVal(entry.episodes_watched || 0); setStVal(statusKey); }}
              style={{
                padding: "6px 16px", borderRadius: 8,
                border: "1px solid var(--border)", background: "var(--bg-surface)",
                color: "var(--text-muted)", cursor: "pointer", fontSize: 13,
              }}>
              Отмена
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{
                padding: "6px 18px", borderRadius: 8, border: "none",
                background: saving ? "var(--bg-elevated)" : "linear-gradient(to right,#7c3aed,#a21caf)",
                color: saving ? "var(--text-faint)" : "#fff",
                cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600,
              }}>
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Empty({ icon, text, link, linkText }) {
  return (
    <div className="text-center py-16" style={{ color: "var(--text-veryfaint)" }}>
      <p className="text-4xl mb-3">{icon}</p>
      <p className="text-sm mb-2">{text}</p>
      {link && <Link to={link} className="text-sm" style={{ color: "#a78bfa" }}>{linkText}</Link>}
    </div>
  );
}

// ── Удаление аккаунта ─────────────────────────────────────────
function DeleteAccount({ onDeleted }) {
  const [open, setOpen]       = useState(false);
  const [password, setPassword] = useState("");
  const [err, setErr]         = useState("");
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!password.trim()) return setErr("Введите пароль");
    setLoading(true); setErr("");
    try {
      await deleteAccount(password);
      onDeleted();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl p-5"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid rgba(239,68,68,0.15)" }}>
      <h3 className="font-semibold" style={{ color: "#f87171" }}>Удаление аккаунта</h3>
      <p className="text-sm mt-1 mb-4" style={{ color: "var(--text-faint)" }}>
        Аккаунт будет обезличен. Ваши комментарии и рецензии останутся, но будут анонимизированы.
      </p>
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", background: "transparent", cursor: "pointer" }}>
          Удалить аккаунт
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold" style={{ color: "#fca5a5" }}>
            ⚠️ Это действие необратимо. Введите пароль для подтверждения:
          </p>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Ваш текущий пароль"
            className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
            style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid rgba(239,68,68,0.3)" }}
          />
          {err && <p className="text-sm" style={{ color: "#f87171" }}>{err}</p>}
          <div className="flex gap-3">
            <button onClick={handleDelete} disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "#dc2626", color: "#fff", border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
              {loading ? "Удаление…" : "Подтвердить удаление"}
            </button>
            <button onClick={() => { setOpen(false); setPassword(""); setErr(""); }}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "none", cursor: "pointer" }}>
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Редактор расширенного профиля ────────────────────────────
// ── Разворачивает @username или короткое имя в полную ссылку ──
function resolveSocialUrl(net, value) {
  if (!value || !value.trim()) return null;
  const v = value.trim();
  // Если уже полная ссылка — возвращаем как есть
  if (/^https?:\/\//i.test(v)) return v;
  // Убираем @ если есть
  const handle = v.startsWith("@") ? v.slice(1) : v;
  if (!handle) return null;
  switch (net) {
    case "vk":       return `https://vk.com/${handle}`;
    case "telegram": return `https://t.me/${handle}`;
    case "twitter":  return `https://x.com/${handle}`;
    case "discord":  return `https://discord.com/users/${handle}`;
    case "youtube":  return `https://youtube.com/@${handle}`;
    case "mal":      return `https://myanimelist.net/profile/${handle}`;
    default:         return `https://${v}`;
  }
}

function ProfileEditor({ profile, onUpdate }) {
  const [bio,      setBio]      = useState(profile.bio      || "");
  const [location, setLocation] = useState(profile.location || "");
  const [website,  setWebsite]  = useState(profile.website  || "");
  const [social,   setSocial]   = useState(profile.social_links || {});
  const [bannerUrl,setBannerUrl]= useState(profile.banner_url   || "");
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState("");
  const [err,      setErr]      = useState("");

  const NETWORKS = ["vk", "telegram", "twitter", "discord", "youtube", "mal"];

  async function save() {
    setSaving(true); setMsg(""); setErr("");
    try {
      await updateUserProfile({ bio, banner_url: bannerUrl, location, website, social_links: social });
      onUpdate({ bio, banner_url: bannerUrl, location, website, social_links: social });
      setMsg("Профиль обновлён ✓");
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: "100%", background: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    borderRadius: 10, color: "#fff", padding: "8px 12px",
    fontSize: 13, outline: "none", boxSizing: "border-box",
  };

  return (
    <div>
      <h3 className="font-semibold text-white mb-4">Профиль</h3>
      <div className="space-y-4">
        {/* Биография */}
        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>О себе</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={1000}
            placeholder="Расскажите немного о себе..."
            style={{ ...inputStyle, resize: "vertical" }} />
          <div className="text-right text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>{bio.length}/1000</div>
        </div>

        {/* Баннер */}
        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>URL баннера профиля</label>
          <input value={bannerUrl} onChange={e => setBannerUrl(e.target.value)}
            placeholder="https://..." style={inputStyle} />
          {bannerUrl && (
            <img src={bannerUrl} alt="banner preview"
              className="mt-2 rounded-xl"
              style={{ width: "100%", height: 80, objectFit: "cover" }}
              onError={e => e.target.style.display = "none"} />
          )}
        </div>

        {/* Местоположение */}
        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Местоположение</label>
          <input value={location} onChange={e => setLocation(e.target.value)}
            placeholder="Москва, Россия" maxLength={100} style={inputStyle} />
        </div>

        {/* Сайт */}
        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Сайт / блог</label>
          <input value={website} onChange={e => setWebsite(e.target.value)}
            placeholder="https://myblog.com" maxLength={200} style={inputStyle} />
        </div>

        {/* Соцсети */}
        <div>
          <label className="block text-xs mb-2" style={{ color: "var(--text-muted)" }}>Соцсети и профили</label>
          <div className="grid grid-cols-2 gap-2">
            {NETWORKS.map(net => {
              const placeholders = {
                vk:       "@id или ссылка",
                telegram: "@username",
                twitter:  "@username",
                discord:  "@username или ID",
                youtube:  "@channel",
                mal:      "username на MAL",
              };
              const labels = {
                vk: "VK", telegram: "Telegram", twitter: "Twitter/X",
                discord: "Discord", youtube: "YouTube", mal: "MAL",
              };
              return (
                <div key={net} className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: "var(--text-faint)", minWidth: 68 }}>{labels[net] || net}</span>
                  <input
                    value={social[net] || ""}
                    onChange={e => setSocial(p => ({ ...p, [net]: e.target.value }))}
                    placeholder={placeholders[net] || "@username или ссылка"}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    name={`social_${net}`}
                    style={{ ...inputStyle, flex: 1, padding: "6px 10px" }}
                  />
                </div>
              );
            })}
          </div>
          <p className="text-xs mt-1.5" style={{ color: "var(--text-veryfaint)" }}>
            Можно вводить @username — ссылка будет сформирована автоматически
          </p>
        </div>

        {msg && <p className="text-sm" style={{ color: "#34d399" }}>{msg}</p>}
        {err && <p className="text-sm" style={{ color: "#f87171" }}>{err}</p>}

        <button onClick={save} disabled={saving}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{
            background: "#7c3aed", color: "#fff", border: "none",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}>
          {saving ? "Сохранение…" : "Сохранить профиль"}
        </button>
      </div>
    </div>
  );
}
