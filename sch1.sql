--
-- PostgreSQL database dump
--

\restrict tREcFs6rLXz3at1a5pG2EVxsNO56HqVN6pd8RP2FfhDfLTYZhPEELDgwg4onAPu

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

CREATE TABLE public.anim_studies (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    founded_at date,
    country character varying(100),
    website text,
    logo_url text,
    description text
);


ALTER TABLE public.anim_studies OWNER TO postgres;

CREATE SEQUENCE public.anim_studies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.anim_studies_id_seq OWNER TO postgres;

ALTER SEQUENCE public.anim_studies_id_seq OWNED BY public.anim_studies.id;

CREATE TABLE public.anime (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    title_en character varying(255),
    title_jp character varying(255),
    synopsis text,
    poster_url text,
    banner_url text,
    status character varying(30) DEFAULT 'ongoing'::character varying NOT NULL,
    type character varying(30) DEFAULT 'tv'::character varying NOT NULL,
    episodes integer,
    duration_min integer,
    aired_from date,
    aired_to date,
    studio_id integer,
    is_new boolean DEFAULT false NOT NULL,
    season_num smallint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    age_rating character varying(10)
);


ALTER TABLE public.anime OWNER TO postgres;

CREATE TABLE public.anime_genres (
    anime_id integer NOT NULL,
    genre_id integer NOT NULL
);


ALTER TABLE public.anime_genres OWNER TO postgres;


CREATE SEQUENCE public.anime_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.anime_id_seq OWNER TO postgres;


ALTER SEQUENCE public.anime_id_seq OWNED BY public.anime.id;


