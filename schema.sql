-- ============================================================
--  AnimeHunt — PostgreSQL Schema (полная версия)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── РОЛИ ─────────────────────────────────────────────────────
CREATE TABLE roles (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50) UNIQUE NOT NULL,
  description TEXT
);
INSERT INTO roles (name, description) VALUES
  ('admin',     'Полный доступ'),
  ('moderator', 'Модерация контента'),
  ('user',      'Обычный пользователь');

-- ── ПОЛЬЗОВАТЕЛИ ─────────────────────────────────────────────
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url    TEXT,
  role_id       INT  NOT NULL DEFAULT 3 REFERENCES roles(id),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── СТУДИИ ───────────────────────────────────────────────────
CREATE TABLE anim_studies (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) UNIQUE NOT NULL,
  founded_at  DATE,
  country     VARCHAR(100),
  website     TEXT,
  logo_url    TEXT,
  description TEXT
);

-- ── ЖАНРЫ ────────────────────────────────────────────────────
CREATE TABLE genres (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);

-- ── АНИМЕ ────────────────────────────────────────────────────
CREATE TABLE anime (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,        -- название на русском
  title_en     VARCHAR(255),                 -- на английском
  title_jp     VARCHAR(255),                 -- оригинал
  synopsis     TEXT,
  poster_url   TEXT,
  banner_url   TEXT,
  status       VARCHAR(30) NOT NULL DEFAULT 'ongoing',
               -- 'ongoing' | 'completed' | 'upcoming' | 'cancelled'
  type         VARCHAR(30) NOT NULL DEFAULT 'tv',
               -- 'tv' | 'movie' | 'ova' | 'ona' | 'special'
  episodes     INT,
  duration_min INT,
  aired_from   DATE,
  aired_to     DATE,
  studio_id    INT REFERENCES anim_studies(id) ON DELETE SET NULL,
  is_new       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- M2M: аниме ↔ жанры
CREATE TABLE anime_genres (
  anime_id INT NOT NULL REFERENCES anime(id)  ON DELETE CASCADE,
  genre_id INT NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (anime_id, genre_id)
);

-- ── СЕЗОНЫ ───────────────────────────────────────────────────
CREATE TABLE seasons (
  id         SERIAL PRIMARY KEY,
  anime_id   INT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  season_num INT NOT NULL,
  title      VARCHAR(255),
  episodes   INT,
  aired_from DATE,
  aired_to   DATE,
  poster_url TEXT,
  UNIQUE (anime_id, season_num)
);

-- ── ПЕРСОНАЖИ ────────────────────────────────────────────────
CREATE TABLE characters (
  id          SERIAL PRIMARY KEY,
  anime_id    INT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  name_jp     VARCHAR(255),
  role        VARCHAR(30) NOT NULL DEFAULT 'supporting',
              -- 'main' | 'supporting' | 'extra'
  description TEXT,
  image_url   TEXT
);

-- ── АВТОРЫ / СТАФФ ───────────────────────────────────────────
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

-- ── СЭЙЮ ─────────────────────────────────────────────────────
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

-- ── КОММЕНТАРИИ ──────────────────────────────────────────────
CREATE TABLE comments (
  id         SERIAL PRIMARY KEY,
  user_id    INT  NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  anime_id   INT  NOT NULL REFERENCES anime(id)    ON DELETE CASCADE,
  parent_id  INT           REFERENCES comments(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ОЦЕНКИ ПОЛЬЗОВАТЕЛЕЙ ─────────────────────────────────────
CREATE TABLE user_ratings (
  user_id  INT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  anime_id INT      NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  score    SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 10),
  rated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, anime_id)
);

-- ── СПИСОК ПРОСМОТРА ─────────────────────────────────────────
CREATE TABLE watchlist (
  user_id           INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  anime_id          INT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
  status            VARCHAR(30) NOT NULL DEFAULT 'planned',
                    -- 'watching' | 'completed' | 'planned'
  episodes_watched  INT NOT NULL DEFAULT 0,
  added_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, anime_id)
);

-- ── ТРИГГЕРЫ updated_at ───────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_users_upd    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_anime_upd    BEFORE UPDATE ON anime    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_comments_upd BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_watchlist_upd BEFORE UPDATE ON watchlist FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── ТЕСТОВЫЕ ДАННЫЕ ──────────────────────────────────────────
INSERT INTO anim_studies (name, country, founded_at) VALUES
  ('MAPPA',          'Япония', '2011-06-14'),
  ('Studio Pierrot', 'Япония', '1979-05-10'),
  ('Madhouse',       'Япония', '1972-01-01'),
  ('Bones',          'Япония', '1998-10-01'),
  ('Toei Animation', 'Япония', '1948-01-23');

