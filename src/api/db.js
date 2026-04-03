const BASE = "http://localhost:3001/api";

// Получить токен из localStorage
const token = () => localStorage.getItem("anime_token");

// Все аниме (с фильтрами)
export async function fetchAnime(params = {}) {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/anime?${q}`);
  return res.json();
}

// Одно аниме по id
export async function fetchAnimeById(id) {
  const res = await fetch(`${BASE}/anime/${id}`);
  return res.json();
}

// Регистрация
export async function registerUser(data) {
  const res = await fetch(`${BASE}/auth/register`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  localStorage.setItem("anime_token", json.token);
  return json.user;
}

// Вход
export async function loginUser(data) {
  const res = await fetch(`${BASE}/auth/login`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  localStorage.setItem("anime_token", json.token);
  return json.user;
}

// Добавить комментарий (требует авторизации)
export async function postComment(animeId, body) {
  const res = await fetch(`${BASE}/anime/${animeId}/comments`, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${token()}`,
    },
    body: JSON.stringify({ body }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json;
}