CREATE TABLE public.anime_screenshots (
    id integer NOT NULL,
    anime_id integer NOT NULL,
    user_id integer NOT NULL,
    image_url text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    reviewed_by integer,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.anime_screenshots OWNER TO postgres;


CREATE SEQUENCE public.anime_screenshots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.anime_screenshots_id_seq OWNER TO postgres;

ALTER SEQUENCE public.anime_screenshots_id_seq OWNED BY public.anime_screenshots.id;

CREATE TABLE public.anime_series (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text
);


ALTER TABLE public.anime_series OWNER TO postgres;

CREATE TABLE public.anime_series_entries (
    series_id integer NOT NULL,
    anime_id integer NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.anime_series_entries OWNER TO postgres;

CREATE SEQUENCE public.anime_series_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.anime_series_id_seq OWNER TO postgres;


ALTER SEQUENCE public.anime_series_id_seq OWNED BY public.anime_series.id;

CREATE TABLE public.anime_staff (
    anime_id integer NOT NULL,
    staff_id integer NOT NULL,
    role character varying(100) NOT NULL
);


ALTER TABLE public.anime_staff OWNER TO postgres;


CREATE TABLE public.anime_themes (
    anime_id integer NOT NULL,
    theme text NOT NULL
);


ALTER TABLE public.anime_themes OWNER TO postgres;

CREATE TABLE public.anime_videos (
    id integer NOT NULL,
    anime_id integer NOT NULL,
    user_id integer NOT NULL,
    url text NOT NULL,
    video_type character varying(30) DEFAULT 'other'::character varying NOT NULL,
    title character varying(255),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    reviewed_by integer,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.anime_videos OWNER TO postgres;


CREATE SEQUENCE public.anime_videos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.anime_videos_id_seq OWNER TO postgres;

ALTER SEQUENCE public.anime_videos_id_seq OWNED BY public.anime_videos.id;

CREATE TABLE public.character_appearances (
    character_id integer NOT NULL,
    anime_id integer NOT NULL,
    role_in_anime character varying(30) DEFAULT 'main'::character varying
);


ALTER TABLE public.character_appearances OWNER TO postgres;

CREATE TABLE public.character_comments (
    id integer NOT NULL,
    user_id integer NOT NULL,
    character_id integer NOT NULL,
    parent_id integer,
    body text NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    image_url text
);


ALTER TABLE public.character_comments OWNER TO postgres;

CREATE SEQUENCE public.character_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.character_comments_id_seq OWNER TO postgres;

ALTER SEQUENCE public.character_comments_id_seq OWNED BY public.character_comments.id;

CREATE TABLE public.character_seiyu (
    character_id integer NOT NULL,
    seiyu_id integer NOT NULL,
    language character varying(50) DEFAULT 'ja'::character varying NOT NULL
);


ALTER TABLE public.character_seiyu OWNER TO postgres;

CREATE TABLE public.characters (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    name_jp character varying(255),
    role character varying(30) DEFAULT 'supporting'::character varying NOT NULL,
    description text,
    image_url text,
    age character varying(20),
    gender character varying(20),
    abilities text
);


ALTER TABLE public.characters OWNER TO postgres;

CREATE SEQUENCE public.characters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.characters_id_seq OWNER TO postgres;

ALTER SEQUENCE public.characters_id_seq OWNED BY public.characters.id;

CREATE TABLE public.comments (
    id integer NOT NULL,
    user_id integer NOT NULL,
    anime_id integer NOT NULL,
    parent_id integer,
    body text NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    image_url text
);


ALTER TABLE public.comments OWNER TO postgres;

CREATE SEQUENCE public.comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.comments_id_seq OWNER TO postgres;

ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;

CREATE TABLE public.favorites (
    user_id integer NOT NULL,
    character_id integer NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.favorites OWNER TO postgres;

CREATE TABLE public.genres (
    id integer NOT NULL,
    name character varying(100) NOT NULL
);


ALTER TABLE public.genres OWNER TO postgres;

CREATE SEQUENCE public.genres_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.genres_id_seq OWNER TO postgres;

ALTER SEQUENCE public.genres_id_seq OWNED BY public.genres.id;

CREATE TABLE public.review_likes (
    user_id integer NOT NULL,
    review_id integer NOT NULL
);


ALTER TABLE public.review_likes OWNER TO postgres;

CREATE TABLE public.reviews (
    id integer NOT NULL,
    user_id integer NOT NULL,
    anime_id integer NOT NULL,
    score smallint NOT NULL,
    title character varying(255) NOT NULL,
    body text NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    helpful integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_body_check CHECK ((length(body) >= 100)),
    CONSTRAINT reviews_score_check CHECK (((score >= 1) AND (score <= 10)))
);


ALTER TABLE public.reviews OWNER TO postgres;

CREATE SEQUENCE public.reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reviews_id_seq OWNER TO postgres;

ALTER SEQUENCE public.reviews_id_seq OWNED BY public.reviews.id;

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text
);


ALTER TABLE public.roles OWNER TO postgres;

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;

CREATE TABLE public.seiyu (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    name_jp character varying(255),
    bio text,
    image_url text,
    born_at date,
    agency character varying(255)
);


ALTER TABLE public.seiyu OWNER TO postgres;

CREATE SEQUENCE public.seiyu_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.seiyu_id_seq OWNER TO postgres;

ALTER SEQUENCE public.seiyu_id_seq OWNED BY public.seiyu.id;

CREATE TABLE public.shippings (
    user_id integer NOT NULL,
    character_id integer NOT NULL,
    shipped_with integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.shippings OWNER TO postgres;

CREATE TABLE public.staff (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    name_jp character varying(255),
    role character varying(100),
    bio text,
    image_url text,
    born_at date
);


ALTER TABLE public.staff OWNER TO postgres;

CREATE SEQUENCE public.staff_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.staff_id_seq OWNER TO postgres;

ALTER SEQUENCE public.staff_id_seq OWNED BY public.staff.id;

CREATE TABLE public.user_ratings (
    user_id integer NOT NULL,
    anime_id integer NOT NULL,
    score smallint NOT NULL,
    rated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_ratings_score_check CHECK (((score >= 1) AND (score <= 10)))
);


ALTER TABLE public.user_ratings OWNER TO postgres;

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    avatar_url text,
    role_id integer DEFAULT 3 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    hide_email boolean DEFAULT true NOT NULL,
    hide_watchlist boolean DEFAULT false NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;

CREATE TABLE public.watchlist (
    user_id integer NOT NULL,
    anime_id integer NOT NULL,
    status character varying(30) DEFAULT 'planned'::character varying NOT NULL,
    episodes_watched integer DEFAULT 0 NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.watchlist OWNER TO postgres;

ALTER TABLE ONLY public.anim_studies ALTER COLUMN id SET DEFAULT nextval('public.anim_studies_id_seq'::regclass);

ALTER TABLE ONLY public.anime ALTER COLUMN id SET DEFAULT nextval('public.anime_id_seq'::regclass);

ALTER TABLE ONLY public.anime_screenshots ALTER COLUMN id SET DEFAULT nextval('public.anime_screenshots_id_seq'::regclass);

ALTER TABLE ONLY public.anime_series ALTER COLUMN id SET DEFAULT nextval('public.anime_series_id_seq'::regclass);

ALTER TABLE ONLY public.anime_videos ALTER COLUMN id SET DEFAULT nextval('public.anime_videos_id_seq'::regclass);

ALTER TABLE ONLY public.character_comments ALTER COLUMN id SET DEFAULT nextval('public.character_comments_id_seq'::regclass);

ALTER TABLE ONLY public.characters ALTER COLUMN id SET DEFAULT nextval('public.characters_id_seq'::regclass);

ALTER TABLE ONLY public.comments ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq'::regclass);

ALTER TABLE ONLY public.genres ALTER COLUMN id SET DEFAULT nextval('public.genres_id_seq'::regclass);

ALTER TABLE ONLY public.reviews ALTER COLUMN id SET DEFAULT nextval('public.reviews_id_seq'::regclass);

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);

ALTER TABLE ONLY public.seiyu ALTER COLUMN id SET DEFAULT nextval('public.seiyu_id_seq'::regclass);

ALTER TABLE ONLY public.staff ALTER COLUMN id SET DEFAULT nextval('public.staff_id_seq'::regclass);

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);

INSERT INTO public.genres (id, name) VALUES (1, 'Экшн');
INSERT INTO public.genres (id, name) VALUES (2, 'Приключения');
INSERT INTO public.genres (id, name) VALUES (3, 'Фэнтези');
INSERT INTO public.genres (id, name) VALUES (4, 'Sci-Fi');
INSERT INTO public.genres (id, name) VALUES (5, 'Драма');
INSERT INTO public.genres (id, name) VALUES (6, 'Комедия');
INSERT INTO public.genres (id, name) VALUES (7, 'Романтика');
INSERT INTO public.genres (id, name) VALUES (8, 'Ужасы');
INSERT INTO public.genres (id, name) VALUES (9, 'Детектив');
INSERT INTO public.genres (id, name) VALUES (10, 'Психологическое');
INSERT INTO public.genres (id, name) VALUES (11, 'Мистика');
INSERT INTO public.genres (id, name) VALUES (12, 'Сёнэн');

INSERT INTO public.roles (id, name, description) VALUES (1, 'admin', 'Полный доступ');
INSERT INTO public.roles (id, name, description) VALUES (2, 'moderator', 'Модерация контента');
INSERT INTO public.roles (id, name, description) VALUES (3, 'user', 'Обычный пользователь');

INSERT INTO public.shippings (user_id, character_id, shipped_with, created_at) VALUES (2, 11, 9, '2026-04-10 14:13:47.454217+04');
INSERT INTO public.shippings (user_id, character_id, shipped_with, created_at) VALUES (1, 11, 10, '2026-04-10 15:17:41.505517+04');
INSERT INTO public.shippings (user_id, character_id, shipped_with, created_at) VALUES (1, 2, 1, '2026-04-12 14:09:06.907678+04');
INSERT INTO public.shippings (user_id, character_id, shipped_with, created_at) VALUES (1, 13, 12, '2026-04-19 01:52:56.374938+04');
INSERT INTO public.shippings (user_id, character_id, shipped_with, created_at) VALUES (1, 15, 14, '2026-04-19 02:04:29.661112+04');

INSERT INTO public.staff (id, name, name_jp, role, bio, image_url, born_at) VALUES (1, 'Хадзимэ Исаяма', '諫山創', 'Мангака', 'Автор манги «Атака Титанов».', NULL, NULL);
INSERT INTO public.staff (id, name, name_jp, role, bio, image_url, born_at) VALUES (2, 'Тэцуро Араки', '荒木哲郎', 'Режиссёр', 'Режиссёр 1 сезона Атаки Титанов и Тетради смерти.', NULL, NULL);
INSERT INTO public.staff (id, name, name_jp, role, bio, image_url, born_at) VALUES (3, 'Масаси Кисимото', '岸本斉史', 'Мангака', 'Автор манги «Наруто».', NULL, NULL);
INSERT INTO public.staff (id, name, name_jp, role, bio, image_url, born_at) VALUES (4, 'Цугуми Оба', '大場つぐみ', 'Сценарий', 'Автор манги «Тетрадь смерти».', NULL, NULL);
INSERT INTO public.staff (id, name, name_jp, role, bio, image_url, born_at) VALUES (5, 'Сёта Госёдзоно', '五十嵐卓哉', 'Режиссёр', 'Режиссёр 2 сезона Магической битвы.', NULL, NULL);

INSERT INTO public.user_ratings (user_id, anime_id, score, rated_at) VALUES (1, 7, 8, '2026-04-12 14:08:10.041564+04');
INSERT INTO public.user_ratings (user_id, anime_id, score, rated_at) VALUES (1, 9, 8, '2026-04-19 00:47:38.540891+04');
INSERT INTO public.user_ratings (user_id, anime_id, score, rated_at) VALUES (2, 9, 9, '2026-04-19 01:06:12.88807+04');

INSERT INTO public.users (id, username, email, password_hash, avatar_url, role_id, is_active, created_at, updated_at, hide_email, hide_watchlist) VALUES (2, 'Ricer13', 'al.henks99@mail.ru', '$2b$10$Z/wtPlVxz9oXyiYA7o3h8ubjyi5aJ.1EgbhJsIhz9Jirt2NFc4h46', NULL, 3, true, '2026-04-10 14:13:21.069541+04', '2026-04-10 14:13:21.069541+04', true, false);
INSERT INTO public.users (id, username, email, password_hash, avatar_url, role_id, is_active, created_at, updated_at, hide_email, hide_watchlist) VALUES (1, 'Grixan99', 'id762836932@mail.ru', '$2b$10$l.QmGpgZwz12Agr3iL4olu.5SA3MPmK2BdCQVsZsAs3bAAJFy/jxK', NULL, 1, true, '2026-04-10 14:12:33.673769+04', '2026-04-17 13:40:36.466791+04', true, false);

INSERT INTO public.watchlist (user_id, anime_id, status, episodes_watched, added_at, updated_at) VALUES (1, 9, 'completed', 28, '2026-04-19 00:47:49.973519+04', '2026-04-19 00:47:49.973519+04');
INSERT INTO public.watchlist (user_id, anime_id, status, episodes_watched, added_at, updated_at) VALUES (2, 9, 'completed', 28, '2026-04-19 01:06:14.728526+04', '2026-04-19 01:06:14.728526+04');

SELECT pg_catalog.setval('public.anim_studies_id_seq', 6, true);

SELECT pg_catalog.setval('public.anime_id_seq', 13, true);

SELECT pg_catalog.setval('public.anime_screenshots_id_seq', 2, true);

SELECT pg_catalog.setval('public.anime_series_id_seq', 2, true);

SELECT pg_catalog.setval('public.anime_videos_id_seq', 1, true);

SELECT pg_catalog.setval('public.character_comments_id_seq', 1, false);

SELECT pg_catalog.setval('public.characters_id_seq', 15, true);

SELECT pg_catalog.setval('public.comments_id_seq', 6, true);

SELECT pg_catalog.setval('public.genres_id_seq', 12, true);

SELECT pg_catalog.setval('public.reviews_id_seq', 1, false);

SELECT pg_catalog.setval('public.roles_id_seq', 3, true);

SELECT pg_catalog.setval('public.seiyu_id_seq', 1, false);

SELECT pg_catalog.setval('public.staff_id_seq', 5, true);

SELECT pg_catalog.setval('public.users_id_seq', 2, true);

ALTER TABLE ONLY public.anim_studies
    ADD CONSTRAINT anim_studies_name_key UNIQUE (name);

ALTER TABLE ONLY public.anim_studies
    ADD CONSTRAINT anim_studies_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.anime_genres
    ADD CONSTRAINT anime_genres_pkey PRIMARY KEY (anime_id, genre_id);

ALTER TABLE ONLY public.anime
    ADD CONSTRAINT anime_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.anime_screenshots
    ADD CONSTRAINT anime_screenshots_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.anime_series_entries
    ADD CONSTRAINT anime_series_entries_pkey PRIMARY KEY (series_id, anime_id);

ALTER TABLE ONLY public.anime_series
    ADD CONSTRAINT anime_series_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.anime_staff
    ADD CONSTRAINT anime_staff_pkey PRIMARY KEY (anime_id, staff_id, role);

ALTER TABLE ONLY public.anime_themes
    ADD CONSTRAINT anime_themes_pkey PRIMARY KEY (anime_id, theme);

ALTER TABLE ONLY public.anime_videos
    ADD CONSTRAINT anime_videos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.character_appearances
    ADD CONSTRAINT character_appearances_pkey PRIMARY KEY (character_id, anime_id);

ALTER TABLE ONLY public.character_comments
    ADD CONSTRAINT character_comments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.character_seiyu
    ADD CONSTRAINT character_seiyu_pkey PRIMARY KEY (character_id, seiyu_id, language);

ALTER TABLE ONLY public.characters
    ADD CONSTRAINT characters_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (user_id, character_id);

ALTER TABLE ONLY public.genres
    ADD CONSTRAINT genres_name_key UNIQUE (name);

ALTER TABLE ONLY public.genres
    ADD CONSTRAINT genres_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.review_likes
    ADD CONSTRAINT review_likes_pkey PRIMARY KEY (user_id, review_id);

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_anime_id_key UNIQUE (user_id, anime_id);

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.seiyu
    ADD CONSTRAINT seiyu_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.shippings
    ADD CONSTRAINT shippings_pkey PRIMARY KEY (user_id, character_id);

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_ratings
    ADD CONSTRAINT user_ratings_pkey PRIMARY KEY (user_id, anime_id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);

ALTER TABLE ONLY public.watchlist
    ADD CONSTRAINT watchlist_pkey PRIMARY KEY (user_id, anime_id);

CREATE INDEX idx_anime_series_entries_anime ON public.anime_series_entries USING btree (anime_id);

CREATE INDEX idx_anime_series_entries_series ON public.anime_series_entries USING btree (series_id);

CREATE INDEX idx_char_appearances_anime ON public.character_appearances USING btree (anime_id);

CREATE INDEX idx_char_appearances_char ON public.character_appearances USING btree (character_id);

CREATE INDEX idx_char_comments_char ON public.character_comments USING btree (character_id);

CREATE INDEX idx_comments_anime ON public.comments USING btree (anime_id);

CREATE INDEX idx_reviews_anime ON public.reviews USING btree (anime_id);

CREATE INDEX idx_screenshots_anime ON public.anime_screenshots USING btree (anime_id, status);

CREATE INDEX idx_shippings_character ON public.shippings USING btree (character_id);

CREATE INDEX idx_videos_anime ON public.anime_videos USING btree (anime_id, status);

CREATE TRIGGER trg_anime_upd BEFORE UPDATE ON public.anime FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_comments_upd BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_reviews_upd BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_users_upd BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_watchlist_upd BEFORE UPDATE ON public.watchlist FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE ONLY public.anime_genres
    ADD CONSTRAINT anime_genres_anime_id_fkey FOREIGN KEY (anime_id) REFERENCES public.anime(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.anime_genres
    ADD CONSTRAINT anime_genres_genre_id_fkey FOREIGN KEY (genre_id) REFERENCES public.genres(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.anime_screenshots
    ADD CONSTRAINT anime_screenshots_anime_id_fkey FOREIGN KEY (anime_id) REFERENCES public.anime(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.anime_screenshots
    ADD CONSTRAINT anime_screenshots_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.anime_screenshots
    ADD CONSTRAINT anime_screenshots_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.anime_series_entries
    ADD CONSTRAINT anime_series_entries_anime_id_fkey FOREIGN KEY (anime_id) REFERENCES public.anime(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.anime_series_entries
    ADD CONSTRAINT anime_series_entries_series_id_fkey FOREIGN KEY (series_id) REFERENCES public.anime_series(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.anime_staff
    ADD CONSTRAINT anime_staff_anime_id_fkey FOREIGN KEY (anime_id) REFERENCES public.anime(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.anime_staff
    ADD CONSTRAINT anime_staff_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.anime
    ADD CONSTRAINT anime_studio_id_fkey FOREIGN KEY (studio_id) REFERENCES public.anim_studies(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.anime_themes
    ADD CONSTRAINT anime_themes_anime_id_fkey FOREIGN KEY (anime_id) REFERENCES public.anime(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.anime_videos
    ADD CONSTRAINT anime_videos_anime_id_fkey FOREIGN KEY (anime_id) REFERENCES public.anime(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.anime_videos
    ADD CONSTRAINT anime_videos_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.anime_videos
    ADD CONSTRAINT anime_videos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.character_appearances
    ADD CONSTRAINT character_appearances_anime_id_fkey FOREIGN KEY (anime_id) REFERENCES public.anime(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.character_appearances
    ADD CONSTRAINT character_appearances_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.character_comments
    ADD CONSTRAINT character_comments_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.character_comments
    ADD CONSTRAINT character_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.character_comments(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.character_comments
    ADD CONSTRAINT character_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.character_seiyu
    ADD CONSTRAINT character_seiyu_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.character_seiyu
    ADD CONSTRAINT character_seiyu_seiyu_id_fkey FOREIGN KEY (seiyu_id) REFERENCES public.seiyu(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_anime_id_fkey FOREIGN KEY (anime_id) REFERENCES public.anime(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.comments(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.review_likes
    ADD CONSTRAINT review_likes_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.review_likes
    ADD CONSTRAINT review_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_anime_id_fkey FOREIGN KEY (anime_id) REFERENCES public.anime(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.shippings
    ADD CONSTRAINT shippings_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.shippings
    ADD CONSTRAINT shippings_shipped_with_fkey FOREIGN KEY (shipped_with) REFERENCES public.characters(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.shippings
    ADD CONSTRAINT shippings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_ratings
    ADD CONSTRAINT user_ratings_anime_id_fkey FOREIGN KEY (anime_id) REFERENCES public.anime(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_ratings
    ADD CONSTRAINT user_ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);

ALTER TABLE ONLY public.watchlist
    ADD CONSTRAINT watchlist_anime_id_fkey FOREIGN KEY (anime_id) REFERENCES public.anime(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.watchlist
    ADD CONSTRAINT watchlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

\unrestrict tREcFs6rLXz3at1a5pG2EVxsNO56HqVN6pd8RP2FfhDfLTYZhPEELDgwg4onAPu