INSERT INTO genres (name) VALUES
  ('Экшн'),('Приключения'),('Фэнтези'),('Sci-Fi'),
  ('Драма'),('Комедия'),('Романтика'),('Ужасы'),
  ('Детектив'),('Психологическое'),('Мистика'),('Сёнэн');

INSERT INTO anime (title, title_en, title_jp, synopsis, status, type, episodes, duration_min, aired_from, aired_to, studio_id, poster_url, is_new) VALUES
  ('Атака Титанов', 'Attack on Titan', '進撃の巨人',
   'Человечество укрылось за огромными стенами, спасаясь от гигантских существ — титанов.',
   'completed','tv',87,24,'2013-04-07','2023-11-05',1,
   'https://cdn.myanimelist.net/images/anime/10/47347.jpg', FALSE),

  ('Наруто', 'Naruto', 'ナルト',
   'Наруто Узумаки — молодой ниндзя, в котором запечатан демонический лис.',
   'completed','tv',220,23,'2002-10-03','2007-02-08',2,
   'https://cdn.myanimelist.net/images/anime/13/17405.jpg', FALSE),

  ('Тетрадь смерти', 'Death Note', 'デスノート',
   'Школьник Лайт Ягами находит сверхъестественную тетрадь, убивающую любого, чьё имя в ней написано.',
   'completed','tv',37,23,'2006-10-04','2007-06-27',3,
   'https://cdn.myanimelist.net/images/anime/9/9453.jpg', FALSE),

  ('Магическая битва 2', 'Jujutsu Kaisen Season 2', '呪術廻戦 2期',
   'Разворачивается арка Инцидента в Сибуе: заклинатели сталкиваются с проклятыми духами.',
   'completed','tv',23,23,'2023-07-06','2023-12-28',1,
   'https://cdn.myanimelist.net/images/anime/1792/138022.jpg', TRUE),

  ('Фриерен: За гранью путешествия', 'Frieren: Beyond Journey''s End', '葬送のフリーレン',
   'Эльфийская волшебница осознаёт, как мало внимания уделяла людям рядом с ней.',
   'completed','tv',28,24,'2023-09-29','2024-03-22',4,
   'https://cdn.myanimelist.net/images/anime/1015/138006.jpg', TRUE),

  ('Дандадан', 'Dandadan', 'ダンダダン',
   'Девушка, верящая в призраков, и парень, верящий в пришельцев, сталкиваются с обоими.',
   'ongoing','tv',12,23,'2024-10-04',NULL,1,
   'https://cdn.myanimelist.net/images/anime/1890/141166.jpg', TRUE),

  ('Поднятие уровня в одиночку', 'Solo Leveling', '俺だけレベルアップな件',
   'Слабейший охотник Сон Чжин-У получает таинственную силу и начинает прокачиваться уникальным образом.',
   'ongoing','tv',13,24,'2024-01-07',NULL,4,
   'https://cdn.myanimelist.net/images/anime/1823/135083.jpg', TRUE),

  ('Клинок, рассекающий демонов: Замок Бесконечности', 'Demon Slayer: Infinity Castle', '鬼滅の刃 無限城編',
   'Танджиро и Хасиры в финальной битве сходятся с Мудзаном Кибуцудзи.',
   'upcoming','movie',NULL,NULL,'2025-06-20',NULL,4,
   'https://cdn.myanimelist.net/images/anime/1286/99889.jpg', TRUE),
