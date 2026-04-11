// src/api/api.js
const BASE = "http://localhost:3001/api";

function getToken() {
  try { const r=localStorage.getItem("anime_user"); return r?JSON.parse(r).token:null; }
  catch { return null; }
}

async function request(path, opts={}) {
  const h={"Content-Type":"application/json"};
  const t=getToken(); if(t) h["Authorization"]=`Bearer ${t}`;
  Object.assign(h, opts.headers||{});
  const res=await fetch(`${BASE}${path}`,{...opts,headers:h});
  const data=await res.json();
  if(!res.ok) throw new Error(data.error||`Ошибка ${res.status}`);
  return data;
}

// ── Аниме ────────────────────────────────────────────────────
export function fetchAnimeList(params={}) {
  const clean=Object.fromEntries(Object.entries(params).filter(([,v])=>v!==""&&v!=null&&v!==false));
  const qs=new URLSearchParams(clean).toString();
  return request(`/anime${qs?"?"+qs:""}`);
}
export const fetchAnime   = (id)    => request(`/anime/${id}`);
export const fetchGenres  = ()      => request("/anime/genres");
export const fetchStudios = ()      => request("/anime/studios");
export const rateAnime    = (id,sc) => request(`/anime/${id}/rate`,{method:"POST",body:JSON.stringify({score:sc})});
export const postComment  = (id,body,pid=null) => request(`/anime/${id}/comments`,{method:"POST",body:JSON.stringify({body,parent_id:pid})});
export const postReview   = (animeId, data) => request(`/anime/${animeId}/reviews`,{method:"POST",body:JSON.stringify(data)});
export const deleteReview = (animeId)       => request(`/anime/${animeId}/reviews`,{method:"DELETE"});
export const likeReview   = (reviewId)      => request(`/anime/reviews/${reviewId}/like`,{method:"POST"});

// ── Персонажи ─────────────────────────────────────────────────
export const fetchCharacter       = (id)            => request(`/characters/${id}`);
export const toggleFavorite       = (id)            => request(`/characters/${id}/favorite`,{method:"POST"});
export const postCharacterComment = (id,b,pid=null) => request(`/characters/${id}/comments`,{method:"POST",body:JSON.stringify({body:b,parent_id:pid})});
export const shipCharacter        = (id, shippedWith) => request(`/characters/${id}/ship`,{method:"POST",body:JSON.stringify({shipped_with:shippedWith})});
export const unshipCharacter      = (id)            => request(`/characters/${id}/ship`,{method:"DELETE"});

// ── Watchlist ─────────────────────────────────────────────────
export const fetchWatchlist       = ()           => request("/watchlist");
export const upsertWatchlist      = (id,st,ep=0) => request(`/watchlist/${id}`,{method:"PUT",body:JSON.stringify({status:st,episodes_watched:ep})});
export const removeFromWatchlist  = (id)         => request(`/watchlist/${id}`,{method:"DELETE"});

// ── Пользователь ──────────────────────────────────────────────
export const fetchMyComments  = () => request("/user/comments");
export const fetchMyRatings   = () => request("/user/ratings");
export const fetchMyFavorites = () => request("/user/favorites");
export const fetchMyReviews   = () => request("/user/reviews");

// ── Авторизация ───────────────────────────────────────────────
export async function apiLogin({email,password}) {
  const d=await request("/auth/login",{method:"POST",body:JSON.stringify({email,password})});
  localStorage.setItem("anime_user",JSON.stringify({...d.user,token:d.token}));
  return d.user;
}
export async function apiRegister({username,email,password}) {
  const d=await request("/auth/register",{method:"POST",body:JSON.stringify({username,email,password})});
  localStorage.setItem("anime_user",JSON.stringify({...d.user,token:d.token}));
  return d.user;
}

// ── Константы ─────────────────────────────────────────────────
export const ROLES={1:"администратор",2:"модератор",3:"пользователь"};
export const WATCH_STATUSES={
  watching: {label:"Смотрю",       color:"#60a5fa",bg:"rgba(59,130,246,0.15)"},
  completed:{label:"Просмотрено",  color:"#34d399",bg:"rgba(16,185,129,0.15)"},
  planned:  {label:"Запланировано",color:"#a78bfa",bg:"rgba(139,92,246,0.15)"},
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
