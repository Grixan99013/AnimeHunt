-- ============================================================
--  AnimeHunt — PostgreSQL Schema v5
--  characters.anime_id УДАЛЕНО — аниме берётся через character_appearances
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT
);
INSERT INTO roles (name, description) VALUES
  ('admin','Полный доступ'),
  ('moderator','Модерация контента'),
  ('user','Обычный пользователь');

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url    TEXT,
  role_id       INT NOT NULL DEFAULT 3 REFERENCES roles(id),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE anim_studies (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) UNIQUE NOT NULL,
  founded_at  DATE,
  country     VARCHAR(100),
  website     TEXT,
  logo_url    TEXT,
  description TEXT
);

CREATE TABLE genres (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE anime (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  title_en     VARCHAR(255),
  title_jp     VARCHAR(255),
  synopsis     TEXT,
  poster_url   TEXT,
  banner_url   TEXT,
  status       VARCHAR(30) NOT NULL DEFAULT 'ongoing',
  type         VARCHAR(30) NOT NULL DEFAULT 'tv',
  episodes     INT,
  duration_min INT,
  aired_from   DATE,
  aired_to     DATE,
  studio_id    INT REFERENCES anim_studies(id) ON DELETE SET NULL,
  is_new       BOOLEAN NOT NULL DEFAULT FALSE,
  season_num   SMALLINT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE anime_series (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  description TEXT
);

CREATE TABLE anime_series_entries (
  series_id  INT NOT NULL REFERENCES anime_series(id) ON DELETE CASCADE,
  anime_id   INT NOT NULL REFERENCES anime(id)        ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (series_id, anime_id)
);

CREATE TABLE anime_genres (
  anime_id INT NOT NULL REFERENCES anime(id)  ON DELETE CASCADE,
  genre_id INT NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (anime_id, genre_id)
);

CREATE TABLE anime_themes (
  anime_id INT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  theme    TEXT NOT NULL,
  PRIMARY KEY (anime_id, theme)
);

-- ── ПЕРСОНАЖИ (без anime_id) ──────────────────────────────────
CREATE TABLE characters (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  name_jp     VARCHAR(255),
  role        VARCHAR(30)  NOT NULL DEFAULT 'supporting',
  description TEXT,
  image_url   TEXT,
  age         VARCHAR(20),
  gender      VARCHAR(20),
  abilities   TEXT
);

-- M2M: персонаж ↔ аниме
CREATE TABLE character_appearances (
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  anime_id     INT NOT NULL REFERENCES anime(id)      ON DELETE CASCADE,
  role_in_anime VARCHAR(30) DEFAULT 'main',   -- роль в конкретном аниме
  PRIMARY KEY (character_id, anime_id)
);

CREATE TABLE staff (
  id        SERIAL PRIMARY KEY,
  name      VARCHAR(255) NOT NULL,
  name_jp   VARCHAR(255),
  role      VARCHAR(100),
  bio       TEXT,
  image_url TEXT,
  born_at   DATE
);

CREATE TABLE anime_staff (
  anime_id INT NOT NULL REFERENCES anime(id)  ON DELETE CASCADE,
  staff_id INT NOT NULL REFERENCES staff(id)  ON DELETE CASCADE,
  role     VARCHAR(100),
  PRIMARY KEY (anime_id, staff_id, role)
);

CREATE TABLE seiyu (
  id        SERIAL PRIMARY KEY,
  name      VARCHAR(255) NOT NULL,
  name_jp   VARCHAR(255),
  bio       TEXT,
  image_url TEXT,
  born_at   DATE,
  agency    VARCHAR(255)
);

CREATE TABLE character_seiyu (
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  seiyu_id     INT NOT NULL REFERENCES seiyu(id)      ON DELETE CASCADE,
  language     VARCHAR(50) NOT NULL DEFAULT 'ja',
  PRIMARY KEY (character_id, seiyu_id, language)
);

CREATE TABLE comments (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  anime_id   INT NOT NULL REFERENCES anime(id)    ON DELETE CASCADE,
  parent_id  INT          REFERENCES comments(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reviews (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  anime_id   INT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  score      SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 10),
  title      VARCHAR(255) NOT NULL,
  body       TEXT NOT NULL CHECK (length(body) >= 100),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  helpful    INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, anime_id)
);

CREATE TABLE review_likes (
  user_id   INT NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  review_id INT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, review_id)
);

CREATE TABLE user_ratings (
  user_id  INT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  anime_id INT      NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  score    SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 10),
  rated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, anime_id)
);