('Ванпанчмен', 'One Punch Man', 'ワンパンマン', 'Сайтама — герой, способный победить любого противника одним ударом. Он страдает от скуки и ищет достойного соперника.', 'completed', 'tv', 12, 24, '2015-10-05', '2015-12-21', 3, 'https://cdn.myanimelist.net/images/anime/12/78639.jpg', FALSE),
('Токийский гуль', 'Tokyo Ghoul', '東京喰種', 'Студент Кэн Канэки становится полугулем после встречи с девушкой-гулем и теперь вынужден выживать в мире, где люди охотятся на его новый вид.', 'completed', 'tv', 12, 24, '2014-07-04', '2014-09-19', 5, 'https://cdn.myanimelist.net/images/anime/5/64449.jpg', FALSE),
('Врата Штейна', 'Steins;Gate', 'シュタインズ・ゲート', 'Самопровозглашенный безумный ученый Ринтаро Окабэ случайно изобретает устройство для отправки сообщений в прошлое.', 'completed', 'tv', 24, 24, '2011-04-06', '2011-09-14', 3, 'https://cdn.myanimelist.net/images/anime/5/73199.jpg', FALSE),
('Ковбой Бибоп', 'Cowboy Bebop', 'カウボーイビバップ', 'Команда охотников за головами на корабле «Бибоп» путешествует по Солнечной системе в поисках преступников.', 'completed', 'tv', 26, 25, '1998-04-03', '1999-04-24', 5, 'https://cdn.myanimelist.net/images/anime/4/19644.jpg', FALSE),
('Евангелион', 'Neon Genesis Evangelion', '新世紀エヴァンゲリオン', 'Подростки управляют гигантскими биороботами Евангелионами, чтобы защитить Токио-3 от таинственных ангелов.', 'completed', 'tv', 26, 24, '1995-10-04', '1996-03-27', 5, 'https://cdn.myanimelist.net/images/anime/7/35409.jpg', FALSE),
('Стальной алхимик: Братство', 'Fullmetal Alchemist: Brotherhood', '鋼の錬金術師 FULLMETAL ALCHEMIST', 'Братья Элрики используют запретную алхимию, чтобы воскресить мать, но платят высокую цену.', 'completed', 'tv', 64, 24, '2009-04-05', '2010-07-04', 4, 'https://cdn.myanimelist.net/images/anime/5/47421.jpg', FALSE),
('Блич', 'Bleach', 'ブリーチ', 'Подросток Ичиго Куросаки получает силы Бога Смерти и должен защищать людей от злых духов.', 'completed', 'tv', 366, 24, '2004-10-05', '2012-03-27', 2, 'https://cdn.myanimelist.net/images/anime/3/40451.jpg', FALSE),
('Ван Пис', 'One Piece', 'ワンピース', 'Монки Д. Луффи мечтает стать Королём пиратов и отправляется в путешествие по Гранд Лайн.', 'ongoing', 'tv', 1100, 23, '1999-10-20', NULL, 5, 'https://cdn.myanimelist.net/images/anime/6/73245.jpg', FALSE),
('Моб Психо 100', 'Mob Psycho 100', 'モブサイコ100', 'Экстрасенс-подросток Сигэо Кагэяма пытается жить нормальной жизнью, подавляя свои эмоции.', 'completed', 'tv', 12, 24, '2016-07-11', '2016-09-27', 4, 'https://cdn.myanimelist.net/images/anime/8/82423.jpg', FALSE),
('Реинкарнация безработного', 'Mushoku Tensei: Jobless Reincarnation', '無職転生 ～異世界行ったら本気だす～', '34-летний безработный отаку умирает и перерождается в мире магии как Рудеус Грейрат.', 'ongoing', 'tv', 23, 24, '2021-01-11', '2021-12-20', 1, 'https://cdn.myanimelist.net/images/anime/1530/117776.jpg', TRUE),
('Токийские мстители', 'Tokyo Revengers', '東京リベンジャーズ', 'Такэмити узнаёт, что его бывшая девушка погибла из-за банды, и получает возможность вернуться в прошлое.', 'completed', 'tv', 37, 24, '2021-04-11', '2023-12-27', 1, 'https://cdn.myanimelist.net/images/anime/1339/133344.jpg', FALSE),
('Кайдзю №8', 'Kaiju No. 8', '怪獣8号', 'Кафка Хибино мечтал служить в Силах обороны, но стал уборщиком. После заражения паразитом он превращается в кайдзю.', 'ongoing', 'tv', 12, 23, '2024-04-13', NULL, 1, 'https://cdn.myanimelist.net/images/anime/1792/142452.jpg', TRUE),
('Ветер крепчает', 'The Wind Rises', '風立ちぬ', 'Дзиро Хорикоси мечтает создать самолёты и становится главным инженером в компании Mitsubishi.', 'completed', 'movie', 1, 126, '2013-07-20', NULL, 1, 'https://cdn.myanimelist.net/images/anime/8/52353.jpg', FALSE),
('Принцесса Мононоке', 'Princess Mononoke', 'もののけ姫', 'Князь Аситака проклят демоном и отправляется на запад, чтобы найти лекарство.', 'completed', 'movie', 1, 134, '1997-07-12', NULL, 1, 'https://cdn.myanimelist.net/images/anime/7/17921.jpg', FALSE),
('Унесённые призраками', 'Spirited Away', '千と千尋の神隠し', 'Тихиро попадает в мир духов и должна работать в банях, чтобы спасти своих родителей.', 'completed', 'movie', 1, 125, '2001-07-20', NULL, 1, 'https://cdn.myanimelist.net/images/anime/6/79597.jpg', FALSE),
('Боевой дух: Бесконечный убийца', 'Demon Slayer: Mugen Train', '鬼滅の刃 無限列車編', 'Рэнгоку присоединяется к команде Танджиро, чтобы расследовать исчезновения на поезде Mugen.', 'completed', 'movie', 1, 117, '2020-10-16', NULL, 4, 'https://cdn.myanimelist.net/images/anime/1704/106947.jpg', FALSE),
('Восхождение героя щита', 'The Rising of the Shield Hero', '盾の勇者の成り上がり', 'Наофуми призывается в фэнтезийный мир как Герой Щита, но его предают и он становится изгоем.', 'completed', 'tv', 25, 24, '2019-01-09', '2019-06-26', 3, 'https://cdn.myanimelist.net/images/anime/1531/102113.jpg', FALSE),
('Клинок, рассекающий демонов', 'Demon Slayer', '鬼滅の刃', 'Танджиро Камадо становится истребителем демонов, чтобы спасти сестру-демона Нэдзуко.', 'completed', 'tv', 26, 24, '2019-04-06', '2019-09-28', 4, 'https://cdn.myanimelist.net/images/anime/1286/99889.jpg', FALSE),
('Хоримия', 'Horimiya', 'ホリミヤ', 'Популярная Кёко Хори и затворник Идзуми Миямура скрывают свои настоящие личности от одноклассников.', 'completed', 'tv', 13, 23, '2021-01-10', '2021-04-04', 4, 'https://cdn.myanimelist.net/images/anime/1879/115396.jpg', FALSE),
('Загадочные убийства Мононоэ', 'Mysterious Disappearances', '怪異と乙女と神隠し', 'Таинственные исчезновения в городе связывают с древним проклятием.', 'completed', 'tv', 12, 23, '2024-04-10', '2024-06-26', 2, 'https://cdn.myanimelist.net/images/anime/1712/138988.jpg', TRUE);

