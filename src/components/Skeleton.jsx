// src/components/Skeleton.jsx
// Скелетон-компоненты для состояния загрузки

function SkeletonBox({ style }) {
  return (
    <div
      style={{
        background: "linear-gradient(90deg, #1c1f2a 25%, #252836 50%, #1c1f2a 75%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-shimmer 1.5s infinite",
        borderRadius: 8,
        ...style,
      }}
    />
  );
}

// Скелетон карточки аниме (повторяет AnimeCard)
export function AnimeCardSkeleton() {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      {/* Постер */}
      <SkeletonBox style={{ height: 256, borderRadius: 0 }} />
      {/* Контент */}
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <SkeletonBox style={{ height: 16, width: "80%" }} />
        <SkeletonBox style={{ height: 12, width: "50%" }} />
        <div style={{ display: "flex", gap: 6 }}>
          <SkeletonBox style={{ height: 20, width: 50 }} />
          <SkeletonBox style={{ height: 20, width: 60 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <SkeletonBox style={{ height: 12, width: 70 }} />
          <SkeletonBox style={{ height: 12, width: 30 }} />
        </div>
      </div>
    </div>
  );
}

// Сетка скелетонов для каталога
export function AnimeGridSkeleton({ count = 24 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <AnimeCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Скелетон карточки персонажа
export function CharacterCardSkeleton() {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <SkeletonBox style={{ height: 200, borderRadius: 0 }} />
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
        <SkeletonBox style={{ height: 14, width: "75%" }} />
        <SkeletonBox style={{ height: 11, width: "55%" }} />
      </div>
    </div>
  );
}

// Скелетон героя на главной
export function HeroSkeleton() {
  return (
    <SkeletonBox
      style={{
        height: 460,
        borderRadius: 16,
        marginBottom: 48,
      }}
    />
  );
}

// CSS-анимация (инжектируем один раз)
if (typeof document !== "undefined") {
  if (!document.getElementById("skeleton-style")) {
    const style = document.createElement("style");
    style.id = "skeleton-style";
    style.textContent = `
      @keyframes skeleton-shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `;
    document.head.appendChild(style);
  }
}