CREATE TABLE watchlist (
  user_id          INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  anime_id         INT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  status           VARCHAR(30) NOT NULL DEFAULT 'planned',
  episodes_watched INT NOT NULL DEFAULT 0,
  added_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, anime_id)
);

CREATE TABLE favorites (
  user_id      INT NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  added_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, character_id)
);

CREATE TABLE character_comments (
  id           SERIAL PRIMARY KEY,
  user_id      INT NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  parent_id    INT          REFERENCES character_comments(id) ON DELETE CASCADE,
  body         TEXT NOT NULL,
  is_deleted   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Шипперинг
CREATE TABLE shippings (
  user_id      INT NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  character_id INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  shipped_with INT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, character_id)
);

-- ── ИНДЕКСЫ ──────────────────────────────────────────────────
CREATE INDEX idx_char_appearances_char  ON character_appearances(character_id);
CREATE INDEX idx_char_appearances_anime ON character_appearances(anime_id);
CREATE INDEX idx_shippings_character    ON shippings(character_id);
CREATE INDEX idx_comments_anime         ON comments(anime_id);
CREATE INDEX idx_reviews_anime          ON reviews(anime_id);
CREATE INDEX idx_char_comments_char     ON character_comments(character_id);
CREATE INDEX idx_anime_series_entries_series ON anime_series_entries(series_id);
CREATE INDEX idx_anime_series_entries_anime  ON anime_series_entries(anime_id);

-- ── ТРИГГЕРЫ ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_users_upd     BEFORE UPDATE ON users     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_anime_upd     BEFORE UPDATE ON anime     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_comments_upd  BEFORE UPDATE ON comments  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_watchlist_upd BEFORE UPDATE ON watchlist FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_reviews_upd   BEFORE UPDATE ON reviews   FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ══════════════════════════════════════════════════════════════
-- ТЕСТОВЫЕ ДАННЫЕ
-- ══════════════════════════════════════════════════════════════

INSERT INTO anim_studies (name,country,founded_at) VALUES
  ('MAPPA','Япония','2011-06-14'),
  ('Studio Pierrot','Япония','1979-05-10'),
  ('Madhouse','Япония','1972-01-01'),
  ('Bones','Япония','1998-10-01'),
  ('Toei Animation','Япония','1948-01-23'),
  ('Wit Studio','Япония','2012-06-01');

INSERT INTO genres (name) VALUES
  ('Экшн'),('Приключения'),('Фэнтези'),('Sci-Fi'),
  ('Драма'),('Комедия'),('Романтика'),('Ужасы'),
  ('Детектив'),('Психологическое'),('Мистика'),('Сёнэн');

