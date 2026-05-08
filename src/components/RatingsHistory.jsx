// src/components/RatingsHistory.jsx
// График истории оценок — чистый SVG, без зависимостей
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchMyRatingsHistory, fetchUserRatingsHistory } from "../api/api";

const SCORE_COLORS = {
  10:"#22c55e", 9:"#4ade80", 8:"#86efac",
  7:"#fbbf24", 6:"#f59e0b",
  5:"#f97316", 4:"#ef4444", 3:"#dc2626", 2:"#b91c1c", 1:"#7f1d1d",
};
const SCORE_LABELS = {
  10:"Шедевр",9:"Отлично",8:"Очень хорошо",
  7:"Хорошо",6:"Нормально",
  5:"Средне",4:"Плохо",3:"Очень плохо",2:"Ужасно",1:"Кошмар",
};

export function ScoreBarChart({ username, isSelf }) {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fn = isSelf ? fetchMyRatingsHistory : () => fetchUserRatingsHistory(username);
    fn().then(setRatings).catch(() => {}).finally(() => setLoading(false));
  }, [username, isSelf]);

  if (loading) return null;
  if (ratings.length === 0) return null;

  // продолжение ниже — оригинальный render
  return <ScoreBarChartInner ratings={ratings} />;
}

function ScoreBarChartInner({ ratings }) {
  // Распределение по оценкам
  const dist = Array.from({ length: 10 }, (_, i) => ({
    score: 10 - i,
    count: ratings.filter(r => r.score === 10 - i).length,
  }));
  const maxCount = Math.max(...dist.map(d => d.count), 1);
  const avg = ratings.length
    ? (ratings.reduce((s, r) => s + r.score, 0) / ratings.length).toFixed(2)
    : null;

  return (
    <div style={{ background:"var(--bg-surface)", borderRadius:14, padding:20,
      border:"1px solid var(--border)", marginBottom:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:16 }}>
        <h3 style={{ color:"#fff", fontWeight:700, fontSize:15, margin:0 }}>Распределение оценок</h3>
        <div style={{ display:"flex", gap:16, fontSize:13 }}>
          <span style={{ color:"#6b7280" }}>Всего: <strong style={{ color:"#fff" }}>{ratings.length}</strong></span>
          {avg && <span style={{ color:"#6b7280" }}>Средняя: <strong style={{ color:"#fbbf24" }}>{avg}</strong></span>}
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {dist.map(({ score, count }) => (
          <div key={score} style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ minWidth:16, textAlign:"right", fontSize:13, fontWeight:700,
              color: SCORE_COLORS[score] }}>{score}</span>
            <div style={{ flex:1, height:22, background:"var(--bg-hover)",
              borderRadius:4, overflow:"hidden", position:"relative" }}>
              <div style={{
                height:"100%", borderRadius:4,
                background: SCORE_COLORS[score] + "88",
                width: `${(count / maxCount) * 100}%`,
                transition: "width .5s ease",
                display:"flex", alignItems:"center", paddingLeft:8,
              }}>
                {count > 0 && (
                  <span style={{ fontSize:11, fontWeight:700, color:"#fff",
                    opacity: count/maxCount > 0.2 ? 1 : 0 }}>{count}</span>
                )}
              </div>
              {count > 0 && count/maxCount <= 0.2 && (
                <span style={{ position:"absolute", left: `${(count/maxCount)*100 + 1}%`,
                  top:"50%", transform:"translateY(-50%)", fontSize:11, color:"#9ca3af" }}>{count}</span>
              )}
            </div>
            <span style={{ minWidth:24, fontSize:11, color:"#6b7280" }}>{SCORE_LABELS[score]?.split(" ")[0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineChart({ ratings }) {
  if (ratings.length < 2) return null;

  // Группируем по месяцам
  const byMonth = {};
  ratings.forEach(r => {
    const d = new Date(r.rated_at);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    if (!byMonth[key]) byMonth[key] = { count:0, scoreSum:0, month:key };
    byMonth[key].count++;
    byMonth[key].scoreSum += r.score;
  });

  const months = Object.values(byMonth)
    .sort((a,b) => a.month.localeCompare(b.month))
    .slice(-12); // последние 12 месяцев

  if (months.length < 2) return null;

  const maxCount = Math.max(...months.map(m => m.count));
  const W = 600, H = 120, PAD = { t:10, r:10, b:30, l:30 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;
  const xStep = chartW / (months.length - 1);

  const points = months.map((m, i) => ({
    x: PAD.l + i * xStep,
    y: PAD.t + chartH - (m.count / maxCount) * chartH,
    count: m.count,
    avg: (m.scoreSum / m.count).toFixed(1),
    label: m.month.slice(0, 7),
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${points[points.length-1].x} ${PAD.t+chartH} L ${PAD.l} ${PAD.t+chartH} Z`;

  const [tooltip, setTooltip] = useState(null);

  return (
    <div style={{ background:"var(--bg-surface)", borderRadius:14, padding:20,
      border:"1px solid var(--border)", marginBottom:16 }}>
      <h3 style={{ color:"#fff", fontWeight:700, fontSize:15, margin:"0 0 12px" }}>Активность по месяцам</h3>
      <div style={{ position:"relative" }}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow:"visible" }}>
          {/* Сетка */}
          {[0,0.25,0.5,0.75,1].map(frac => {
            const y = PAD.t + chartH - frac * chartH;
            return (
              <g key={frac}>
                <line x1={PAD.l} y1={y} x2={W-PAD.r} y2={y}
                  stroke="var(--border)" strokeWidth="1" />
                <text x={PAD.l-4} y={y+4} textAnchor="end" fill="#6b7280" fontSize="9">
                  {Math.round(frac * maxCount)}
                </text>
              </g>
            );
          })}

          {/* Область */}
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#areaGrad)" />

          {/* Линия */}
          <path d={pathD} fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinejoin="round"/>

          {/* Точки + подписи */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4" fill="#7c3aed" stroke="var(--bg-surface)" strokeWidth="2"
                style={{ cursor:"pointer" }}
                onMouseEnter={() => setTooltip(p)}
                onMouseLeave={() => setTooltip(null)} />
              {/* Метки месяцев — каждый 2й или 3й */}
              {(months.length <= 6 || i % Math.ceil(months.length/6) === 0) && (
                <text x={p.x} y={H-2} textAnchor="middle" fill="#6b7280" fontSize="9">
                  {p.label.slice(5)}/{p.label.slice(2,4)}
                </text>
              )}
            </g>
          ))}
        </svg>

        {/* Тултип */}
        {tooltip && (
          <div style={{
            position:"absolute", pointerEvents:"none",
            background:"var(--bg-elevated)", border:"1px solid rgba(124,58,237,0.4)",
            borderRadius:8, padding:"8px 12px", fontSize:12,
            color:"#fff", whiteSpace:"nowrap",
            top: 0, left: "50%", transform: "translateX(-50%)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}>
            <div style={{ color:"#a78bfa", fontWeight:700 }}>{tooltip.label}</div>
            <div>Оценок: <strong>{tooltip.count}</strong></div>
            <div>Средняя: <strong style={{ color:"#fbbf24" }}>{tooltip.avg}</strong></div>
          </div>
        )}
      </div>
    </div>
  );
}

function RecentRatings({ ratings }) {
  const [show, setShow] = useState(20);
  const recent = ratings.slice(0, show);

  return (
    <div style={{ background:"var(--bg-surface)", borderRadius:14, padding:20,
      border:"1px solid var(--border)" }}>
      <h3 style={{ color:"#fff", fontWeight:700, fontSize:15, margin:"0 0 14px" }}>Последние оценки</h3>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {recent.map((r, i) => (
          <Link key={i} to={`/anime/${r.anime_id}`} style={{ textDecoration:"none" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 10px",
              borderRadius:10, transition:"background .15s" }}
              onMouseEnter={e => e.currentTarget.style.background="var(--bg-hover)"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}>
              {r.poster_url
                ? <img src={r.poster_url} alt="" style={{ width:36, height:50, objectFit:"cover",
                    borderRadius:4, flexShrink:0 }} loading="lazy" />
                : <div style={{ width:36, height:50, background:"var(--bg-elevated)", borderRadius:4, flexShrink:0 }} />
              }
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ color:"#e5e7eb", fontWeight:600, fontSize:13, margin:0,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {r.anime_title}
                </p>
                <p style={{ color:"#6b7280", fontSize:11, margin:"2px 0 0" }}>
                  {new Date(r.rated_at).toLocaleDateString("ru")}
                </p>
              </div>
              <div style={{ textAlign:"center", flexShrink:0 }}>
                <div style={{ fontSize:20, fontWeight:900, color: SCORE_COLORS[r.score] }}>
                  {r.score}
                </div>
                <div style={{ fontSize:10, color:"#6b7280" }}>{SCORE_LABELS[r.score]}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {ratings.length > show && (
        <button onClick={() => setShow(s => s + 20)}
          style={{ marginTop:12, width:"100%", padding:"8px 0", borderRadius:10,
            border:"1px solid var(--border)", background:"transparent",
            color:"#9ca3af", cursor:"pointer", fontSize:13 }}>
          Показать ещё ({ratings.length - show} осталось)
        </button>
      )}
    </div>
  );
}

export default function RatingsHistory({ username, isSelf }) {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fn = isSelf ? fetchMyRatingsHistory : () => fetchUserRatingsHistory(username);
    fn().then(setRatings).catch(() => {}).finally(() => setLoading(false));
  }, [username, isSelf]);

  if (loading) return (
    <div style={{ padding:32, textAlign:"center", color:"#6b7280" }}>Загрузка...</div>
  );
  if (ratings.length === 0) return (
    <div style={{ padding:"40px 20px", textAlign:"center", color:"#6b7280" }}>
      <p style={{ fontSize:32, marginBottom:8 }}>🎯</p>
      <p>Оценок пока нет</p>
    </div>
  );

  return (
    <div>
      <ScoreBarChart ratings={ratings} />
      <TimelineChart ratings={ratings} />
      <RecentRatings ratings={ratings} />
    </div>
  );
}
