-- ============================================================
--  PATCH: настройки приватности пользователя
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS hide_email    BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS hide_watchlist BOOLEAN NOT NULL DEFAULT FALSE;

-- avatar_url уже есть в схеме
-- Убеждаемся что поле есть (на случай если нет)
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