-- Жанры для аниме (anime_id, genre_id)
INSERT INTO anime_genres VALUES
  (1,1),(1,2),(1,5),(1,12),
  (2,1),(2,2),(2,12),
  (3,5),(3,9),(3,10),(3,11),
  (4,1),(4,2),(4,11),(4,12),
  (5,2),(5,3),(5,5),
  (6,1),(6,6),(6,11),
  (7,1),(7,2),(7,3),(7,4),
  (8,1),(8,2),(8,5),(8,11),(8,12)
(9, 1), (9, 6), (9, 4),
-- Tokyo Ghoul
(10, 1), (10, 5), (10, 8), (10, 10),
-- Steins;Gate
(11, 4), (11, 5), (11, 10),
-- Cowboy Bebop
(12, 1), (12, 2), (12, 4), (12, 5),
-- Evangelion
(13, 1), (13, 5), (13, 10), (13, 11),
-- Fullmetal Alchemist
(14, 1), (14, 2), (14, 5), (14, 3),
-- Bleach
(15, 1), (15, 2), (15, 11),
-- One Piece
(16, 1), (16, 2), (16, 6),
-- Mob Psycho 100
(17, 1), (17, 6), (17, 10),
-- Mushoku Tensei
(18, 2), (18, 3), (18, 5), (18, 7),
-- Tokyo Revengers
(19, 1), (19, 5), (19, 9),
-- Kaiju No. 8
(20, 1), (20, 2), (20, 4), (20, 6),
-- The Wind Rises
(21, 5), (21, 7),
-- Princess Mononoke
(22, 1), (22, 2), (22, 3), (22, 5),
-- Spirited Away
(23, 2), (23, 3), (23, 11),
-- Mugen Train
(24, 1), (24, 2), (24, 5), (24, 11),
-- Shield Hero
(25, 1), (25, 2), (25, 3), (25, 5),
-- Demon Slayer TV
(26, 1), (26, 2), (26, 5), (26, 11),
-- Horimiya
(27, 6), (27, 7), (27, 5),
-- Mysterious Disappearances
(28, 9), (28, 10), (28, 11);

