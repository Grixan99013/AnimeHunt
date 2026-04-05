// src/api/db.js
// ─────────────────────────────────────────────────────────────
//  Client-side mock that mirrors the PostgreSQL schema.
//  Replace fetch calls with real REST / GraphQL endpoints.
// ─────────────────────────────────────────────────────────────

export const ROLES = {
  1: "admin",
  2: "moderator",
  3: "user",
};

export const studios = [
  { id: 1, name: "MAPPA",          country: "Japan" },
  { id: 2, name: "Studio Pierrot", country: "Japan" },
  { id: 3, name: "Madhouse",       country: "Japan" },
  { id: 4, name: "Bones",          country: "Japan" },
  { id: 5, name: "Toei Animation", country: "Japan" },
];

export const genres = [
  { id: 1, name: "Action" },
  { id: 2, name: "Adventure" },
  { id: 3, name: "Fantasy" },
  { id: 4, name: "Sci-Fi" },
  { id: 5, name: "Drama" },
  { id: 6, name: "Comedy" },
  { id: 7, name: "Romance" },
  { id: 8, name: "Horror" },
  { id: 9, name: "Mystery" },
  { id: 10, name: "Psychological" },
  { id: 11, name: "Supernatural" },
  { id: 12, name: "Shonen" },
];

