
-- ============================================================
--  Темы: отдельная таблица anime_themes (вместо anime.themes[])
-- ============================================================
CREATE TABLE IF NOT EXISTS anime_themes (
  anime_id INTEGER NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  theme    TEXT NOT NULL,
  PRIMARY KEY (anime_id, theme)
);

INSERT INTO anime_themes (anime_id, theme) VALUES
  (1,'боевые искусства'),(1,'месть'),(2,'боевые искусства'),(2,'месть'),(3,'боевые искусства'),(3,'месть'),
  (4,'война'),(4,'политика'),(4,'месть'),
  (5,'оккультизм'),(5,'боевые искусства'),(6,'оккультизм'),(6,'боевые искусства'),
  (7,'школа'),(7,'ниндзя'),
  (8,'детектив'),(8,'психологическое'),
  (9,'приключения'),(9,'фэнтезийный мир');


DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'anime' AND column_name = 'themes'
  ) THEN
    INSERT INTO anime_themes (anime_id, theme)
    SELECT a.id, unnest(a.themes)
    FROM anime a
    WHERE a.themes IS NOT NULL AND cardinality(a.themes) > 0
    ON CONFLICT DO NOTHING;
    ALTER TABLE anime DROP COLUMN themes;
  END IF;
END $$;

-- Скриншоты / кадры
CREATE TABLE IF NOT EXISTS anime_screenshots (
  id          SERIAL PRIMARY KEY,
  anime_id    INT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,                    -- base64 или внешний URL
  status      VARCHAR(20) NOT NULL DEFAULT 'pending',
              -- 'pending' | 'approved' | 'rejected'
  reviewed_by INT REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Видео
CREATE TABLE IF NOT EXISTS anime_videos (
  id          SERIAL PRIMARY KEY,
  anime_id    INT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  video_type  VARCHAR(30) NOT NULL DEFAULT 'other',
              -- 'pv'|'trailer'|'character'|'cm'|'op'|'ed'|'mv'|'clip'|'other'|'episode_preview'
  title       VARCHAR(255),
  status      VARCHAR(20) NOT NULL DEFAULT 'pending',
  reviewed_by INT REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_screenshots_anime  ON anime_screenshots(anime_id, status);
CREATE INDEX IF NOT EXISTS idx_videos_anime       ON anime_videos(anime_id, status);

