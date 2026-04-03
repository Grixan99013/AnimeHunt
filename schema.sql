-- ============================================================
--  Anime Encyclopedia – PostgreSQL Schema
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ROLES
-- ============================================================
CREATE TABLE roles (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50) UNIQUE NOT NULL,  -- 'admin', 'moderator', 'user'
  description TEXT
);

INSERT INTO roles (name, description) VALUES
  ('admin',     'Full access'),
  ('moderator', 'Content moderation'),
  ('user',      'Regular registered user');

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id           SERIAL PRIMARY KEY,
  username     VARCHAR(50)  UNIQUE NOT NULL,
  email        VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,                 -- bcrypt/pgcrypto hash
  avatar_url   TEXT,
  role_id      INT  NOT NULL DEFAULT 3 REFERENCES roles(id),
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ANIMATION STUDIOS
-- ============================================================
CREATE TABLE anim_studies (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) UNIQUE NOT NULL,
  founded_at  DATE,
  country     VARCHAR(100),
  website     TEXT,
  logo_url    TEXT,
  description TEXT
);

-- ============================================================
-- ANIME
-- ============================================================
CREATE TABLE anime (
  id            SERIAL PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  title_en      VARCHAR(255),
  title_jp      VARCHAR(255),
  synopsis      TEXT,
  poster_url    TEXT,
  banner_url    TEXT,
  status        VARCHAR(30) NOT NULL DEFAULT 'ongoing',
                -- 'ongoing', 'completed', 'upcoming', 'cancelled'
  type          VARCHAR(30) NOT NULL DEFAULT 'tv',
                -- 'tv', 'movie', 'ova', 'ona', 'special'
  episodes      INT,
  duration_min  INT,                           -- episode duration in minutes
  aired_from    DATE,
  aired_to      DATE,
  rating        NUMERIC(3,2) CHECK (rating >= 0 AND rating <= 10),
  studio_id     INT REFERENCES anim_studies(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Genres stored as tags (simple M2M)
CREATE TABLE genres (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE anime_genres (
  anime_id INT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  genre_id INT NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (anime_id, genre_id)
);

-- ============================================================
-- SEASONS
-- ============================================================
CREATE TABLE seasons (
  id           SERIAL PRIMARY KEY,
  anime_id     INT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  season_num   INT NOT NULL,
  title        VARCHAR(255),
  episodes     INT,
  aired_from   DATE,
  aired_to     DATE,
  poster_url   TEXT,
  UNIQUE (anime_id, season_num)
);

-- ============================================================
-- CHARACTERS
-- ============================================================
CREATE TABLE characters (
  id          SERIAL PRIMARY KEY,
  anime_id    INT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  name_jp     VARCHAR(255),
  role        VARCHAR(30) NOT NULL DEFAULT 'supporting',
              -- 'main', 'supporting', 'extra'
  description TEXT,
  image_url   TEXT
);

-- ============================================================
-- STAFF  (directors, writers, composers …)
-- ============================================================
CREATE TABLE staff (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  name_jp     VARCHAR(255),
  role        VARCHAR(100),              -- 'Director', 'Script', 'Music', …
  bio         TEXT,
  image_url   TEXT,
  born_at     DATE
);

CREATE TABLE anime_staff (
  anime_id  INT NOT NULL REFERENCES anime(id)  ON DELETE CASCADE,
  staff_id  INT NOT NULL REFERENCES staff(id)  ON DELETE CASCADE,
  role      VARCHAR(100),
  PRIMARY KEY (anime_id, staff_id, role)
);

-- ============================================================
-- SEIYU  (voice actors)
-- ============================================================
CREATE TABLE seiyu (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  name_jp     VARCHAR(255),
  bio         TEXT,
  image_url   TEXT,
  born_at     DATE,
  agency      VARCHAR(255)
);

CREATE TABLE character_seiyu (
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  seiyu_id     INT NOT NULL REFERENCES seiyu(id)      ON DELETE CASCADE,
  language     VARCHAR(50) NOT NULL DEFAULT 'ja',      -- 'ja', 'en', 'ru', …
  PRIMARY KEY (character_id, seiyu_id, language)
);

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE TABLE comments (
  id          SERIAL PRIMARY KEY,
  user_id     INT  NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  anime_id    INT  NOT NULL REFERENCES anime(id)  ON DELETE CASCADE,
  parent_id   INT  REFERENCES comments(id)        ON DELETE CASCADE,  -- nested replies
  body        TEXT NOT NULL,
  is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User ratings (1-10)
CREATE TABLE user_ratings (
  user_id   INT NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  anime_id  INT NOT NULL REFERENCES anime(id)  ON DELETE CASCADE,
  score     SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 10),
  rated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, anime_id)
);

-- Watchlist / favourites
CREATE TABLE watchlist (
  user_id   INT NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  anime_id  INT NOT NULL REFERENCES anime(id)  ON DELETE CASCADE,
  status    VARCHAR(30) NOT NULL DEFAULT 'plan_to_watch',
            -- 'watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch'
  added_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, anime_id)
);

-- ============================================================
-- HELPER: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at   BEFORE UPDATE ON users   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_anime_updated_at   BEFORE UPDATE ON anime   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_comment_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SAMPLE DATA
-- ============================================================
INSERT INTO anim_studies (name, country, founded_at) VALUES
  ('MAPPA',         'Japan', '2011-06-14'),
  ('Studio Pierrot','Japan', '1979-05-10'),
  ('Madhouse',      'Japan', '1972-01-01');

INSERT INTO genres (name) VALUES
  ('Action'),('Adventure'),('Fantasy'),('Sci-Fi'),
  ('Drama'),('Comedy'),('Romance'),('Horror'),
  ('Mystery'),('Psychological'),('Supernatural'),('Shonen');

INSERT INTO anime (title, title_en, synopsis, status, type, episodes, aired_from, rating, studio_id, poster_url) VALUES
  ('進撃の巨人', 'Attack on Titan',
   'Humanity fights for survival against giant humanoid Titans.',
   'completed','tv', 87, '2013-04-07', 9.0, 1,
   'https://upload.wikimedia.org/wikipedia/en/d/d6/Shingeki_no_Kyojin_manga_volume_1.jpg'),

  ('NARUTO', 'Naruto',
   'A young ninja seeks recognition and dreams of becoming the Hokage.',
   'completed','tv', 220, '2002-10-03', 8.3, 2,
   'https://upload.wikimedia.org/wikipedia/en/9/94/NarutoCoverTankobon1.jpg'),

  ('デスノート', 'Death Note',
   'A high school student discovers a supernatural notebook.',
   'completed','tv', 37, '2006-10-04', 9.0, 3,
   'https://upload.wikimedia.org/wikipedia/en/2/20/Death_Note%2C_volume_1.jpg');
