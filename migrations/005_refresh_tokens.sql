-- migrations/005_refresh_tokens.sql
-- Таблица для хранения refresh-токенов (ротируемых)
-- Позволяет отзывать сессии и предотвращает бессрочный доступ

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         BIGSERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  revoked    BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы для быстрого поиска по токену и пользователю
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token      ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id    ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Автоматическая очистка истёкших токенов (запускать через cron или pg_cron)
-- DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked = TRUE;

COMMENT ON TABLE refresh_tokens IS 'Ротируемые refresh-токены для безопасного обновления сессий';