-- Аниме (id 1-4: Атака Титанов сезоны, 5-6: МБ, 7-12: одиночные)
INSERT INTO anime (title,title_en,title_jp,synopsis,status,type,episodes,duration_min,aired_from,aired_to,studio_id,poster_url,is_new,season_num) VALUES
  ('Атака Титанов','Attack on Titan','進撃の巨人',
   'Человечество укрылось за огромными стенами, спасаясь от гигантских существ — титанов. Когда стены рухнули, Эрен Йегер поклялся уничтожить всех титанов.',
   'completed','tv',25,24,'2013-04-07','2013-09-28',6,'https://cdn.myanimelist.net/images/anime/10/47347.jpg',FALSE,1),
  ('Атака Титанов 2','Attack on Titan Season 2','進撃の巨人 Season 2',
   'Разведывательный корпус узнаёт тайну происхождения титанов внутри стен.',
   'completed','tv',12,24,'2017-04-01','2017-06-17',6,'https://cdn.myanimelist.net/images/anime/4/84177.jpg',FALSE,2),
  ('Атака Титанов 3','Attack on Titan Season 3','進撃の巨人 Season 3',
   'Политические интриги внутри стен и раскрытие тайны подвала Эрена.',
   'completed','tv',22,24,'2018-07-23','2019-07-01',6,'https://cdn.myanimelist.net/images/anime/1714/93408.jpg',FALSE,3),
  ('Атака Титанов: Финальный сезон','Attack on Titan: Final Season','進撃の巨人 The Final Season',
   'Эрен запускает Грохот. Последняя война за будущее человечества.',
   'completed','tv',28,24,'2020-12-07','2023-11-05',1,'https://cdn.myanimelist.net/images/anime/1000/110531.jpg',FALSE,4),
  ('Магическая битва','Jujutsu Kaisen','呪術廻戦',
   'Юджи Итадори поглощает палец Рёмэна Сукуны и становится сосудом проклятого духа.',
   'completed','tv',24,23,'2020-10-03','2021-03-27',1,'https://cdn.myanimelist.net/images/anime/1171/109222.jpg',FALSE,1),
  ('Магическая битва 2','Jujutsu Kaisen Season 2','呪術廻戦 2期',
   'Арка Инцидента в Сибуе. Самая разрушительная битва заклинателей в истории.',
   'completed','tv',23,23,'2023-07-06','2023-12-28',1,'https://cdn.myanimelist.net/images/anime/1792/138022.jpg',TRUE,2),
  ('Наруто','Naruto','ナルト',
   'Наруто Узумаки — молодой ниндзя, в котором запечатан демонический лис.',
   'completed','tv',220,23,'2002-10-03','2007-02-08',2,'https://cdn.myanimelist.net/images/anime/13/17405.jpg',FALSE,NULL),
  ('Тетрадь смерти','Death Note','デスノート',
   'Школьник Лайт Ягами находит сверхъестественную тетрадь. Кто напишет имя — умрёт.',
   'completed','tv',37,23,'2006-10-04','2007-06-27',3,'https://cdn.myanimelist.net/images/anime/9/9453.jpg',FALSE,NULL),
  ('Фриерен: За гранью путешествия','Frieren: Beyond Journey''s End','葬送のフリーレン',
   'Эльфийская волшебница осознаёт, как мало внимания уделяла людям рядом с ней.',
   'completed','tv',28,24,'2023-09-29','2024-03-22',4,'https://cdn.myanimelist.net/images/anime/1015/138006.jpg',TRUE,NULL),
  ('Дандадан','Dandadan','ダンダダン',
   'Девушка, верящая в призраков, и парень, верящий в пришельцев, сталкиваются с обоими.',
   'ongoing','tv',12,23,'2024-10-04',NULL,1,'https://cdn.myanimelist.net/images/anime/1890/141166.jpg',TRUE,NULL),
  ('Поднятие уровня в одиночку','Solo Leveling','俺だけレベルアップな件',
   'Слабейший охотник Сон Чжин-У получает таинственную силу.',
   'ongoing','tv',13,24,'2024-01-07',NULL,4,'https://cdn.myanimelist.net/images/anime/1823/135083.jpg',TRUE,NULL),
  ('Клинок, рассекающий демонов: Замок Бесконечности','Demon Slayer: Infinity Castle','鬼滅の刃 無限城編',
   'Танджиро и Хасиры в финальной битве сходятся с Мудзаном.',
   'upcoming','movie',NULL,NULL,'2025-06-20',NULL,4,'https://cdn.myanimelist.net/images/anime/1286/99889.jpg',TRUE,NULL);

INSERT INTO anime_genres VALUES
  (1,1),(1,2),(1,5),(1,12),(2,1),(2,2),(2,5),(2,12),
  (3,1),(3,2),(3,5),(3,12),(4,1),(4,2),(4,5),(4,12),
  (5,1),(5,2),(5,11),(5,12),(6,1),(6,2),(6,11),(6,12),
  (7,1),(7,2),(7,12),(8,5),(8,9),(8,10),(8,11),
  (9,2),(9,3),(9,5),(10,1),(10,6),(10,11),
  (11,1),(11,2),(11,3),(11,4),(12,1),(12,2),(12,5),(12,11),(12,12);

INSERT INTO anime_themes (anime_id, theme) VALUES
  (1,'боевые искусства'),(1,'месть'),(2,'боевые искусства'),(2,'месть'),(3,'боевые искусства'),(3,'месть'),
  (4,'война'),(4,'политика'),(4,'месть'),
  (5,'оккультизм'),(5,'боевые искусства'),(6,'оккультизм'),(6,'боевые искусства'),
  (7,'школа'),(7,'ниндзя'),
  (8,'детектив'),(8,'психологическое'),
  (9,'приключения'),(9,'фэнтезийный мир');

INSERT INTO anime_series (title,description) VALUES
  ('Атака Титанов','Полная сага о борьбе человечества с титанами. 4 сезона от Wit Studio и MAPPA.'),
  ('Магическая битва','История Юджи Итадори и мира заклинателей.');
INSERT INTO anime_series_entries (series_id,anime_id,sort_order) VALUES
  (1,1,1),(1,2,2),(1,3,3),(1,4,4),(2,5,1),(2,6,2);

