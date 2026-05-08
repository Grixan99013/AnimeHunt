// src/api/api.js
const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

function getStoredUser() {
  try { const r = localStorage.getItem("anime_user"); return r ? JSON.parse(r) : null; }
  catch { return null; }
}

function getToken() {
  return getStoredUser()?.token ?? null;
}

function getRefreshToken() {
  return getStoredUser()?.refresh_token ?? null;
}

// Автоматический рефреш access-токена при получении 401
let _refreshPromise = null;
async function tryRefreshToken() {
  const rt = getRefreshToken();
  if (!rt) return false;
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      const res  = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (!res.ok) { localStorage.removeItem("anime_user"); window.location.reload(); return false; }
      const data = await res.json();
      // Обновляем токены в localStorage
      const stored = getStoredUser() || {};
      localStorage.setItem("anime_user", JSON.stringify({
        ...stored,
        token:         data.access_token || data.token,
        refresh_token: data.refresh_token,
      }));
      return true;
    } catch {
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

/** Загрузка изображения (постер/баннер); только для админа с токеном */
export async function uploadAdminImage(file) {
  const fd = new FormData();
  fd.append("file", file);
  const t = getToken();
  const res = await fetch(`${BASE}/upload`, {
    method: "POST",
    headers: t ? { Authorization: `Bearer ${t}` } : {},
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Ошибка ${res.status}`);
  return data.url;
}

async function request(path, opts={}, _retry=false) {
  const h={"Content-Type":"application/json"};
  const t=getToken(); if(t) h["Authorization"]=`Bearer ${t}`;
  Object.assign(h, opts.headers||{});
  const res=await fetch(`${BASE}${path}`,{...opts,headers:h});
  const data=await res.json().catch(()=>({}));
  if(!res.ok) {
    // Пробуем обновить токен при первой 401
    if (res.status === 401 && !_retry) {
      const refreshed = await tryRefreshToken();
      if (refreshed) return request(path, opts, true); // повтор с новым токеном
      localStorage.removeItem("anime_user");
      window.location.reload();
    }
    throw new Error(data.error||`Ошибка ${res.status}`);
  }
  return data;
}

// ── Аниме ────────────────────────────────────────────────────
export async function fetchAnimeList(params={}) {
  const clean=Object.fromEntries(Object.entries(params).filter(([,v])=>v!==""&&v!=null&&v!==false));
  const qs=new URLSearchParams(clean).toString();
  const data = await request(`/anime${qs?"?"+qs:""}`);
  // API теперь возвращает { items, total }; поддерживаем старый формат (массив)
  return data;
}
export const fetchAnime   = (id)    => request(`/anime/${id}`);
export const fetchGenres  = ()      => request("/anime/genres");
export const fetchStudios = ()      => request("/anime/studios");
export const fetchThemes  = ()      => request("/anime/themes");
export const fetchSeriesList = () => request("/anime/series-list");
export function createAnime(body) {
  return request("/anime", { method: "POST", body: JSON.stringify(body) });
}
export function updateAnime(id, body) {
  return request(`/anime/${id}`, { method: "PUT", body: JSON.stringify(body) });
}
export function addCharacterToAnime(animeId, body) {
  return request(`/anime/${animeId}/characters`, { method: "POST", body: JSON.stringify(body) });
}
export const rateAnime    = (id,sc) => request(`/anime/${id}/rate`,{method:"POST",body:JSON.stringify({score:sc})});
export const fetchSimilarAnime = (id) => request(`/anime/${id}/similar`);
export const postComment  = (id,body,pid=null,image_url=null) => request(`/anime/${id}/comments`,{method:"POST",body:JSON.stringify({body,parent_id:pid,image_url})});
export const postReview   = (animeId,data) => request(`/anime/${animeId}/reviews`,{method:"POST",body:JSON.stringify(data)});
export const deleteReview = (animeId)      => request(`/anime/${animeId}/reviews`,{method:"DELETE"});
export const likeReview   = (reviewId)     => request(`/anime/reviews/${reviewId}/like`,{method:"POST"});

// ── Персонажи ─────────────────────────────────────────────────
export function fetchCharacterList(params={}) {
  const clean=Object.fromEntries(Object.entries(params).filter(([,v])=>v!==""&&v!=null&&v!==false));
  const qs=new URLSearchParams(clean).toString();
  return request(`/characters${qs?"?"+qs:""}`);
}
export const fetchCharacter       = (id)            => request(`/characters/${id}`);
export const updateCharacter      = (id, data)      => request(`/characters/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const toggleFavorite       = (id)            => request(`/characters/${id}/favorite`,{method:"POST"});
export const postCharacterComment = (id,b,pid=null,image_url=null) => request(`/characters/${id}/comments`,{method:"POST",body:JSON.stringify({body:b,parent_id:pid,image_url})});
export const shipCharacter        = (id,shippedWith)=> request(`/characters/${id}/ship`,{method:"POST",body:JSON.stringify({shipped_with:shippedWith})});
export const unshipCharacter      = (id)            => request(`/characters/${id}/ship`,{method:"DELETE"});

// ── Глобальный поиск (аниме + персонажи) ─────────────────────
export async function globalSearch(q) {
  if (!q?.trim()) return { anime: [], characters: [] };
  const [animeRes, characters] = await Promise.all([
    fetchAnimeList({ q, limit: 5 }),
    fetchCharacterList({ q, limit: 5 }),
  ]);
  const anime = Array.isArray(animeRes) ? animeRes : (animeRes.items || []);
  return { anime, characters };
}

// ── Watchlist ─────────────────────────────────────────────────
export const fetchWatchlist      = ()           => request("/watchlist");
export const upsertWatchlist     = (id,st,ep=0) => request(`/watchlist/${id}`,{method:"PUT",body:JSON.stringify({status:st,episodes_watched:ep})});
export const removeFromWatchlist = (id)         => request(`/watchlist/${id}`,{method:"DELETE"});

// ── Комментарии (удаление, редактирование) ───────────────────
export const deleteAnimeComment     = (id) => request(`/anime/comments/${id}`, { method: "DELETE" });
export const editAnimeComment       = (id, body) => request(`/anime/comments/${id}`, { method: "PATCH", body: JSON.stringify({ body }) });
export const deleteCharComment      = (id) => request(`/characters/comments/${id}`, { method: "DELETE" });
export const editCharComment        = (id, body) => request(`/characters/comments/${id}`, { method: "PATCH", body: JSON.stringify({ body }) });

// ── Пользователь ──────────────────────────────────────────────
export const fetchMyComments  = () => request("/user/comments");
export const fetchMyRatings   = () => request("/user/ratings");
export const fetchMyFavorites = () => request("/user/favorites");
export const fetchMyReviews   = () => request("/user/reviews");
export const fetchPublicProfile = (username) => request(`/user/profile/${username}`);
export const updatePrivacy      = (data)     => request("/user/privacy", { method:"PATCH", body:JSON.stringify(data) });
export const changePassword     = (data)     => request("/user/password", { method:"PATCH", body:JSON.stringify(data) });

// ── Авторизация ───────────────────────────────────────────────
export async function apiLogin({email,password}) {
  const d=await request("/auth/login",{method:"POST",body:JSON.stringify({email,password})});
  localStorage.setItem("anime_user",JSON.stringify({...d.user,token:d.access_token||d.token,refresh_token:d.refresh_token}));
  return d.user;
}
export async function apiRegister({username,email,password}) {
  const d=await request("/auth/register",{method:"POST",body:JSON.stringify({username,email,password})});
  localStorage.setItem("anime_user",JSON.stringify({...d.user,token:d.access_token||d.token,refresh_token:d.refresh_token}));
  return d.user;
}

// ── Константы ─────────────────────────────────────────────────
export const ROLES={1:"администратор",2:"модератор",3:"пользователь"};
export const WATCH_STATUSES={
  watching: {label:"Смотрю",       color:"#60a5fa",bg:"rgba(59,130,246,0.15)"},
  completed:{label:"Просмотрено",  color:"#34d399",bg:"rgba(16,185,129,0.15)"},
  planned:  {label:"Запланировано",color:"#a78bfa",bg:"rgba(139,92,246,0.15)"},
  on_hold:  {label:"Отложено",     color:"#fbbf24",bg:"rgba(245,158,11,0.15)"},
  dropped:  {label:"Дропнуто",     color:"#f87171",bg:"rgba(239,68,68,0.15)"},
};
export const STATUS_LABELS ={completed:"Завершено",ongoing:"Выходит",upcoming:"Анонс",cancelled:"Отменено"};
export const STATUS_STYLES ={
  completed:{color:"#34d399",background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.25)"},
  ongoing:  {color:"#60a5fa",background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.25)"},
  upcoming: {color:"#fbbf24",background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.25)"},
  cancelled:{color:"#f87171",background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)"},
};
export const TYPE_LABELS ={tv:"ТВ",movie:"Фильм",ova:"OVA",ona:"ONA",special:"Спэшл"};
export const ROLE_LABELS ={main:"Главный",supporting:"Второстепенный",extra:"Эпизодический"};

// ── Медиа (кадры и видео) ─────────────────────────────────────
export const fetchScreenshots  = (animeId)          => request(`/media/anime/${animeId}/screenshots`);
export const submitScreenshot  = (animeId, image_url) => request(`/media/anime/${animeId}/screenshots`, { method:"POST", body:JSON.stringify({ image_url }) });
export const reviewScreenshot  = (id, status)       => request(`/media/screenshots/${id}`, { method:"PATCH", body:JSON.stringify({ status }) });
export const deleteScreenshot  = (id)               => request(`/media/screenshots/${id}`, { method:"DELETE" });

export const fetchVideos       = (animeId)           => request(`/media/anime/${animeId}/videos`);
export const submitVideo       = (animeId, data)     => request(`/media/anime/${animeId}/videos`, { method:"POST", body:JSON.stringify(data) });
export const reviewVideo       = (id, status)        => request(`/media/videos/${id}`, { method:"PATCH", body:JSON.stringify({ status }) });
export const deleteVideo       = (id)               => request(`/media/videos/${id}`, { method:"DELETE" });

// ── Admin API ─────────────────────────────────────────────────
export const adminFetchStats   = ()               => request("/admin/stats");
export const adminFetchUsers   = (params={})      => request(`/admin/users?${new URLSearchParams(params)}`);
export const adminSetUserRole  = (id, role_id)    => request(`/admin/users/${id}/role`,  { method:"PATCH", body:JSON.stringify({ role_id }) });
export const adminToggleBan    = (id)             => request(`/admin/users/${id}/ban`,   { method:"PATCH" });
export const adminFetchGenres  = ()               => request("/admin/genres");
export const adminCreateGenre  = (name)           => request("/admin/genres",     { method:"POST",  body:JSON.stringify({ name }) });
export const adminUpdateGenre  = (id, name)       => request(`/admin/genres/${id}`, { method:"PATCH", body:JSON.stringify({ name }) });
export const adminDeleteGenre  = (id)             => request(`/admin/genres/${id}`, { method:"DELETE" });
export const adminFetchStudios = ()               => request("/admin/studios");
export const adminCreateStudio = (d)              => request("/admin/studios",    { method:"POST",  body:JSON.stringify(d) });
export const adminUpdateStudio = (id, d)          => request(`/admin/studios/${id}`, { method:"PATCH", body:JSON.stringify(d) });
export const adminDeleteStudio = (id)             => request(`/admin/studios/${id}`, { method:"DELETE" });
export const adminDeleteAnime  = (id)             => request(`/admin/anime/${id}`,   { method:"DELETE" });
export const adminFetchPendingMedia = (params={}) => request(`/admin/media/pending?${new URLSearchParams(params)}`);
export const adminReviewMedia  = (id, action)     => request(`/admin/media/${id}`, { method:"PATCH", body:JSON.stringify({ action }) });

// ── User account ──────────────────────────────────────────────
export const deleteAccount = (password) => request("/user/account", { method: "DELETE", body: JSON.stringify({ password }) });

// ── Series ────────────────────────────────────────────────────
export const fetchSeries = (id) => request(`/anime/series/${id}`);

// ── Reports ───────────────────────────────────────────────────
export const submitReport        = (data)         => request("/reports", { method: "POST", body: JSON.stringify(data) });
export const adminFetchReports   = (params={})    => request(`/admin/reports?${new URLSearchParams(params)}`);
export const adminReviewReport   = (id, action)   => request(`/admin/reports/${id}`, { method: "PATCH", body: JSON.stringify({ action }) });
export const adminPinReview      = (id, pinned)   => request(`/admin/reviews/${id}/pin`, { method: "PATCH", body: JSON.stringify({ pinned }) });
export const adminFetchLeaderboard = (limit=20)   => request(`/admin/leaderboard?limit=${limit}`);

// ── Staff / Seiyu ─────────────────────────────────────────────
export const searchSeiyu         = (q)            => request(`/characters/seiyu/search?q=${encodeURIComponent(q)}&limit=10`);
export const createSeiyu         = (data)         => request("/characters/seiyu", { method: "POST", body: JSON.stringify(data) });
export const linkSeiyuToChar     = (charId, data) => request(`/characters/${charId}/seiyu`, { method: "POST", body: JSON.stringify(data) });
export const unlinkSeiyuFromChar = (charId, seiyuId) => request(`/characters/${charId}/seiyu/${seiyuId}`, { method: "DELETE" });
export const searchStaff         = (q)            => request(`/characters/staff/search?q=${encodeURIComponent(q)}&limit=10`);
export const createStaff         = (data)         => request("/characters/staff", { method: "POST", body: JSON.stringify(data) });
export const linkStaffToAnime    = (animeId, data) => request(`/anime/${animeId}/staff`, { method: "POST", body: JSON.stringify(data) });
export const unlinkStaffFromAnime = (animeId, staffId) => request(`/anime/${animeId}/staff/${staffId}`, { method: "DELETE" });

// ── User profile extended ─────────────────────────────────────
export const updateUserProfile   = (data)         => request("/user/profile", { method: "PATCH", body: JSON.stringify(data) });

// ── Notifications ─────────────────────────────────────────────
export const fetchNotifications     = (p={})  => request(`/notifications?${new URLSearchParams(p)}`);
export const fetchUnreadCount       = ()       => request("/notifications/unread-count");
export const markAllRead            = ()       => request("/notifications/read-all", { method:"PATCH" });
export const markOneRead            = (id)     => request(`/notifications/${id}/read`, { method:"PATCH" });
export const deleteNotification     = (id)     => request(`/notifications/${id}`, { method:"DELETE" });

// ── Collections ───────────────────────────────────────────────
export const fetchCollections       = (p={})   => request(`/collections?${new URLSearchParams(p)}`);
export const fetchCollection        = (id)     => request(`/collections/${id}`);
export const createCollection       = (data)   => request("/collections",             { method:"POST",   body:JSON.stringify(data) });
export const updateCollection       = (id, d)  => request(`/collections/${id}`,       { method:"PATCH",  body:JSON.stringify(d) });
export const deleteCollection       = (id)     => request(`/collections/${id}`,       { method:"DELETE" });
export const addToCollection        = (id, d)  => request(`/collections/${id}/items`, { method:"POST",   body:JSON.stringify(d) });
export const removeFromCollection   = (id, animeId) => request(`/collections/${id}/items/${animeId}`, { method:"DELETE" });

// ── Ratings history ───────────────────────────────────────────
export const fetchMyRatingsHistory   = ()         => request("/user/ratings-history");
export const fetchUserRatingsHistory = (username) => request(`/user/profile/${username}/ratings-history`);

// ── News ──────────────────────────────────────────────────────
export const fetchNews       = (p={})   => request(`/news?${new URLSearchParams(p)}`);
export const fetchNewsItem   = (id)     => request(`/news/${id}`);
export const createNews      = (data)   => request("/news",       { method:"POST",   body:JSON.stringify(data) });
export const updateNews      = (id, d)  => request(`/news/${id}`, { method:"PATCH",  body:JSON.stringify(d) });
export const deleteNews      = (id)     => request(`/news/${id}`, { method:"DELETE" });
