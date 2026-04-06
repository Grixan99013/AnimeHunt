// src/api/api.js
// ─────────────────────────────────────────────────────────────
//  Единый HTTP-слой. Все данные из PostgreSQL через Express.
//  db.js больше не используется — можно удалить.
// ─────────────────────────────────────────────────────────────

const BASE = "http://localhost:3001/api";

function getToken() {
  try {
    const raw = localStorage.getItem("anime_user");
    return raw ? JSON.parse(raw).token : null;
  } catch { return null; }
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  const t = getToken();
  if (t) headers["Authorization"] = `Bearer ${t}`;
  Object.assign(headers, options.headers || {});

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Ошибка сервера ${res.status}`);
  return data;
}

// ── Аниме ────────────────────────────────────────────────────

export function fetchAnimeList(params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== "" && v != null && v !== false)
  );
  const qs = new URLSearchParams(clean).toString();
  return request(`/anime${qs ? "?" + qs : ""}`);
}

export function fetchAnime(id) {
  return request(`/anime/${id}`);
}

export function fetchGenres() {
  return request("/anime/genres");
}

export function rateAnime(animeId, score) {
  return request(`/anime/${animeId}/rate`, {
    method: "POST",
    body: JSON.stringify({ score }),
  });
}

export function postComment(animeId, body, parentId = null) {
  return request(`/anime/${animeId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body, parent_id: parentId }),
  });
}

// ── Список просмотра (/api/watchlist) ────────────────────────

export function fetchWatchlist() {
  return request("/watchlist");
}

export function upsertWatchlist(animeId, status, episodesWatched = 0) {
  return request(`/watchlist/${animeId}`, {
    method: "PUT",
    body: JSON.stringify({ status, episodes_watched: episodesWatched }),
  });
}

export function removeFromWatchlist(animeId) {
  return request(`/watchlist/${animeId}`, { method: "DELETE" });
}

// ── Пользователь (/api/user) ──────────────────────────────────

export function fetchMyComments() {
  return request("/user/comments");
}

export function fetchMyRatings() {
  return request("/user/ratings");
}

// ── Авторизация ───────────────────────────────────────────────

export async function apiLogin({ email, password }) {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  // Храним user + token в одном ключе
  localStorage.setItem("anime_user", JSON.stringify({
    ...data.user,
    token: data.token,
  }));
  return data.user;
}

export async function apiRegister({ username, email, password }) {
  const data = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
  localStorage.setItem("anime_user", JSON.stringify({
    ...data.user,
    token: data.token,
  }));
  return data.user;
}

// ── UI-константы (не зависят от БД) ─────────────────────────

export const ROLES = {
  1: "администратор",
  2: "модератор",
  3: "пользователь",
};

export const WATCH_STATUSES = {
  watching:  { label: "Смотрю",        color: "#60a5fa", bg: "rgba(59,130,246,0.15)"  },
  completed: { label: "Просмотрено",   color: "#34d399", bg: "rgba(16,185,129,0.15)" },
  planned:   { label: "Запланировано", color: "#a78bfa", bg: "rgba(139,92,246,0.15)" },
};

export const STATUS_LABELS = {
  completed: "Завершено",
  ongoing:   "Выходит",
  upcoming:  "Анонс",
  cancelled: "Отменено",
};

export const STATUS_STYLES = {
  completed: { color: "#34d399", background: "rgba(16,185,129,0.1)",  border: "1px solid rgba(16,185,129,0.25)" },
  ongoing:   { color: "#60a5fa", background: "rgba(59,130,246,0.1)",  border: "1px solid rgba(59,130,246,0.25)" },
  upcoming:  { color: "#fbbf24", background: "rgba(245,158,11,0.1)",  border: "1px solid rgba(245,158,11,0.25)" },
  cancelled: { color: "#f87171", background: "rgba(239,68,68,0.1)",   border: "1px solid rgba(239,68,68,0.25)"  },
};

export const TYPE_LABELS = {
  tv: "ТВ", movie: "Фильм", ova: "OVA", ona: "ONA", special: "Спэшл",
};
