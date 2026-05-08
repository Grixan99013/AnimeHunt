// src/pages/Home.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { fetchAnimeList, fetchCharacterList, fetchNews, createNews, deleteNews, searchStaff } from "../api/api";
import { useAuth } from "../App";
import AnimeCard from "../components/AnimeCard";
import { AnimeGridSkeleton, HeroSkeleton } from "../components/Skeleton";
import { usePageMeta } from "../hooks/usePageMeta";

// Рендерит текст новости: форматирование + кликабельные ссылки [anime:id|Название] и т.д.
function NewsBodyInline({ body, clamp = 3 }) {
  if (!body) return null;
  const linkRe = /\[(anime|character|staff):(\d+)\|([^\]]+)\]/g;
  const fmtRe  = /(\*\*(.+?)\*\*|~~(.+?)~~|__(.+?)__|_(.+?)_)/gs;

  function renderFmt(text) {
    const parts = []; let last = 0, m, i = 0;
    while ((m = fmtRe.exec(text)) !== null) {
      if (m.index > last) parts.push(<span key={i++}>{text.slice(last, m.index)}</span>);
      if      (m[0].startsWith("**")) parts.push(<strong key={i++}>{m[2]}</strong>);
      else if (m[0].startsWith("~~")) parts.push(<s       key={i++}>{m[3]}</s>);
      else if (m[0].startsWith("__")) parts.push(<u       key={i++}>{m[4]}</u>);
      else                            parts.push(<em      key={i++}>{m[5]}</em>);
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push(<span key={i++}>{text.slice(last)}</span>);
    return parts;
  }

  const segments = []; let last = 0, m, idx = 0;
  while ((m = linkRe.exec(body)) !== null) {
    if (m.index > last) segments.push(...renderFmt(body.slice(last, m.index)).map((el, i) => ({ ...el, key: idx++ + "-f" })));
    const [, type, id, label] = m;
    const href = type === "anime" ? `/anime/${id}` : type === "character" ? `/characters/${id}` : `/staff/${id}`;
    segments.push(
      <a key={idx++} href={href} onClick={e => e.stopPropagation()}
        style={{ color: "#a78bfa", textDecoration: "none", fontWeight: 600 }}>
        {label}
      </a>
    );
    last = m.index + m[0].length;
  }
  if (last < body.length) {
    renderFmt(body.slice(last)).forEach((el, i) => segments.push({ ...el, key: idx++ + "-f" }));
  }
  return (
    <p style={{ color: "var(--text-faint)", fontSize: 13, lineHeight: 1.6, margin: 0,
      display: "-webkit-box", WebkitLineClamp: clamp, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
      {segments}
    </p>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [query, setQuery]         = useState("");
  const [newReleases, setNew]     = useState([]);
  const [topRated, setTop]        = useState([]);
  const [featured, setFeatured]   = useState(null);
  const [news, setNews]           = useState([]);
  const [newsTotal, setNewsTotal] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsPage, setNewsPage]   = useState(1);
  const NEWS_PER_PAGE = 6;
  const navigate = useNavigate();

  const isModOrAdmin = user && (user.role_id === 1 || user.role_id === 2);

  useEffect(() => {
    Promise.all([
      fetchAnimeList({ is_new: true, limit: 8 }),
      fetchAnimeList({ sort: "rating", limit: 4 }),
      fetchNews({ limit: NEWS_PER_PAGE, page: 1 }),
    ]).then(([newList, topList, newsData]) => {
      const newItems = Array.isArray(newList) ? newList : (newList.items || []);
      const topItems = Array.isArray(topList) ? topList : (topList.items || []);
      setNew(newItems);
      setTop(topItems);
      setFeatured(newItems[0] || topItems[0] || null);
      const nd = Array.isArray(newsData) ? { items: newsData, total: newsData.length } : newsData;
      setNews(nd.items || []);
      setNewsTotal(nd.total || 0);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const loadMoreNews = useCallback(async () => {
    const nextPage = newsPage + 1;
    setNewsLoading(true);
    try {
      const data = await fetchNews({ limit: NEWS_PER_PAGE, page: nextPage });
      const nd = Array.isArray(data) ? { items: data, total: data.length } : data;
      setNews(prev => [...prev, ...(nd.items || [])]);
      setNewsTotal(nd.total || 0);
      setNewsPage(nextPage);
    } catch (e) { console.error(e); }
    finally { setNewsLoading(false); }
  }, [newsPage]);

  const handleNewsAdded = (item) => {
    setNews(prev => [item, ...prev]);
    setNewsTotal(t => t + 1);
  };

  const handleNewsDelete = async (id) => {
    if (!window.confirm("Удалить новость?")) return;
    try {
      await deleteNews(id);
      setNews(prev => prev.filter(n => n.id !== id));
      setNewsTotal(t => Math.max(0, t - 1));
    } catch (e) { alert(e.message); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/catalog?q=${encodeURIComponent(query.trim())}`);
  };

  usePageMeta("Главная", "Каталог аниме — новинки, топ по оценке и популярные тайтлы на AnimeHunt");

  if (loading) return (
    <div className="space-y-16">
      <HeroSkeleton />
      <AnimeGridSkeleton count={8} />
    </div>
  );

  const hasMoreNews = newsTotal > news.length;

  return (
    <div className="space-y-16">

      {/* ── Герой ─────────────────────────────────────────────── */}
      {featured && (
        <section className="relative -mx-4 sm:-mx-6 -mt-8 overflow-hidden rounded-2xl flex items-end"
          style={{ height: "460px" }}>
          <div className="absolute inset-0">
            <img src={featured.poster_url} alt={featured.title}
              className="w-full h-full object-cover object-top"
              style={{ transform: "scale(1.05)", filter: "brightness(0.35)" }} />
            <div className="absolute inset-0"
              style={{ background: "linear-gradient(to right, var(--bg-base), rgba(13,15,20,0.6), transparent)" }} />
            <div className="absolute inset-0"
              style={{ background: "linear-gradient(to top, var(--bg-base), transparent)" }} />
          </div>
          <div className="relative px-8 pb-10 max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(217,70,239,0.3)", color: "#e879f9" }}>В ЦЕНТРЕ ВНИМАНИЯ</span>
            </div>
            <h2 className="text-4xl font-black tracking-tight text-white mb-2">{featured.title}</h2>
            {featured.title_jp && <p className="text-sm mb-1" style={{ color: "var(--text-faint)" }}>{featured.title_jp}</p>}
            {featured.synopsis && (
              <p className="text-sm leading-relaxed mb-6 line-clamp-3" style={{ color: "var(--text-secondary)" }}>{featured.synopsis}</p>
            )}
            <Link to={`/anime/${featured.id}`}
              className="inline-block px-5 py-2.5 rounded-xl text-white font-semibold text-sm"
              style={{ background: "linear-gradient(to right, #7c3aed, #a21caf)", boxShadow: "0 4px 20px rgba(124,58,237,0.35)" }}>
              Подробнее
            </Link>
          </div>
        </section>
      )}

      {/* ── Новинки ───────────────────────────────────────────── */}
      {newReleases.length > 0 && (
        <section>
          <SectionHeader title="Новинки" subtitle="Последние и анонсированные тайтлы" href="/catalog?is_new=true" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
            {newReleases.map(a => <AnimeCard key={a.id} anime={a} />)}
          </div>
        </section>
      )}

      {/* ── Топ по оценке ─────────────────────────────────────── */}
      {topRated.length > 0 && (
        <section>
          <SectionHeader title="Топ по оценке" subtitle="Самые высокооцениваемые тайтлы" href="/catalog?sort=rating" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            {topRated.map(a => <AnimeCard key={a.id} anime={a} />)}
          </div>
        </section>
      )}

      {/* ── Блок новостей ─────────────────────────────────────── */}
      <section>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Новости</h2>
            <p style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 3 }}>
              Анонсы и обновления AnimeHunt{newsTotal > 0 ? ` · ${newsTotal}` : ""}
            </p>
          </div>
          {isModOrAdmin && <AddNewsButton onAdded={handleNewsAdded} />}
        </div>

        {news.length === 0 ? (
          <div style={{
            borderRadius: 18, padding: "48px 24px", textAlign: "center",
            background: "var(--bg-surface)", border: "1px solid var(--border)",
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📰</div>
            <p style={{ color: "var(--text-faint)", fontSize: 14 }}>Новостей пока нет</p>
            {isModOrAdmin && <p style={{ color: "var(--text-veryfaint)", fontSize: 12, marginTop: 6 }}>Нажмите «+ Добавить новость» чтобы опубликовать первую</p>}
          </div>
        ) : (
          <>
            <NewsCardFeatured news={news[0]} canEdit={isModOrAdmin} onDelete={handleNewsDelete} />
            {news.length > 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ marginTop: 16 }}>
                {news.slice(1).map(n => (
                  <NewsCard key={n.id} news={n} canEdit={isModOrAdmin} onDelete={handleNewsDelete} />
                ))}
              </div>
            )}
            {hasMoreNews && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
                <button onClick={loadMoreNews} disabled={newsLoading}
                  style={{
                    background: "var(--bg-elevated)", border: "1px solid var(--border)",
                    color: "var(--text-muted)", borderRadius: 12, padding: "10px 28px",
                    fontSize: 14, cursor: newsLoading ? "not-allowed" : "pointer",
                    opacity: newsLoading ? 0.6 : 1,
                  }}>
                  {newsLoading ? "Загрузка…" : `Показать ещё (${newsTotal - news.length})`}
                </button>
              </div>
            )}
          </>
        )}
      </section>

    </div>
  );
}

/* ── Пикер ссылок для Home.jsx ─────────────────────────────────*/
function HomeLinkPicker({ body, setBody, textareaRef, onClose }) {
  const [tab, setTab]     = useState("anime");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setResults([]);
    if (!query.trim()) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        if (tab === "anime") {
          const d = await fetchAnimeList({ q: query, limit: 6 });
          setResults((d.items || d || []).map(a => ({ id: a.id, label: a.title_ru || a.title, sub: a.title_en || "", tag: `[anime:${a.id}|${a.title_ru || a.title}]` })));
        } else if (tab === "character") {
          const d = await fetchCharacterList({ q: query, limit: 6 });
          setResults((d.items || d || []).map(c => ({ id: c.id, label: c.name_ru || c.name, sub: c.name_en || "", tag: `[character:${c.id}|${c.name_ru || c.name}]` })));
        } else {
          const d = await searchStaff(query);
          setResults((d || []).map(s => ({ id: s.id, label: s.name, sub: s.role || "", tag: `[staff:${s.id}|${s.name}]` })));
        }
      } catch { setResults([]); } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query, tab]);

  const insertLink = (tag) => {
    const ta = textareaRef.current;
    if (!ta) { setBody(b => b + tag); onClose(); return; }
    const s = ta.selectionStart;
    setBody(b => b.slice(0, s) + tag + b.slice(s));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(s + tag.length, s + tag.length); }, 0);
    onClose();
  };

  const tabS = (t) => ({
    padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
    fontSize: 11, fontWeight: 600,
    background: tab === t ? "#7c3aed" : "var(--bg-elevated)",
    color: tab === t ? "#fff" : "var(--text-muted)",
  });

  return (
    <div style={{
      position: "absolute", zIndex: 300, top: "calc(100% + 4px)", left: 0, right: 0,
      background: "var(--bg-surface)", border: "1px solid #7c3aed",
      borderRadius: 12, padding: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>Вставить ссылку</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer" }}>✕</button>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        {[["anime","🎌 Аниме"],["character","👤 Персонаж"],["staff","✍️ Автор"]].map(([k,l]) => (
          <button key={k} style={tabS(k)} onClick={() => { setTab(k); setQuery(""); setResults([]); }}>{l}</button>
        ))}
      </div>
      <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
        placeholder={tab === "anime" ? "Поиск аниме..." : tab === "character" ? "Поиск персонажа..." : "Поиск автора..."}
        style={{ width: "100%", boxSizing: "border-box", background: "var(--bg-elevated)",
          border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)",
          padding: "7px 10px", fontSize: 13, outline: "none" }} />
      {loading && <p style={{ color: "var(--text-faint)", fontSize: 12, marginTop: 6 }}>Поиск...</p>}
      {results.length > 0 && (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2, maxHeight: 180, overflowY: "auto" }}>
          {results.map(r => (
            <button key={r.id} onClick={() => insertLink(r.tag)}
              style={{ display: "flex", flexDirection: "column", alignItems: "flex-start",
                background: "var(--bg-elevated)", border: "1px solid var(--border)",
                borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#7c3aed"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{r.label}</span>
              {r.sub && <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{r.sub}</span>}
            </button>
          ))}
        </div>
      )}
      {!loading && query.trim() && results.length === 0 && (
        <p style={{ color: "var(--text-faint)", fontSize: 12, marginTop: 6 }}>Ничего не найдено</p>
      )}
    </div>
  );
}

/* ── Кнопка + модалка добавления новости (с полным редактором) ─*/
function AddNewsButton({ onAdded }) {
  const [open, setOpen]     = useState(false);
  const [title, setTitle]   = useState("");
  const [body, setBody]     = useState("");
  const [cover, setCover]   = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const textareaRef = useRef(null);
  const pickerRef   = useRef(null);

  const reset = () => { setTitle(""); setBody(""); setCover(""); setError(""); setShowPicker(false); };
  const close = () => { setOpen(false); reset(); };

  // Закрываем picker при клике вне
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  const insert = useCallback((before, after = "") => {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = body.slice(s, e) || "текст";
    const next = body.slice(0, s) + before + sel + after + body.slice(e);
    setBody(next);
    setTimeout(() => { ta.focus(); const pos = s + before.length + sel.length + after.length; ta.setSelectionRange(pos, pos); }, 0);
  }, [body]);

  const insertSpoiler = useCallback(() => {
    const ta = textareaRef.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = body.slice(s, e) || "спойлер";
    setBody(b => b.slice(0, s) + `[spoiler]${sel}[/spoiler]` + b.slice(e));
    setTimeout(() => ta.focus(), 0);
  }, [body]);

  const handleSubmit = async () => {
    if (!title.trim()) { setError("Укажите заголовок"); return; }
    if (!body.trim())  { setError("Укажите текст новости"); return; }
    setSaving(true); setError("");
    try {
      const item = await createNews({ title: title.trim(), body: body.trim(), cover_url: cover.trim() || null, is_published: true });
      onAdded(item); close();
    } catch (e) { setError(e.message || "Ошибка при публикации"); }
    finally { setSaving(false); }
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box", background: "var(--bg-elevated)",
    border: "1px solid var(--border)", borderRadius: 10, padding: "9px 13px",
    color: "var(--text-primary)", fontSize: 14, outline: "none",
  };
  const labelStyle = {
    display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-faint)",
    marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em",
  };
  const toolBtn = (label, title, action, extra = {}) => (
    <button key={label} type="button" title={title} onClick={action}
      style={{ width: 28, height: 26, borderRadius: 6, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 12, cursor: "pointer",
        background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)", ...extra }}>
      {label}
    </button>
  );

  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "linear-gradient(to right,#7c3aed,#a21caf)", color: "#fff",
          border: "none", borderRadius: 10, padding: "8px 15px",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
        </svg>
        Добавить новость
      </button>

      {open && (
        <div onClick={close} style={{
          position: "fixed", inset: 0, zIndex: 2000,
          background: "rgba(0,0,0,0.72)", display: "flex",
          alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: 20, padding: 28, width: "100%", maxWidth: 580,
            boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
            maxHeight: "92vh", overflowY: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 18, margin: 0 }}>📰 Новая новость</h2>
              <button onClick={close} style={{ background: "none", border: "none", color: "var(--text-faint)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Заголовок */}
              <div>
                <label style={labelStyle}>Заголовок *</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="Например: Анонс нового сезона…" maxLength={200} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "rgba(124,58,237,0.5)"}
                  onBlur={e  => e.target.style.borderColor = "var(--border)"} />
              </div>

              {/* URL обложки */}
              <div>
                <label style={labelStyle}>URL обложки (необязательно)</label>
                <input value={cover} onChange={e => setCover(e.target.value)}
                  placeholder="https://example.com/image.jpg" type="url" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "rgba(124,58,237,0.5)"}
                  onBlur={e  => e.target.style.borderColor = "var(--border)"} />
                {cover && (
                  <div style={{ marginTop: 8, borderRadius: 8, overflow: "hidden", height: 90 }}>
                    <img src={cover} alt="preview" loading="lazy"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      onError={e => { e.target.style.display = "none"; }} />
                  </div>
                )}
              </div>

              {/* Редактор текста */}
              <div>
                <label style={labelStyle}>Текст *</label>
                {/* Тулбар */}
                <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 6, flexWrap: "wrap" }}>
                  {toolBtn("B", "Жирный (Ctrl+B)", () => insert("**", "**"), { fontWeight: 700 })}
                  {toolBtn("I", "Курсив (Ctrl+I)",  () => insert("_", "_"),   { fontStyle: "italic" })}
                  {toolBtn("S", "Зачёркнутый",      () => insert("~~", "~~"), { textDecoration: "line-through" })}
                  {toolBtn("U", "Подчёркнутый",     () => insert("__", "__"), { textDecoration: "underline" })}
                  {toolBtn("⚠️","Spoiler",           insertSpoiler)}
                  <div style={{ width: 1, height: 18, background: "var(--border)", margin: "0 3px" }} />
                  {/* Кнопка ссылки */}
                  <div style={{ position: "relative" }} ref={pickerRef}>
                    <button type="button" title="Вставить ссылку на аниме/персонажа/автора"
                      onClick={() => setShowPicker(v => !v)}
                      style={{
                        height: 26, padding: "0 10px", borderRadius: 6, border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600,
                        background: showPicker ? "#7c3aed" : "var(--bg-elevated)",
                        color: showPicker ? "#fff" : "var(--text-muted)",
                        outline: showPicker ? "1px solid #7c3aed" : "1px solid var(--border)",
                      }}>
                      🔗 Ссылка
                    </button>
                    {showPicker && (
                      <HomeLinkPicker body={body} setBody={setBody} textareaRef={textareaRef} onClose={() => setShowPicker(false)} />
                    )}
                  </div>
                </div>
                <textarea ref={textareaRef} value={body} onChange={e => setBody(e.target.value)}
                  placeholder="Текст новости…" rows={6}
                  style={{ ...inputStyle, resize: "vertical", minHeight: 120, lineHeight: 1.6, fontFamily: "monospace" }}
                  onKeyDown={e => {
                    if (e.ctrlKey && e.key === "b") { e.preventDefault(); insert("**", "**"); }
                    if (e.ctrlKey && e.key === "i") { e.preventDefault(); insert("_", "_"); }
                  }}
                  onFocus={e => e.target.style.borderColor = "rgba(124,58,237,0.5)"}
                  onBlur={e  => e.target.style.borderColor = "var(--border)"} />
                <p style={{ fontSize: 11, color: "var(--text-veryfaint)", marginTop: 4 }}>
                  **жирный** · _курсив_ · ~~зачёрк~~ · __подчёрк__ · [spoiler]…[/spoiler] · 🔗 для ссылок
                </p>
              </div>

              {/* Превью */}
              {body.trim() && (
                <div style={{ background: "var(--bg-elevated)", borderRadius: 8, padding: "10px 14px", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>ПРЕВЬЮ</div>
                  <NewsBodyInline body={body} clamp={5} />
                </div>
              )}

              {error && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>⚠ {error}</p>}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={close}
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)",
                    color: "var(--text-muted)", borderRadius: 10, padding: "9px 20px", fontSize: 13, cursor: "pointer" }}>
                  Отмена
                </button>
                <button type="button" onClick={handleSubmit} disabled={saving}
                  style={{
                    background: saving ? "var(--bg-elevated)" : "linear-gradient(to right,#7c3aed,#a21caf)",
                    color: saving ? "var(--text-muted)" : "#fff",
                    border: "none", borderRadius: 10, padding: "9px 22px",
                    fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
                  }}>
                  {saving ? "Публикация…" : "Опубликовать"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Большая карточка первой новости ──────────────────────────*/
function NewsCardFeatured({ news: n, canEdit, onDelete }) {
  const [hover, setHover] = useState(false);
  const dateStr = new Date(n.created_at).toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: "var(--bg-surface)",
        border: `1px solid ${hover ? "rgba(124,58,237,0.4)" : "var(--border)"}`,
        borderRadius: 16, overflow: "hidden",
        transition: "border-color .2s, transform .2s",
        transform: hover ? "translateY(-2px)" : "none",
        display: "flex", cursor: "pointer", position: "relative", minHeight: 180,
      }}
      onClick={() => window.location.href = `/news/${n.id}`}>
      {n.cover_url ? (
        <div style={{ width: "38%", minWidth: 160, flexShrink: 0, overflow: "hidden", position: "relative" }}>
          <img src={n.cover_url} alt={n.title} loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block",
              transform: hover ? "scale(1.05)" : "scale(1)", transition: "transform .35s" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right,transparent 60%,var(--bg-surface))" }} />
        </div>
      ) : (
        <div style={{ width: 140, flexShrink: 0,
          background: "linear-gradient(135deg,rgba(124,58,237,0.18),rgba(162,28,175,0.12))",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>
          📰
        </div>
      )}
      <div style={{ flex: 1, padding: "22px 24px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa",
            background: "rgba(124,58,237,0.15)", borderRadius: 6, padding: "2px 8px",
            textTransform: "uppercase", letterSpacing: "0.08em" }}>Новость</span>
          <span style={{ color: "var(--text-veryfaint)", fontSize: 12 }}>{dateStr}</span>
          {n.author_username && <span style={{ color: "var(--text-veryfaint)", fontSize: 12 }}>· @{n.author_username}</span>}
        </div>
        <h3 style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 19, lineHeight: 1.3, margin: 0,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {n.title}
        </h3>
        <NewsBodyInline body={n.body} clamp={3} />
      </div>
      {canEdit && (
        <button onClick={e => { e.stopPropagation(); onDelete(n.id); }}
          title="Удалить"
          style={{
            position: "absolute", top: 10, right: 10,
            background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
            color: "#f87171", borderRadius: 8, width: 28, height: 28,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, cursor: "pointer",
            opacity: hover ? 1 : 0, transition: "opacity .15s",
          }}>🗑</button>
      )}
    </div>
  );
}

/* ── Обычная карточка ─────────────────────────────────────────*/
function NewsCard({ news: n, canEdit, onDelete }) {
  const [hover, setHover] = useState(false);
  const dateStr = new Date(n.created_at).toLocaleDateString("ru", { day: "numeric", month: "long" });
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: "var(--bg-surface)",
        border: `1px solid ${hover ? "rgba(124,58,237,0.35)" : "var(--border)"}`,
        borderRadius: 14, overflow: "hidden",
        transition: "border-color .2s, transform .2s",
        transform: hover ? "translateY(-3px)" : "none",
        cursor: "pointer", position: "relative",
        display: "flex", flexDirection: "column",
      }}
      onClick={() => window.location.href = `/news/${n.id}`}>
      {n.cover_url ? (
        <div style={{ height: 148, overflow: "hidden", flexShrink: 0 }}>
          <img src={n.cover_url} alt={n.title} loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block",
              transform: hover ? "scale(1.05)" : "scale(1)", transition: "transform .35s" }} />
        </div>
      ) : (
        <div style={{ height: 68, flexShrink: 0,
          background: "linear-gradient(135deg,rgba(124,58,237,0.14),rgba(162,28,175,0.09))",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
          📰
        </div>
      )}
      <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <h3 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 14,
          lineHeight: 1.35, margin: 0,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {n.title}
        </h3>
        <NewsBodyInline body={n.body} clamp={2} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ color: "var(--text-veryfaint)", fontSize: 11 }}>{dateStr}</span>
          {n.author_username && <span style={{ color: "var(--text-faint)", fontSize: 11 }}>@{n.author_username}</span>}
        </div>
      </div>
      {canEdit && (
        <button onClick={e => { e.stopPropagation(); onDelete(n.id); }}
          title="Удалить"
          style={{
            position: "absolute", top: 8, right: 8,
            background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
            color: "#f87171", borderRadius: 7, width: 26, height: 26,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, cursor: "pointer",
            opacity: hover ? 1 : 0, transition: "opacity .15s",
          }}>🗑</button>
      )}
    </div>
  );
}

function SectionHeader({ title, subtitle, href }) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{title}</h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-faint)" }}>{subtitle}</p>
      </div>
      {href && <Link to={href} className="text-sm" style={{ color: "#a78bfa" }}>Смотреть все →</Link>}
    </div>
  );
}
