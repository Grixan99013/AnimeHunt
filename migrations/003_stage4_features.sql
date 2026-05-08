-- migrations/003_stage4_features.sql
-- Этап 4: расширенный профиль, жалобы, сезонный фильтр, скрытые столбцы

-- ── Расширенный профиль пользователей ────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS bio          TEXT,
  ADD COLUMN IF NOT EXISTS banner_url   TEXT,
  ADD COLUMN IF NOT EXISTS location     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS website      TEXT,
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hide_email      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hide_watchlist  BOOLEAN NOT NULL DEFAULT FALSE;

-- ── Жалобы на комментарии и рецензии ────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id           SERIAL PRIMARY KEY,
  reporter_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- один из двух должен быть заполнен
  comment_id   INT REFERENCES comments(id) ON DELETE CASCADE,
  review_id    INT REFERENCES reviews(id)  ON DELETE CASCADE,
  reason       VARCHAR(50)  NOT NULL DEFAULT 'spam',
  details      TEXT,
  status       VARCHAR(20)  NOT NULL DEFAULT 'pending',  -- pending | reviewed | dismissed
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT   reports_target_check CHECK (
    (comment_id IS NOT NULL AND review_id IS NULL) OR
    (comment_id IS NULL     AND review_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_reports_comment  ON reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_reports_review   ON reports(review_id);
CREATE INDEX IF NOT EXISTS idx_reports_status   ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);

-- ── Закреплённые рецензии (moderator/admin) ───────────────────────
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_reviews_pinned ON reviews(is_pinned) WHERE is_pinned = TRUE;

-- ── Сезонный фильтр: season_year и season_quarter в аниме ────────
ALTER TABLE anime
  ADD COLUMN IF NOT EXISTS season_year    SMALLINT,
  ADD COLUMN IF NOT EXISTS season_quarter SMALLINT CHECK (season_quarter BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS age_rating     VARCHAR(10);

CREATE INDEX IF NOT EXISTS idx_anime_season ON anime(season_year, season_quarter);

-- Автозаполнение season_year/quarter из aired_from для существующих записей
UPDATE anime
SET
  season_year    = EXTRACT(YEAR    FROM aired_from)::SMALLINT,
  season_quarter = EXTRACT(QUARTER FROM aired_from)::SMALLINT
WHERE aired_from IS NOT NULL
  AND season_year IS NULL;
