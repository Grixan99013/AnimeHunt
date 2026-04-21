// src/pages/Profile.jsx
import { useState, useEffect, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import {
  fetchWatchlist, fetchMyComments, fetchMyFavorites, fetchMyReviews,
  ROLES, WATCH_STATUSES,
} from "../api/api";

const BASE = "http://localhost:3001/api";

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

const TABS_OWN    = ["Списки", "Избранное", "Рецензии", "Комментарии", "Настройки"];
const TABS_OTHER  = ["Списки", "Избранное", "Рецензии"];

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
        border: "2px solid rgba(255,255,255,0.1)",
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
        <p className="text-xs" style={{ color: "#6b7280" }}>JPG, PNG, GIF, WEBP · до 5 МБ</p>
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

// ── Настройки приватности ────────────────────────────────────
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
          style={{ backgroundColor: "#0d0f14", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <p className="text-sm font-medium text-white">{r.label}</p>
            <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>{r.desc}</p>
          </div>
          <button
            onClick={() => toggle(r.key)}
            disabled={saving}
            className="relative flex-shrink-0 ml-4"
            style={{
              width: 44, height: 24, borderRadius: 12,
              backgroundColor: local[r.key] ? "#7c3aed" : "rgba(255,255,255,0.12)",
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
        style={{ borderColor: "rgba(255,255,255,0.1)", borderTopColor: "#8b5cf6" }} />
    </div>
  );

  if (error || !profile) return (
    <div className="text-center py-24" style={{ color: "#6b7280" }}>
      <p className="text-4xl mb-4">😶</p>
      <p>{error || "Пользователь не найден"}</p>
      <Link to="/" style={{ color: "#a78bfa" }} className="text-sm mt-2 inline-block">← На главную</Link>
    </div>
  );

  const watchlist   = profile.watchlist || [];
  const byStatus    = Object.keys(WATCH_STATUSES).reduce((acc, k) => {
    acc[k] = watchlist.filter(e => e.status === k);
    return acc;
  }, {});
  const stats = profile.stats || {};

  return (
    <div className="max-w-3xl mx-auto space-y-8">

      {/* Заголовок */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-black text-white">
          {isSelf ? "Мой профиль" : `Профиль: ${profile.username}`}
        </h1>
      </div>

      {/* Карточка пользователя */}
      <div className="rounded-2xl p-6"
        style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-start gap-5">
          {/* Аватар — просто отображение, редактирование в Настройках */}
          <div className="flex-shrink-0">
            <Avatar url={profile.avatar_url} username={profile.username} size={72} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <p className="text-lg font-bold text-white">{profile.username}</p>
                {/* Email: только если виден */}
                {profile.email
                  ? <p className="text-sm mt-0.5 flex items-center gap-1.5" style={{ color: "#6b7280" }}>
                      {profile.email}
                      {isSelf && profile.hide_email && (
                        <span className="text-xs px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "#4b5563" }}>скрыт</span>
                      )}
                    </p>
                  : isSelf ? null
                  : <p className="text-sm mt-0.5" style={{ color: "#4b5563" }}>Email скрыт</p>
                }
                <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full capitalize"
                  style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd" }}>
                  {ROLES[profile.role_id] || "пользователь"}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs" style={{ color: "#4b5563" }}>
                  на сайте с {new Date(profile.created_at).toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
                </p>
              </div>
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
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: "Смотрю",    value: stats.watching  || 0, color: "#60a5fa" },
          { label: "Просмотрено", value: stats.completed || 0, color: "#34d399" },
          { label: "Планы",     value: stats.planned   || 0, color: "#a78bfa" },
          { label: "Избранных", value: stats.favorites || 0, color: "#f43f5e" },
          { label: "Рецензий",  value: stats.reviews   || 0, color: "#fbbf24" },
          { label: "Коммент.",  value: stats.comments  || 0, color: "#e879f9" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-3 text-center"
            style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Табы */}
      <div className="flex gap-1 overflow-x-auto" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
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
          {/* Список скрыт */}
          {profile.watchlist === null ? (
            <div className="text-center py-16" style={{ color: "#4b5563" }}>
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
                      {items.map(entry => <WatchEntry key={entry.id} entry={entry} statusKey={key} />)}
                    </div>
                  </div>
                );
              })}
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
                style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.05)", textDecoration: "none" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(244,63,94,0.3)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"}>
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
                  style={{ backgroundColor: "#1a1d26", border: "1px solid rgba(255,255,255,0.1)" }}>
                  {fav.image_url
                    ? <img src={fav.image_url} alt={fav.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center font-bold" style={{ color: "#4b5563" }}>{fav.name[0]}</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-white truncate group-hover:text-pink-400 transition-colors">{fav.name}</p>
                  {fav.name_jp && <p className="text-xs truncate" style={{ color: "#4b5563" }}>{fav.name_jp}</p>}
                  <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>из <span style={{ color: "#a78bfa" }}>{fav.anime_title}</span></p>
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
                style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.05)", textDecoration: "none" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(251,191,36,0.25)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"}>
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: "#1a1d26" }}>
                    {rv.anime_poster && <img src={rv.anime_poster} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold mb-0.5" style={{ color: "#a78bfa" }}>{rv.anime_title}</p>
                    <p className="font-bold text-sm text-white truncate">{rv.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>{new Date(rv.created_at).toLocaleDateString("ru-RU")}</p>
                  </div>
                  <div className="flex-shrink-0 text-center">
                    <p className="text-xl font-black" style={{ color: "#fbbf24" }}>★ {rv.score}</p>
                    <p className="text-xs" style={{ color: "#6b7280" }}>/10</p>
                  </div>
                </div>
                <div className="px-5 pb-4">
                  <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: "#9ca3af" }}>{rv.body}</p>
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      {/* ── Комментарии (только свои) ─────────────────────── */}
      {activeTab === "Комментарии" && isSelf && (
        !myComments.length ? (
          <Empty icon="💬" text="Вы ещё не оставляли комментариев" />
        ) : (
          <div className="space-y-3">
            {myComments.map(c => (
              <Link key={c.id} to={`/anime/${c.anime_id}`}
                className="block rounded-xl px-4 py-3 text-sm transition-all"
                style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.05)", textDecoration: "none" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(139,92,246,0.2)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"}>
                <p className="text-xs font-semibold mb-1" style={{ color: "#a78bfa" }}>{c.anime_title}</p>
                <p style={{ color: "#d1d5db" }}>{c.body}</p>
                <p className="text-xs mt-1" style={{ color: "#4b5563" }}>{new Date(c.created_at).toLocaleDateString("ru-RU")}</p>
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
            style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.05)" }}>
            <h3 className="font-semibold text-white">Аватар профиля</h3>
            <AvatarUploader user={profile} onUpdate={handleAvatarUpdate} />
          </div>

          {/* Приватность */}
          <div className="rounded-2xl p-5"
            style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.05)" }}>
            <PrivacySettings
              privacy={{ hide_email: profile.hide_email, hide_watchlist: profile.hide_watchlist }}
              onChange={handlePrivacyChange}
            />
          </div>

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

function WatchEntry({ entry, statusKey }) {
  return (
    <Link to={`/anime/${entry.id}`}
      className="flex items-center gap-4 rounded-xl px-4 py-3 transition-all group"
      style={{ backgroundColor: "#13151c", border: "1px solid rgba(255,255,255,0.05)", textDecoration: "none" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(139,92,246,0.25)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"}>
      <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: "#1a1d26" }}>
        {entry.poster_url ? <img src={entry.poster_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-white truncate group-hover:text-violet-300 transition-colors">{entry.title}</p>
        {entry.title_jp && <p className="text-xs mt-0.5 truncate" style={{ color: "#6b7280" }}>{entry.title_jp}</p>}
        {statusKey === "watching" && entry.episodes && (
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 rounded-full overflow-hidden" style={{ height: "3px", backgroundColor: "rgba(255,255,255,0.08)" }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, (entry.episodes_watched / entry.episodes) * 100)}%`, backgroundColor: "#60a5fa" }} />
            </div>
            <span className="text-xs flex-shrink-0" style={{ color: "#6b7280" }}>{entry.episodes_watched}/{entry.episodes} эп.</span>
          </div>
        )}
      </div>
      {entry.my_rating && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg flex-shrink-0"
          style={{ backgroundColor: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.25)" }}>
          <span style={{ color: "#fbbf24", fontSize: "0.75rem" }}>★</span>
          <span className="text-sm font-black" style={{ color: "#fbbf24" }}>{entry.my_rating}</span>
        </div>
      )}
    </Link>
  );
}

function Empty({ icon, text, link, linkText }) {
  return (
    <div className="text-center py-16" style={{ color: "#4b5563" }}>
      <p className="text-4xl mb-3">{icon}</p>
      <p className="text-sm mb-2">{text}</p>
      {link && <Link to={link} className="text-sm" style={{ color: "#a78bfa" }}>{linkText}</Link>}
    </div>
  );
}