-- Сезоны
INSERT INTO seasons (anime_id, season_num, title, episodes, aired_from) VALUES
  (1,1,'Сезон 1',25,'2013-04-07'),
  (1,2,'Сезон 2',12,'2017-04-01'),
  (1,3,'Сезон 3',22,'2018-07-23'),
  (1,4,'Финальный сезон',28,'2020-12-07'),
  (4,1,'Сезон 1',24,'2020-10-03'),
  (4,2,'Сезон 2',23,'2023-07-06');

-- Персонажи
INSERT INTO characters (anime_id, name, name_jp, role, description, image_url) VALUES
  (1,'Эрен Йегер','エレン・イェーガー','main','Главный герой, одержимый желанием обрести свободу.',
   'https://cdn.myanimelist.net/images/characters/10/216895.jpg'),
  (1,'Микаса Аккерман','ミカサ・アッカーマン','main','Приёмная сестра Эрена, один из лучших солдат человечества.',
   'https://cdn.myanimelist.net/images/characters/9/215563.jpg'),
  (3,'Лайт Ягами','夜神月','main','Блестящий школьник, нашедший Тетрадь смерти.',
   'https://cdn.myanimelist.net/images/characters/3/253266.jpg'),
  (3,'Л','エル','main','Величайший детектив мира, охотящийся за Кирой.',
   'https://cdn.myanimelist.net/images/characters/5/45867.jpg'),
  (4,'Юджи Итадори','虎杖悠仁','main','Добродушный юноша, ставший заклинателем.',''),
  (5,'Фриерен','フリーレン','main','Эльфийская волшебница, пережившая своих спутников.',''),