export const animeList = [
  {
    id: 1,
    title: "Attack on Titan",
    title_jp: "進撃の巨人",
    synopsis:
      "Humanity lives behind enormous walls to protect themselves from gigantic humanoid creatures known as Titans. When the walls are breached, Eren Yeager vows to exterminate every last Titan.",
    poster_url:
      "https://cdn.myanimelist.net/images/anime/10/47347.jpg",
    banner_url:
      "https://cdn.myanimelist.net/images/anime/10/47347l.jpg",
    status: "completed",
    type: "tv",
    episodes: 87,
    duration_min: 24,
    aired_from: "2013-04-07",
    aired_to: "2023-11-05",
    rating: 9.0,
    studio_id: 1,
    genre_ids: [1, 2, 5, 12],
    is_new: false,
  },
  {
    id: 2,
    title: "Naruto",
    title_jp: "ナルト",
    synopsis:
      "Naruto Uzumaki, a young ninja with a sealed demon fox inside him, strives to become the greatest ninja in his village and earn respect from his peers.",
    poster_url:
      "https://cdn.myanimelist.net/images/anime/13/17405.jpg",
    banner_url:
      "https://cdn.myanimelist.net/images/anime/13/17405l.jpg",
    status: "completed",
    type: "tv",
    episodes: 220,
    duration_min: 23,
    aired_from: "2002-10-03",
    aired_to: "2007-02-08",
    rating: 8.3,
    studio_id: 2,
    genre_ids: [1, 2, 12],
    is_new: false,
  },
  {
    id: 3,
    title: "Death Note",
    title_jp: "デスノート",
    synopsis:
      "Light Yagami discovers a supernatural notebook that can kill anyone whose name is written in it. He decides to use it to create a crime-free world, but is pursued by the genius detective L.",
    poster_url:
      "https://cdn.myanimelist.net/images/anime/9/9453.jpg",
    banner_url:
      "https://cdn.myanimelist.net/images/anime/9/9453l.jpg",
    status: "completed",
    type: "tv",
    episodes: 37,
    duration_min: 23,
    aired_from: "2006-10-04",
    aired_to: "2007-06-27",
    rating: 9.0,
    studio_id: 3,
    genre_ids: [5, 9, 10, 11],
    is_new: false,
  },
  {
    id: 4,
    title: "Jujutsu Kaisen Season 2",
    title_jp: "呪術廻戦 2期",
    synopsis:
      "The Shibuya Incident arc unfolds as sorcerers face an unprecedented threat from cursed spirits seeking to trap Satoru Gojo and unleash chaos upon humanity.",
    poster_url:
      "https://cdn.myanimelist.net/images/anime/1792/138022.jpg",
    banner_url:
      "https://cdn.myanimelist.net/images/anime/1792/138022l.jpg",
    status: "completed",
    type: "tv",
    episodes: 23,
    duration_min: 23,
    aired_from: "2023-07-06",
    aired_to: "2023-12-28",
    rating: 9.1,
    studio_id: 1,
    genre_ids: [1, 2, 11, 12],
    is_new: true,
  },
  {
    id: 5,
    title: "Frieren: Beyond Journey's End",
    title_jp: "葬送のフリーレン",
    synopsis:
      "An elven mage who helped defeat the Demon King reflects on the human relationships she neglected during the long journey as she embarks on a new adventure.",
    poster_url:
      "https://cdn.myanimelist.net/images/anime/1015/138006.jpg",
    banner_url:
      "https://cdn.myanimelist.net/images/anime/1015/138006l.jpg",
    status: "completed",
    type: "tv",
    episodes: 28,
    duration_min: 24,
    aired_from: "2023-09-29",
    aired_to: "2024-03-22",
    rating: 9.3,
    studio_id: 4,
    genre_ids: [2, 3, 5],
    is_new: true,
  },
  {
    id: 6,
    title: "Dandadan",
    title_jp: "ダンダダン",
    synopsis:
      "A girl who believes in ghosts but not aliens and a boy who believes in aliens but not ghosts encounter both supernatural and extraterrestrial phenomena together.",
    poster_url:
      "https://cdn.myanimelist.net/images/anime/1890/141166.jpg",
    banner_url:
      "https://cdn.myanimelist.net/images/anime/1890/141166l.jpg",
    status: "ongoing",
    type: "tv",
    episodes: 12,
    duration_min: 23,
    aired_from: "2024-10-04",
    aired_to: null,
    rating: 8.8,
    studio_id: 1,
    genre_ids: [1, 6, 11],
    is_new: true,
  },
  {
    id: 7,
    title: "Solo Leveling",
    title_jp: "俺だけレベルアップな件",
    synopsis:
      "In a world where hunters fight monsters threatening humanity, the world's weakest hunter Sung Jin-Woo gains a mysterious power and begins to level up in a unique way.",
    poster_url:
      "https://cdn.myanimelist.net/images/anime/1823/135083.jpg",
    banner_url:
      "https://cdn.myanimelist.net/images/anime/1823/135083l.jpg",
    status: "ongoing",
    type: "tv",
    episodes: 13,
    duration_min: 24,
    aired_from: "2024-01-07",
    aired_to: null,
    rating: 8.6,
    studio_id: 4,
    genre_ids: [1, 2, 3, 4],
    is_new: true,
  },
  {
    id: 8,
    title: "Demon Slayer: Infinity Castle Arc",
    title_jp: "鬼滅の刃 無限城編",
    synopsis:
      "Tanjiro and the Hashira face off against Muzan Kibutsuji and the Upper Ranks in the final battle inside the Infinity Castle.",
    poster_url:
      "https://cdn.myanimelist.net/images/anime/1286/99889.jpg",
    banner_url:
      "https://cdn.myanimelist.net/images/anime/1286/99889l.jpg",
    status: "upcoming",
    type: "movie",
    episodes: null,
    duration_min: null,
    aired_from: "2025-06-20",
    aired_to: null,
    rating: null,
    studio_id: 4,
    genre_ids: [1, 2, 5, 11, 12],
    is_new: true,
  },
];

// Seasons
export const seasons = [
  { id: 1, anime_id: 1, season_num: 1, title: "Season 1", episodes: 25, aired_from: "2013-04-07" },
  { id: 2, anime_id: 1, season_num: 2, title: "Season 2", episodes: 12, aired_from: "2017-04-01" },
  { id: 3, anime_id: 1, season_num: 3, title: "Season 3", episodes: 22, aired_from: "2018-07-23" },
  { id: 4, anime_id: 1, season_num: 4, title: "The Final Season", episodes: 28, aired_from: "2020-12-07" },
  { id: 5, anime_id: 4, season_num: 1, title: "Season 1", episodes: 24, aired_from: "2020-10-03" },
  { id: 6, anime_id: 4, season_num: 2, title: "Season 2", episodes: 23, aired_from: "2023-07-06" },
];