-- Персонажи БЕЗ anime_id
INSERT INTO characters (name,name_jp,role,description,image_url,age,gender,abilities) VALUES
  ('Эрен Йегер','エレン・イェーガー','main',
   'Главный герой. Одержим желанием обрести свободу. Его путь от солдата до разрушителя мира — центр всей саги.',
   'https://cdn.myanimelist.net/images/characters/10/216895.jpg','19','М',
   'Атакующий Титан, Основополагающий Титан, Координата'),                -- id=1

  ('Микаса Аккерман','ミカサ・アッカーマン','main',
   'Лучший солдат своего поколения. Приёмная сестра Эрена с уникальными боевыми способностями клана Аккерман.',
   'https://cdn.myanimelist.net/images/characters/9/215563.jpg','19','Ж',
   'Способности клана Аккерман'),                                          -- id=2

  ('Армин Арлерт','アルミン・アルレルト','main',
   'Гениальный тактик. Лучший друг Эрена, чей интеллект не раз спасал человечество.',
   '','19','М','Колоссальный Титан, стратегическое мышление'),             -- id=3

  ('Лайт Ягами','夜神月','main',
   'Блестящий студент, нашедший Тетрадь смерти. Стал богом нового мира.',
   'https://cdn.myanimelist.net/images/characters/3/253266.jpg','17','М',
   'Тетрадь смерти, высокий интеллект'),                                  -- id=4

  ('Л','エル','main','Величайший детектив мира.',
   'https://cdn.myanimelist.net/images/characters/5/45867.jpg','25','М',
   'Дедуктивное мышление'),                                               -- id=5

  ('Мисса','ミサ・アマネ','supporting',
   'Вторая владелица Тетради смерти. Поклонница Киры.',
   '','19','Ж','Тетрадь смерти, Глаза смерти'),                          -- id=6

  ('Юджи Итадори','虎杏悠仁','main',
   'Добродушный юноша со сверхсилой, ставший сосудом Сукуны.',
   '','15','М','Сверхсила, Чёрная вспышка'),                             -- id=7

  ('Нобара Кугисаки','釘崎野薔薇','main',
   'Заклинательница из деревни. Использует молоток и гвозди.',
   '','16','Ж','Техника молотка и гвоздей'),                             -- id=8

  ('Фриерен','フリーレン','main',
   'Эльфийская волшебница, пережившая своих спутников. Путешествует, чтобы понять людей.',
   '','1000+','Ж','Высший уровень магии'),                               -- id=9

  ('Ферн','フェルン','main',
   'Ученица Химмеля. Талантливая молодая волшебница.',
   '','18','Ж','Магия, скорость заклинаний');                            -- id=10

-- Привязки персонаж ↔ аниме через character_appearances
INSERT INTO character_appearances (character_id, anime_id, role_in_anime) VALUES
  -- Эрен во всех 4 сезонах АТ
  (1,1,'main'),(1,2,'main'),(1,3,'main'),(1,4,'main'),
  -- Микаса
  (2,1,'main'),(2,2,'main'),(2,3,'main'),(2,4,'main'),
  -- Армин
  (3,1,'main'),(3,2,'main'),(3,3,'main'),(3,4,'main'),
  -- Лайт — Тетрадь смерти
  (4,8,'main'),
  -- Л — Тетрадь смерти
  (5,8,'main'),
  -- Мисса — Тетрадь смерти
  (6,8,'supporting'),
  -- Юджи — МБ 1 и 2
  (7,5,'main'),(7,6,'main'),
  -- Нобара — МБ 1 и 2
  (8,5,'main'),(8,6,'supporting'),
  -- Фриерен
  (9,9,'main'),
  -- Ферн
  (10,9,'main');

INSERT INTO staff (name,name_jp,role,bio) VALUES
  ('Хадзимэ Исаяма','諫山創','Мангака','Автор манги «Атака Титанов».'),
  ('Тэцуро Араки','荒木哲郎','Режиссёр','Режиссёр 1 сезона Атаки Титанов и Тетради смерти.'),
  ('Масаси Кисимото','岸本斉史','Мангака','Автор манги «Наруто».'),
  ('Цугуми Оба','大場つぐみ','Сценарий','Автор манги «Тетрадь смерти».'),
  ('Сёта Госёдзоно','五十嵐卓哉','Режиссёр','Режиссёр 2 сезона Магической битвы.');
INSERT INTO anime_staff (anime_id,staff_id,role) VALUES
  (1,1,'Оригинал'),(1,2,'Режиссёр'),
  (7,3,'Оригинал'),
  (8,2,'Режиссёр'),(8,4,'Оригинал'),
  (6,5,'Режиссёр');
