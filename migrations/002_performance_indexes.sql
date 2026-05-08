-- migrations/002_performance_indexes.sql
-- Индексы для оптимизации производительности
-- Применять: psql -d <dbname> -f migrations/002_performance_indexes.sql

-- ── Аниме ────────────────────────────────────────────────────────
-- Фильтры каталога (status, type)
CREATE INDEX IF NOT EXISTS idx_anime_status ON anime(status);
CREATE INDEX IF NOT EXISTS idx_anime_type   ON anime(type);
CREATE INDEX IF NOT EXISTS idx_anime_is_new ON anime(is_new) WHERE is_new = TRUE;
CREATE INDEX IF NOT EXISTS idx_anime_aired_from ON anime(aired_from DESC NULLS LAST);

-- Поиск по названию (ILIKE через trigram — требует pg_trgm)
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS idx_anime_title_trgm    ON anime USING gin(title gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS idx_anime_title_en_trgm ON anime USING gin(title_en gin_trgm_ops);

-- ── Оценки ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_ratings_anime   ON user_ratings(anime_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_user    ON user_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_score   ON user_ratings(score);
-- Составной — для ON CONFLICT (user_id, anime_id)
-- Уже покрывается UNIQUE CONSTRAINT, но явный индекс ускоряет SELECT
CREATE INDEX IF NOT EXISTS idx_user_ratings_user_anime ON user_ratings(user_id, anime_id);

-- ── Список просмотра ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_watchlist_user   ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_anime  ON watchlist(anime_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_status ON watchlist(status);
CREATE INDEX IF NOT EXISTS idx_watchlist_updated ON watchlist(updated_at DESC);

-- ── Жанры ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_anime_genres_anime ON anime_genres(anime_id);
CREATE INDEX IF NOT EXISTS idx_anime_genres_genre ON anime_genres(genre_id);

-- ── Темы ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_anime_themes_anime ON anime_themes(anime_id);
CREATE INDEX IF NOT EXISTS idx_anime_themes_theme ON anime_themes(theme);

-- ── Персонажи ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_character_appearances_char  ON character_appearances(character_id);
CREATE INDEX IF NOT EXISTS idx_character_appearances_anime ON character_appearances(anime_id);
CREATE INDEX IF NOT EXISTS idx_character_appearances_role  ON character_appearances(role_in_anime);

-- ── Комментарии ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_comments_anime    ON comments(anime_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_comments_char     ON comments(character_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_comments_user     ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent   ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created  ON comments(created_at DESC);

-- ── Рецензии ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reviews_anime   ON reviews(anime_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_reviews_user    ON reviews(user_id)  WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_reviews_helpful ON reviews(helpful DESC);

-- ── Избранное ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_char ON favorites(character_id);

-- ── Медиа ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_media_anime  ON media(anime_id);
CREATE INDEX IF NOT EXISTS idx_media_status ON media(status);

-- ── Пользователи ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role     ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_active   ON users(is_active);

-- ── Серии ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_anime_series_entries_series ON anime_series_entries(series_id);
CREATE INDEX IF NOT EXISTS idx_anime_series_entries_anime  ON anime_series_entries(anime_id);

-- ── Шипперинг ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ships_chars ON ships(character1_id, character2_id);

ANALYZE;
