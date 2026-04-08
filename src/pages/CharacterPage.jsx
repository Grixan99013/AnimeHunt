// src/pages/CharacterPage.jsx
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../App";
import { fetchCharacter, toggleFavorite, postCharacterComment, ROLE_LABELS } from "../api/api";

export default function CharacterPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [char, setChar]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [favLoading, setFavLoading] = useState(false);
  const [comments, setComments]         = useState([]);
  const [commentText, setCommentText]   = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchCharacter(id)
      .then(data => { setChar(data); setComments(data.comments || []); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleFavorite = async () => {
    if (!user || favLoading) return;
    setFavLoading(true);
    try {
      const res = await toggleFavorite(id);
      setChar(prev => ({ ...prev, is_favorite: res.is_favorite }));
    } catch (e) { alert(e.message); }
    finally { setFavLoading(false); }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    setCommentLoading(true);
    try {
      const newC = await postCharacterComment(id, commentText.trim());
      setComments(prev => [newC, ...prev]);
      setCommentText("");
    } catch (e) { alert(e.message); }
    finally { setCommentLoading(false); }
  };

  if (loading) return <Loader />;
  if (error || !char) return (
    <div className="text-center py-32" style={{ color:"#6b7280" }}>
      <p className="text-4xl mb-4">😶</p>
      <p>{error || "Персонаж не найден."}</p>
      <Link to="/" style={{ color:"#a78bfa" }} className="text-sm mt-2 inline-block">← На главную</Link>
    </div>
  );

  const roleLabel = ROLE_LABELS[char.role] || char.role;

  return (
    <div className="max-w-3xl mx-auto space-y-8">

      {/* Хлебные крошки */}
      <nav className="flex items-center gap-2 text-sm" style={{ color:"#6b7280" }}>
        <Link to={`/anime/${char.anime_id}`} className="hover:underline" style={{ color:"#a78bfa" }}>
          {char.anime_title}
        </Link>
        <span>›</span>
        <span style={{ color:"#9ca3af" }}>Персонажи</span>
        <span>›</span>
        <span className="text-white">{char.name}</span>
      </nav>

      {/* Карточка персонажа */}
      <div className="rounded-2xl overflow-hidden"
        style={{ backgroundColor:"#13151c", border:"1px solid rgba(255,255,255,0.05)" }}>

        {/* Верхняя часть с фото и именем */}
        <div className="relative p-6 pb-0">
          {/* Фоновый размытый аватар */}
          {char.image_url && (
            <div className="absolute inset-0 overflow-hidden rounded-t-2xl">
              <img src={char.image_url} alt=""
                className="w-full h-full object-cover object-top"
                style={{ filter:"blur(40px) brightness(0.15)", transform:"scale(1.2)" }} />
            </div>
          )}

          <div className="relative flex flex-col sm:flex-row gap-6 items-start sm:items-end pb-6">
            {/* Аватар */}
            <div className="w-32 h-44 rounded-2xl overflow-hidden flex-shrink-0 shadow-2xl"
              style={{ border:"2px solid rgba(255,255,255,0.15)" }}>
              {char.image_url
                ? <img src={char.image_url} alt={char.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-4xl font-black"
                    style={{ backgroundColor:"#1a1d26", color:"#4b5563" }}>{char.name[0]}</div>}
            </div>

            {/* Имя и мета */}
            <div className="flex-1 min-w-0">
              <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2"
                style={{ background:"rgba(139,92,246,0.2)", color:"#c4b5fd", border:"1px solid rgba(139,92,246,0.3)" }}>
                {roleLabel}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">{char.name}</h1>
              {char.name_jp && (
                <p className="text-base mt-0.5" style={{ color:"#6b7280" }}>{char.name_jp}</p>
              )}
              <p className="text-sm mt-2" style={{ color:"#9ca3af" }}>
                из аниме{" "}
                <Link to={`/anime/${char.anime_id}`} style={{ color:"#a78bfa" }}>
                  {char.anime_title}
                </Link>
              </p>

              {/* Кнопка избранного */}
              <div className="mt-4">
                {user ? (
                  <button onClick={handleFavorite} disabled={favLoading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: char.is_favorite
                        ? "linear-gradient(to right, #dc2626, #9f1239)"
                        : "linear-gradient(to right, #7c3aed, #a21caf)",
                      color:"white",
                      opacity: favLoading ? 0.6 : 1,
                      border:"none",
                      cursor: favLoading ? "not-allowed" : "pointer",
                      boxShadow: char.is_favorite
                        ? "0 4px 15px rgba(220,38,38,0.3)"
                        : "0 4px 15px rgba(124,58,237,0.3)",
                    }}>
                    <span style={{ fontSize:"1rem" }}>{char.is_favorite ? "♥" : "♡"}</span>
                    {favLoading ? "..." : char.is_favorite ? "В избранном" : "Добавить в избранное"}
                  </button>
                ) : (
                  <Link to="/login"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ backgroundColor:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"#9ca3af" }}>
                    ♡ Войдите, чтобы добавить в избранное
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Описание */}
        {char.description && (
          <div className="px-6 py-5" style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color:"#6b7280" }}>
              О персонаже
            </h2>
            <p className="text-sm leading-relaxed" style={{ color:"#d1d5db" }}>{char.description}</p>
          </div>
        )}

        {/* Характеристики */}
        {(char.age || char.gender || char.abilities) && (
          <div className="px-6 py-5" style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color:"#6b7280" }}>
              Характеристики
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
              {char.age && (
                <InfoRow label="Возраст" value={char.age} />
              )}
              {char.gender && (
                <InfoRow label="Пол" value={char.gender === "М" ? "Мужской" : char.gender === "Ж" ? "Женский" : char.gender} />
              )}
              {char.abilities && (
                <div className="col-span-2 py-2" style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-xs text-gray-500 mb-1">Способности</p>
                  <p className="text-sm text-white">{char.abilities}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Сэйю */}
        {char.seiyu?.length > 0 && (
          <div className="px-6 py-5" style={{ borderTop:"1px solid rgba(255,255,255,0.05)" }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color:"#6b7280" }}>
              Голос
            </h2>
            <div className="flex flex-wrap gap-3">
              {char.seiyu.map(s => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl p-3"
                  style={{ backgroundColor:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
                  {s.image_url && (
                    <img src={s.image_url} alt={s.name}
                      className="w-10 h-10 rounded-full object-cover"
                      style={{ border:"1px solid rgba(255,255,255,0.1)" }} />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-white">{s.name}</p>
                    {s.name_jp && <p className="text-xs" style={{ color:"#6b7280" }}>{s.name_jp}</p>}
                    <p className="text-xs mt-0.5" style={{ color:"#a78bfa" }}>
                      {s.language === "ja" ? "Японский" : s.language === "en" ? "Английский" : s.language}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Комментарии */}
      <div className="rounded-2xl overflow-hidden"
        style={{ backgroundColor:"#13151c", border:"1px solid rgba(255,255,255,0.05)" }}>
        <div className="px-6 py-5" style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
          <h2 className="text-base font-bold text-white mb-1">Комментарии</h2>
          <p className="text-xs" style={{ color:"#6b7280" }}>Обсуждение персонажа</p>
        </div>
        <div className="px-6 py-5 space-y-5">
          {/* Форма */}
          {user ? (
            <form onSubmit={handleComment} className="space-y-3">
              <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                placeholder="Ваши мысли о персонаже…" rows={3}
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none resize-none"
                style={{ backgroundColor:"#0d0f14", border:"1px solid rgba(255,255,255,0.1)" }}
                onFocus={e => e.target.style.borderColor="rgba(139,92,246,0.4)"}
                onBlur={e => e.target.style.borderColor="rgba(255,255,255,0.1)"} />
              <button type="submit" disabled={!commentText.trim() || commentLoading}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white"
                style={{
                  background: commentText.trim() ? "linear-gradient(to right, #7c3aed, #a21caf)" : "rgba(255,255,255,0.1)",
                  opacity: commentText.trim() ? 1 : 0.5,
                  cursor: commentText.trim() ? "pointer" : "not-allowed",
                  border:"none",
                }}>
                {commentLoading ? "Отправка…" : "Отправить"}
              </button>
            </form>
          ) : (
            <div className="rounded-xl px-4 py-3 text-sm"
              style={{ backgroundColor:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", color:"#6b7280" }}>
              <Link to="/login" style={{ color:"#a78bfa" }}>Войдите</Link>, чтобы комментировать.
            </div>
          )}
          {/* Список */}
          {comments.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color:"#4b5563" }}>Комментариев пока нет.</p>
          ) : (
            <div className="space-y-3">
              {comments.map(c => (
                <div key={c.id} className="rounded-xl px-4 py-3"
                  style={{ backgroundColor:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background:"linear-gradient(135deg, #7c3aed, #a21caf)" }}>
                      {c.username?.[0]?.toUpperCase() || "?"}
                    </span>
                    <span className="text-sm font-medium text-white">{c.username}</span>
                    <span className="text-xs ml-auto" style={{ color:"#4b5563" }}>
                      {new Date(c.created_at).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color:"#d1d5db" }}>{c.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Кнопка назад в аниме */}
      <Link to={`/anime/${char.anime_id}`}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium"
        style={{ backgroundColor:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"#9ca3af", textDecoration:"none" }}>
        ← Вернуться к {char.anime_title}
      </Link>

    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 text-sm"
      style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
      <span style={{ color:"#6b7280" }}>{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

function Loader() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="w-8 h-8 rounded-full border-2 animate-spin"
        style={{ borderColor:"rgba(255,255,255,0.1)", borderTopColor:"#8b5cf6" }} />
    </div>
  );
}