(9, 'Сайтама', 'サイタマ', 'main', 'Герой, способный победить любого противника одним ударом. Страдает от скуки.', 'https://cdn.myanimelist.net/images/characters/11/282026.jpg'),
(9, 'Генос', 'ジェノス', 'main', 'Кибер-человек, ученик Сайтамы. Желает отомстить за свою семью.', 'https://cdn.myanimelist.net/images/characters/13/282027.jpg'),
-- Tokyo Ghoul
(10, 'Кэн Канэки', '金木研', 'main', 'Студент, превратившийся в полугуля. Любит читать книги.', 'https://cdn.myanimelist.net/images/characters/10/219247.jpg'),
(10, 'Тока Киришима', '霧嶋董香', 'main', 'Гуль, работающая в кафе Anteiku. Помогает Канэки.', 'https://cdn.myanimelist.net/images/characters/2/219246.jpg'),
-- Steins;Gate
(11, 'Ринтаро Окабэ', '岡部倫太郎', 'main', 'Самопровозглашённый безумный учёный. Основатель лаборатории будущих гаджетов.', 'https://cdn.myanimelist.net/images/characters/13/98125.jpg'),
(11, 'Курису Макисэ', '牧瀬紅莉栖', 'main', 'Гениальный учёный. Известна как «Учёная-помощница».', 'https://cdn.myanimelist.net/images/characters/14/98124.jpg'),
-- Cowboy Bebop
(12, 'Спайк Шпигель', 'スパイク・スピーゲル', 'main', 'Охотник за головами с загадочным прошлым.', 'https://cdn.myanimelist.net/images/characters/8/42357.jpg'),
(12, 'Фэй Валентайн', 'フェイ・ヴァレンタイン', 'main', 'Мошенница с долгами и амнезией.', 'https://cdn.myanimelist.net/images/characters/3/42360.jpg'),
-- Evangelion
(13, 'Синдзи Икари', '碇シンジ', 'main', 'Пилот Евангелиона-01. Эмоционально закрытый подросток.', 'https://cdn.myanimelist.net/images/characters/3/60058.jpg'),
(13, 'Рей Аянами', '綾波レイ', 'main', 'Таинственная пилот Евангелиона-00. Эмоционально отстранена.', 'https://cdn.myanimelist.net/images/characters/12/60063.jpg'),
-- Fullmetal Alchemist
(14, 'Эдвард Элрик', 'エドワード・エルリック', 'main', 'Алхимик-гений с механическими конечностями.', 'https://cdn.myanimelist.net/images/characters/4/234705.jpg'),
(14, 'Альфонс Элрик', 'アルフォンス・エルリック', 'main', 'Душа Эда, запечатанная в доспехах.', 'https://cdn.myanimelist.net/images/characters/5/234706.jpg'),
-- Bleach
(15, 'Ичиго Куросаки', '黒崎一護', 'main', 'Подросток, ставший Богом Смерти. Видит духов.', 'https://cdn.myanimelist.net/images/characters/6/61458.jpg'),
(15, 'Рукия Кучики', '朽木ルキア', 'main', 'Бог Смерти, передавшая силы Ичиго.', 'https://cdn.myanimelist.net/images/characters/4/61460.jpg'),
-- One Piece
(16, 'Монки Д. Луффи', 'モンキー・D・ルフィ', 'main', 'Капитан Соломенной пиратской команды. Хочет стать Королём пиратов.', 'https://cdn.myanimelist.net/images/characters/4/69067.jpg'),
(16, 'Ророноа Зоро', 'ロロノア・ゾロ', 'main', 'Мечник с тремя мечами. Второй по силе в команде.', 'https://cdn.myanimelist.net/images/characters/5/69068.jpg'),
-- Mob Psycho 100
(17, 'Сигэо Кагэяма (Моб)', '影山茂夫', 'main', 'Экстрасенс-подросток, который пытается жить нормально.', 'https://cdn.myanimelist.net/images/characters/9/293900.jpg'),
(17, 'Аратака Рэйгэн', '霊幻新隆', 'main', 'Лже-экстрасенс, который берёт Моба на работу.', 'https://cdn.myanimelist.net/images/characters/12/293901.jpg'),
-- Mushoku Tensei
(18, 'Рудеус Грейрат', 'ルーデウス・グレイラット', 'main', 'Переродившийся отаку. Маг с огромным потенциалом.', ''),
(18, 'Рокси Мигурдия', 'ロキシー・ミグルディア', 'main', 'Учительница магии Рудеуса. Демон из расы Мигурд.', ''),
-- Tokyo Revengers
(19, 'Такэмити Ханагаки', '花垣武道', 'main', 'Безвольный парень, который может возвращаться в прошлое.', ''),
(19, 'Манидзиро Сано (Маки)', '佐野万次郎', 'main', 'Лидер банды Tokyo Manji. Харизматичный и сильный.', ''),
-- Kaiju No. 8
(20, 'Кафка Хибино', '日比野カフカ', 'main', 'Уборщик, мечтавший служить в Силах обороны. Стал кайдзю.', ''),
(20, 'Мина Асиро', '亜白ミナ', 'main', 'Капитан Сил обороны. Бывшая подруга Кафки.', ''),
-- Princess Mononoke
(22, 'Аситака', 'アシタカ', 'main', 'Князь племени эмиси. Проклят демоном.', 'https://cdn.myanimelist.net/images/characters/11/58924.jpg'),
(22, 'Сан', 'サン', 'main', 'Принцесса Мононоке. Воспитанна волками.', 'https://cdn.myanimelist.net/images/characters/7/58926.jpg'),
-- Spirited Away
(23, 'Тихиро Огино', '荻野千尋', 'main', 'Девочка, попавшая в мир духов.', 'https://cdn.myanimelist.net/images/characters/8/47836.jpg'),
(23, 'Хаку', 'ハク', 'main', 'Дух-дракон. Помогает Тихиро.', 'https://cdn.myanimelist.net/images/characters/12/47837.jpg'),
-- Demon Slayer TV
(26, 'Танджиро Камадо', '竈門炭治郎', 'main', 'Истребитель демонов. Ищет лекарство для сестры.', 'https://cdn.myanimelist.net/images/characters/8/435800.jpg'),
(26, 'Нэдзуко Камадо', '竈門禰豆子', 'main', 'Сестра Танджиро, превратившаяся в демона.', 'https://cdn.myanimelist.net/images/characters/9/435801.jpg'),
-- Horimiya
(27, 'Кёко Хори', '堀京子', 'main', 'Популярная отличница, которая дома заботится о брате.', ''),
(27, 'Идзуми Миямура', '宮村伊澄', 'main', 'Затворник с пирсингом и тату, скрывающий свою внешность.', '');

-- Авторы
INSERT INTO staff (name, name_jp, role, bio) VALUES
  ('Тэцуро Араки','荒木哲郎','Режиссёр','Режиссёр Тетради смерти и Атаки Титанов.'),
  ('Хироси Секо','瀬古浩司','Сценарий','Ведущий сценарист финального сезона Атаки Титанов.'),
  ('Сёта Госёдзоно','五十嵐卓哉','Режиссёр','Режиссёр второго сезона Магической битвы.');

INSERT INTO anime_staff (anime_id, staff_id, role) VALUES
  (1,1,'Режиссёр'),(1,2,'Сценарий'),(4,3,'Режиссёр');