// Characters
export const characters = [
  { id: 1, anime_id: 1, name: "Eren Yeager",   role: "main",       description: "The protagonist driven by a burning desire for freedom.", image_url: "https://cdn.myanimelist.net/images/characters/10/216895.jpg" },
  { id: 2, anime_id: 1, name: "Mikasa Ackerman", role: "main",     description: "Eren's adopted sister and one of humanity's finest soldiers.", image_url: "https://cdn.myanimelist.net/images/characters/9/215563.jpg" },
  { id: 3, anime_id: 3, name: "Light Yagami",  role: "main",       description: "A brilliant high school student who finds the Death Note.", image_url: "https://cdn.myanimelist.net/images/characters/3/253266.jpg" },
  { id: 4, anime_id: 3, name: "L",              role: "main",       description: "The world's greatest detective who pursues Kira.", image_url: "https://cdn.myanimelist.net/images/characters/5/45867.jpg" },
  { id: 5, anime_id: 4, name: "Yuji Itadori",  role: "main",       description: "A kind-hearted boy who becomes a sorcerer after swallowing a cursed finger.", image_url: "" },
  { id: 6, anime_id: 5, name: "Frieren",        role: "main",       description: "An elven mage who outlives her human companions.", image_url: "" },
];

// Staff
export const staff = [
  { id: 1, name: "Tetsuro Araki",     role: "Director",  bio: "Directed Death Note and Attack on Titan." },
  { id: 2, name: "Hiroshi Seko",      role: "Script",    bio: "Lead scriptwriter for Attack on Titan Final Season." },
  { id: 3, name: "Shota Goshozono",   role: "Director",  bio: "Director of Jujutsu Kaisen Season 2." },
];

// Seiyu
export const seiyu = [
  { id: 1, name: "Yuki Kaji",     name_jp: "梶裕貴",   agency: "VIMS",         bio: "Voice of Eren Yeager." },
  { id: 2, name: "Mamoru Miyano", name_jp: "宮野真守",  agency: "Osawa Office", bio: "Voice of Light Yagami." },
  { id: 3, name: "Kappei Yamaguchi", name_jp: "山口勝平", agency: "Aoni Production", bio: "Voice of L." },
];

// Comments (mock)
export let comments = [
  { id: 1, user_id: 1, anime_id: 1, parent_id: null, body: "One of the best anime ever made!", created_at: "2024-01-10T12:00:00Z", username: "demo_user" },
  { id: 2, user_id: 1, anime_id: 3, parent_id: null, body: "The psychological depth is incredible.", created_at: "2024-02-05T09:30:00Z", username: "demo_user" },
];

// ── Helpers ──────────────────────────────────────────────────

export function getAnimeById(id) {
  return animeList.find(a => a.id === Number(id)) || null;
}

export function getGenresByIds(ids = []) {
  return genres.filter(g => ids.includes(g.id));
}

export function getStudioById(id) {
  return studios.find(s => s.id === id) || null;
}

export function getSeasonsByAnimeId(animeId) {
  return seasons.filter(s => s.anime_id === Number(animeId));
}

export function getCharactersByAnimeId(animeId) {
  return characters.filter(c => c.anime_id === Number(animeId));
}

export function getCommentsByAnimeId(animeId) {
  return comments.filter(c => c.anime_id === Number(animeId));
}

export function addComment(animeId, userId, username, body, parentId = null) {
  const newComment = {
    id: comments.length + 1,
    user_id: userId,
    anime_id: Number(animeId),
    parent_id: parentId,
    body,
    created_at: new Date().toISOString(),
    username,
  };
  comments.push(newComment);
  return newComment;
}

// Mock user store (replace with real backend)
const usersStore = [
  { id: 1, username: "demo_user", email: "demo@example.com", password: "demo1234", role_id: 3, avatar_url: "" },
];

export function registerUser({ username, email, password }) {
  if (usersStore.find(u => u.email === email)) {
    throw new Error("Email already registered");
  }
  if (usersStore.find(u => u.username === username)) {
    throw new Error("Username already taken");
  }
  const newUser = { id: usersStore.length + 1, username, email, password, role_id: 3, avatar_url: "" };
  usersStore.push(newUser);
  return { id: newUser.id, username: newUser.username, email: newUser.email, role_id: newUser.role_id, avatar_url: newUser.avatar_url };
}

export function loginUser({ email, password }) {
  const user = usersStore.find(u => u.email === email && u.password === password);
  if (!user) throw new Error("Invalid email or password");
  return { id: user.id, username: user.username, email: user.email, role_id: user.role_id, avatar_url: user.avatar_url };
}
