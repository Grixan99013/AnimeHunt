-- migrations/004_notifications_collections.sql

-- ── Уведомления ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- кому
  actor_id    INT REFERENCES users(id) ON DELETE SET NULL,           -- кто сделал действие
  type        VARCHAR(40) NOT NULL,  -- comment_reply | review_like | mention | new_review
  -- payload (одно из)
  anime_id    INT REFERENCES anime(id) ON DELETE CASCADE,
  comment_id  INT REFERENCES comments(id) ON DELETE CASCADE,
  review_id   INT REFERENCES reviews(id) ON DELETE CASCADE,
  character_id INT REFERENCES characters(id) ON DELETE CASCADE,
  -- состояние
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;

-- ── Коллекции (подборки) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS collections (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  is_public   BOOLEAN NOT NULL DEFAULT TRUE,
  cover_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collection_items (
  collection_id INT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  anime_id      INT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  sort_order    INT NOT NULL DEFAULT 0,
  note          TEXT,          -- заметка пользователя к этому аниме
  added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection_id, anime_id)
);

CREATE INDEX IF NOT EXISTS idx_collections_user   ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_public ON collections(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_collection_items   ON collection_items(collection_id, sort_order);
