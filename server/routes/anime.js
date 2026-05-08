// server/routes/anime.js
const router = require("express").Router();
const pool   = require("../db");
const jwt    = require("jsonwebtoken");
const { requireAdmin } = require("../middleware/admin");
const { validate, schemas } = require("../middleware/validate");
const { createNotification } = require("./notifications");

function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    try {
      const p = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
      req.userId = p.id;
      req.roleId = p.role;
    } catch {}
  }
  next();
}
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer "))
    return res.status(401).json({ error: "Не авторизован" });
  try {
    const p = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    req.userId = p.id;
    req.roleId = p.role;
    next();
  } catch (e) {
    if (e.name === "TokenExpiredError")
      return res.status(401).json({ error: "Токен недействителен" }); // expired
    return res.status(401).json({ error: "Токен недействителен" });
  }
}

function normStr(s) {
  if (s === undefined || s === null) return null;
  const t = String(s).trim();
  return t.length ? t : null;
}
function numOrNull(v) {
  if (v === "" || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function dateOrNull(v) {
  if (!v || String(v).trim() === "") return null;
  return String(v).slice(0, 10);
}
function parseGenreIds(body) {
  const g = body.genre_ids;
  if (!Array.isArray(g)) return [];
  return [...new Set(g.map(x => parseInt(x, 10)).filter(n => Number.isInteger(n) && n > 0))];
}
function parseThemes(body) {
  const t = body.themes;
  if (!t) return [];
  if (Array.isArray(t)) return t.map(x => String(x).trim()).filter(Boolean);
  if (typeof t === "string") return t.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
  return [];
}

async function resolveStudioIdForBody(client, body) {
  const newName = normStr(body.studio_new_name);
  if (newName) {
    await client.query(
      "INSERT INTO anim_studies (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
      [newName]
    );
    const r = await client.query("SELECT id FROM anim_studies WHERE name = $1", [newName]);
    return r.rows[0]?.id ?? null;
  }
  if (body.studio_id != null && body.studio_id !== "") {
    const n = Number(body.studio_id);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function saveAnimeGenresAndThemes(client, animeId, genreIds, themeStrings) {
  await client.query("DELETE FROM anime_genres WHERE anime_id = $1", [animeId]);
  await client.query("DELETE FROM anime_themes WHERE anime_id = $1", [animeId]);
  for (const gid of genreIds) {
    await client.query(
      "INSERT INTO anime_genres (anime_id, genre_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [animeId, gid]
    );
  }
  for (const th of themeStrings) {
    await client.query(
      "INSERT INTO anime_themes (anime_id, theme) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [animeId, th]
    );
  }
}


async function saveAnimeSeries(client, animeId, seriesData) {
  // seriesData: { mode, series_id, series_title, series_description, sort_order }
  if (!seriesData || !seriesData.mode) return;

  // Сначала убираем из любой существующей серии
  await client.query(
    "DELETE FROM anime_series_entries WHERE anime_id = $1",
    [animeId]
  );

  if (seriesData.mode === "none") return;

  let seriesId;

  if (seriesData.mode === "existing" && seriesData.series_id) {
    seriesId = Number(seriesData.series_id);
  } else if (seriesData.mode === "new" && seriesData.series_title?.trim()) {
    // Создаём новую серию
    await client.query(
      "INSERT INTO anime_series (title, description) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [seriesData.series_title.trim(), seriesData.series_description?.trim() || null]
    );
    const r = await client.query(
      "SELECT id FROM anime_series WHERE title = $1",
      [seriesData.series_title.trim()]
    );
    seriesId = r.rows[0]?.id;
  }

  if (!seriesId) return;

  const sortOrder = seriesData.sort_order != null ? Number(seriesData.sort_order) : 99;
  await client.query(
    `INSERT INTO anime_series_entries (series_id, anime_id, sort_order)
     VALUES ($1, $2, $3)
     ON CONFLICT (series_id, anime_id) DO UPDATE SET sort_order = EXCLUDED.sort_order`,
    [seriesId, animeId, sortOrder]
  );
}

// ── Статические роуты ПЕРЕД /:id ─────────────────────────────

router.get("/genres", async (req, res) => {
  try {
    res.json((await pool.query("SELECT * FROM genres ORDER BY name")).rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/studios", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT s.id, s.name, s.country, COUNT(a.id)::int AS anime_count
      FROM anim_studies s LEFT JOIN anime a ON a.studio_id = s.id
      GROUP BY s.id ORDER BY anime_count DESC, s.name
    `);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/themes", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT theme AS name, COUNT(*)::int AS anime_count
      FROM anime_themes
      GROUP BY theme
      ORDER BY theme
    `);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});


router.get("/series-list", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT s.id, s.title, s.description,
             JSON_AGG(JSON_BUILD_OBJECT('id', a.id, 'title', a.title, 'season_num', a.season_num)
               ORDER BY ase.sort_order) AS entries
      FROM anime_series s
      JOIN anime_series_entries ase ON ase.series_id = s.id
      JOIN anime a ON a.id = ase.anime_id
      GROUP BY s.id
      ORDER BY s.title
    `);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/anime — добавление (только админ) ─────────────────
router.post("/", requireAdmin, validate(schemas.animeBody), async (req, res) => {
  const body = req.body || {};
  const title = normStr(body.title);
  if (!title) return res.status(400).json({ error: "Укажите название" });

  const genreIds = parseGenreIds(body);
  const themeList = parseThemes(body);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const studioIdResolved = await resolveStudioIdForBody(client, body);
    const ins = await client.query(
      `INSERT INTO anime (
        title, title_en, title_jp, synopsis, poster_url, banner_url,
        status, type, episodes, duration_min, aired_from, aired_to,
        studio_id, is_new, season_num, age_rating
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING id`,
      [
        title,
        normStr(body.title_en),
        normStr(body.title_jp),
        normStr(body.synopsis),
        normStr(body.poster_url),
        normStr(body.banner_url),
        body.status && String(body.status).trim() ? String(body.status).trim() : "ongoing",
        body.type && String(body.type).trim() ? String(body.type).trim() : "tv",
        numOrNull(body.episodes),
        numOrNull(body.duration_min),
        dateOrNull(body.aired_from),
        dateOrNull(body.aired_to),
        studioIdResolved,
        Boolean(body.is_new),
        body.season_num !== "" && body.season_num != null ? Number(body.season_num) : null,
        normStr(body.age_rating),
      ]
    );
    const animeId = ins.rows[0].id;
    await saveAnimeGenresAndThemes(client, animeId, genreIds, themeList);
    if (body.series) await saveAnimeSeries(client, animeId, body.series);
    await client.query("COMMIT");
    // Поля расписания — обновляем отдельно (graceful: колонки могут ещё не существовать)
    try {
      const airWeekdayVal = body.air_weekday != null && body.air_weekday !== ""
        ? Number(body.air_weekday) : null;
      const airTimeVal = normStr(body.air_time);
      const episodesAiredVal = numOrNull(body.episodes_aired) || 0;
      await pool.query(
        "UPDATE anime SET air_weekday=$1, air_time=$2, episodes_aired=$3 WHERE id=$4",
        [airWeekdayVal, airTimeVal, episodesAiredVal, animeId]
      );
      if (airWeekdayVal != null && airTimeVal) {
        const { calcNextEpisodeAt } = require("../services/episodeScheduler");
        const nextAt = calcNextEpisodeAt(airWeekdayVal, airTimeVal);
        await pool.query("UPDATE anime SET next_episode_at=$1 WHERE id=$2", [nextAt, animeId]);
      }
    } catch (schedErr) {
      // Колонки расписания ещё не добавлены — применить миграцию 006_episode_schedule.sql
      console.warn("[anime] Schedule fields not yet in DB:", schedErr.message);
    }
    res.status(201).json({ id: animeId, ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ── PUT /api/anime/:id — редактирование (только админ) ──────────
router.put("/:id", requireAdmin, validate(schemas.animeBody), async (req, res) => {
  const { id } = req.params;
  if (isNaN(+id)) return res.status(400).json({ error: "Неверный id" });

  const ex = await pool.query("SELECT 1 FROM anime WHERE id = $1", [id]);
  if (!ex.rows.length) return res.status(404).json({ error: "Не найдено" });

  const body = req.body || {};
  const title = normStr(body.title);
  if (!title) return res.status(400).json({ error: "Укажите название" });

  const genreIds = parseGenreIds(body);
  const themeList = parseThemes(body);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const studioIdResolved = await resolveStudioIdForBody(client, body);
    await client.query(
      `UPDATE anime SET
        title = $1, title_en = $2, title_jp = $3, synopsis = $4,
        poster_url = $5, banner_url = $6, status = $7, type = $8,
        episodes = $9, duration_min = $10, aired_from = $11, aired_to = $12,
        studio_id = $13, is_new = $14, season_num = $15, age_rating = $16,
        updated_at = NOW()
      WHERE id = $17`,
      [
        title,
        normStr(body.title_en),
        normStr(body.title_jp),
        normStr(body.synopsis),
        normStr(body.poster_url),
        normStr(body.banner_url),
        body.status && String(body.status).trim() ? String(body.status).trim() : "ongoing",
        body.type && String(body.type).trim() ? String(body.type).trim() : "tv",
        numOrNull(body.episodes),
        numOrNull(body.duration_min),
        dateOrNull(body.aired_from),
        dateOrNull(body.aired_to),
        studioIdResolved,
        Boolean(body.is_new),
        body.season_num !== "" && body.season_num != null ? Number(body.season_num) : null,
        normStr(body.age_rating),
        id,
      ]
    );
    await saveAnimeGenresAndThemes(client, id, genreIds, themeList);
    if (body.series) await saveAnimeSeries(client, id, body.series);
    await client.query("COMMIT");
    // Поля расписания — отдельно с graceful fallback
    try {
      const airWeekday = body.air_weekday != null && body.air_weekday !== ""
        ? Number(body.air_weekday) : null;
      const airTime = normStr(body.air_time);
      await pool.query(
        "UPDATE anime SET air_weekday=$1, air_time=$2, episodes_aired=$3 WHERE id=$4",
        [airWeekday, airTime, numOrNull(body.episodes_aired) ?? 0, id]
      );
      if (airWeekday != null && airTime) {
        const { calcNextEpisodeAt } = require("../services/episodeScheduler");
        const nextAt = calcNextEpisodeAt(airWeekday, airTime);
        await pool.query("UPDATE anime SET next_episode_at=$1 WHERE id=$2", [nextAt, id]);
      } else if (body.status !== "ongoing") {
        await pool.query("UPDATE anime SET next_episode_at=NULL WHERE id=$1", [id]);
      }
    } catch (schedErr) {
      console.warn("[anime] Schedule fields not yet in DB:", schedErr.message);
    }
    res.json({ ok: true, id: Number(id) });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ── POST /api/anime/:id/characters — персонаж к тайтлу (только админ) ─
router.post("/:id/characters", requireAdmin, async (req, res) => {
  const animeId = req.params.id;
  if (isNaN(+animeId)) return res.status(400).json({ error: "Неверный id аниме" });

  const body = req.body || {};
  const mode = String(body.mode || "new").toLowerCase();
  const roleInAnime = ["main", "supporting", "extra"].includes(body.role_in_anime)
    ? body.role_in_anime
    : "supporting";

  const animeEx = await pool.query("SELECT 1 FROM anime WHERE id = $1", [animeId]);
  if (!animeEx.rows.length) return res.status(404).json({ error: "Аниме не найдено" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let charId;

    if (mode === "link") {
      const cid = parseInt(body.character_id, 10);
      if (!Number.isInteger(cid)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Укажите числовой id персонажа" });
      }
      const c = await client.query("SELECT id FROM characters WHERE id = $1", [cid]);
      if (!c.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Персонаж не найден" });
      }
      charId = cid;
    } else {
      const name = normStr(body.name);
      if (!name) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Укажите имя персонажа" });
      }
      const gRole = ["main", "supporting", "extra"].includes(body.role) ? body.role : "supporting";
      const ins = await client.query(
        `INSERT INTO characters (name, name_jp, role, description, image_url, age, gender, abilities)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [
          name,
          normStr(body.name_jp),
          gRole,
          normStr(body.description),
          normStr(body.image_url),
          normStr(body.age),
          normStr(body.gender),
          normStr(body.abilities),
        ]
      );
      charId = ins.rows[0].id;
    }

    await client.query(
      `INSERT INTO character_appearances (character_id, anime_id, role_in_anime)
       VALUES ($1,$2,$3)
       ON CONFLICT (character_id, anime_id) DO UPDATE SET role_in_anime = EXCLUDED.role_in_anime`,
      [charId, animeId, roleInAnime]
    );
    await client.query("COMMIT");
    res.status(201).json({ ok: true, character_id: charId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ── GET /api/anime — список ───────────────────────────────────
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { q, status, type, sort, genre, studio, theme, is_new, series, season_year, season_quarter, limit=100, offset=0 } = req.query;
    // filterParams — только параметры WHERE (без userId, limit, offset)
    const conds = ["1=1"];
    const filterParams = [];
    let i = 1;

    if (q)      { conds.push(`(a.title ILIKE $${i} OR a.title_en ILIKE $${i} OR a.title_jp ILIKE $${i})`); filterParams.push(`%${q}%`); i++; }
    if (status) { conds.push(`a.status = $${i}`); filterParams.push(status); i++; }
    if (type)   { conds.push(`a.type = $${i}`);   filterParams.push(type);   i++; }
    if (is_new === "true") conds.push("a.is_new = TRUE");
    if (genre)  {
      conds.push(`a.id IN (SELECT ag.anime_id FROM anime_genres ag JOIN genres g ON g.id = ag.genre_id WHERE g.name = $${i})`);
      filterParams.push(genre); i++;
    }
    if (theme) {
      conds.push(`a.id IN (SELECT anime_id FROM anime_themes WHERE theme = $${i})`);
      filterParams.push(theme); i++;
    }
    if (studio) { conds.push(`s.name = $${i}`); filterParams.push(studio); i++; }
    if (series) {
      conds.push(`a.id IN (SELECT anime_id FROM anime_series_entries WHERE series_id = $${i})`);
      filterParams.push(series); i++;
    }
    if (season_year) {
      const yr = parseInt(season_year, 10);
      if (!isNaN(yr)) {
        conds.push(`EXTRACT(YEAR FROM a.aired_from)::int = $${i}`);
        filterParams.push(yr); i++;
      }
    }
    if (season_quarter) {
      const qtr = parseInt(season_quarter, 10);
      if (!isNaN(qtr) && qtr >= 1 && qtr <= 4) {
        conds.push(`EXTRACT(QUARTER FROM a.aired_from)::int = $${i}`);
        filterParams.push(qtr); i++;
      }
    }

    // countSql использует только filterParams (без userId/limit/offset)
    const countSql = `SELECT COUNT(DISTINCT a.id)::int AS total FROM anime a LEFT JOIN anim_studies s ON s.id = a.studio_id WHERE ${conds.join(" AND ")}`;

    // Для основного SELECT добавляем userId (опционально), затем limit/offset
    const params = [...filterParams];
    const myR = req.userId
      ? `, (SELECT score FROM user_ratings WHERE user_id = $${i++} AND anime_id = a.id) AS my_rating`
      : "";
    if (req.userId) params.push(req.userId);

    let ord = "a.title ASC";
    if (sort === "rating") ord = "avg_rating DESC NULLS LAST";
    if (sort === "newest") ord = "a.aired_from DESC NULLS LAST";

    params.push(Number(limit), Number(offset));
    const li = i++, oi = i++;

    const sql = `
      SELECT
        a.id, a.title, a.title_en, a.title_jp, a.synopsis,
        a.poster_url, a.banner_url, a.status, a.type,
        a.episodes, a.duration_min, a.aired_from, a.aired_to,
        a.is_new, a.studio_id, a.season_num,
        a.age_rating,
        COALESCE(
          (SELECT json_agg(DISTINCT ath.theme ORDER BY ath.theme) FROM anime_themes ath WHERE ath.anime_id = a.id),
          '[]'::json
        ) AS themes,
        s.name AS studio_name,
        COALESCE(JSON_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL), '[]') AS genres,
        ROUND(AVG(ur.score)::numeric, 1) AS avg_rating,
        COUNT(DISTINCT ur.user_id)::int  AS rating_count
        ${myR}
      FROM anime a
      LEFT JOIN anim_studies   s  ON s.id = a.studio_id
      LEFT JOIN anime_genres   ag ON ag.anime_id = a.id
      LEFT JOIN genres         g  ON g.id = ag.genre_id
      LEFT JOIN user_ratings   ur ON ur.anime_id = a.id
      WHERE ${conds.join(" AND ")}
      GROUP BY a.id, s.id, s.name
      ORDER BY ${ord}
      LIMIT $${li} OFFSET $${oi}
    `;

    const [rows, countRow] = await Promise.all([
      pool.query(sql, params),
      pool.query(countSql, filterParams),
    ]);
    res.json({ items: rows.rows, total: countRow.rows[0].total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ── GET /api/anime/series/:id — страница серии ───────────────
router.get("/series/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(+id)) return res.status(400).json({ error: "Неверный id" });

    const serQ = await pool.query("SELECT * FROM anime_series WHERE id=$1", [id]);
    if (!serQ.rows[0]) return res.status(404).json({ error: "Серия не найдена" });

    const entriesQ = await pool.query(`
      SELECT
        a.id, a.title, a.title_jp, a.title_en, a.poster_url,
        a.status, a.type, a.episodes, a.aired_from, a.aired_to,
        a.season_num, a.synopsis,
        s.name AS studio_name,
        ROUND(AVG(ur.score)::numeric, 1) AS avg_rating,
        COUNT(DISTINCT ur.user_id)::int AS rating_count,
        ase.sort_order
      FROM anime_series_entries ase
      JOIN anime a ON a.id = ase.anime_id
      LEFT JOIN anim_studies s ON s.id = a.studio_id
      LEFT JOIN user_ratings ur ON ur.anime_id = a.id
      WHERE ase.series_id = $1
      GROUP BY a.id, s.name, ase.sort_order
      ORDER BY ase.sort_order ASC, a.aired_from ASC NULLS LAST
    `, [id]);

    res.json({
      ...serQ.rows[0],
      entries: entriesQ.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/anime/:id ────────────────────────────────────────
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(+id)) return res.status(400).json({ error: "Неверный id" });

    const myR = req.userId
      ? `, (SELECT score FROM user_ratings WHERE user_id = $2 AND anime_id = a.id) AS my_rating`
      : "";
    const qp = req.userId ? [id, req.userId] : [id];

    const animeQ = await pool.query(`
      SELECT
        a.id, a.title, a.title_en, a.title_jp, a.synopsis,
        a.poster_url, a.banner_url, a.status, a.type,
        a.episodes, a.duration_min, a.aired_from, a.aired_to,
        a.studio_id, a.is_new, a.season_num, a.created_at, a.updated_at,
        a.age_rating,
        s.name AS studio_name,
        COALESCE(JSON_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL), '[]') AS genres,
        COALESCE(
          (SELECT json_agg(DISTINCT ath.theme ORDER BY ath.theme) FROM anime_themes ath WHERE ath.anime_id = a.id),
          '[]'::json
        ) AS themes,
        ROUND(AVG(ur.score)::numeric, 1) AS avg_rating,
        COUNT(DISTINCT ur.user_id)::int AS rating_count
        ${myR}
      FROM anime a
      LEFT JOIN anim_studies s  ON s.id = a.studio_id
      LEFT JOIN anime_genres ag ON ag.anime_id = a.id
      LEFT JOIN genres       g  ON g.id = ag.genre_id
      LEFT JOIN user_ratings ur ON ur.anime_id = a.id
      WHERE a.id = $1
      GROUP BY a.id, s.name
    `, qp);
    if (!animeQ.rows[0]) return res.status(404).json({ error: "Не найдено" });

    // Серия
    const seriesQ = await pool.query(`
      SELECT ser.id AS series_id, ser.title AS series_title,
             ser.description AS series_description,
             JSON_AGG(
               JSON_BUILD_OBJECT(
                 'id', a2.id, 'title', a2.title, 'poster_url', a2.poster_url,
                 'season_num', a2.season_num, 'aired_from', a2.aired_from,
                 'status', a2.status, 'episodes', a2.episodes
               ) ORDER BY ase2.sort_order
             ) AS entries
      FROM anime_series_entries ase
      JOIN anime_series ser ON ser.id = ase.series_id
      JOIN anime_series_entries ase2 ON ase2.series_id = ser.id
      JOIN anime a2 ON a2.id = ase2.anime_id
      WHERE ase.anime_id = $1
      GROUP BY ser.id
    `, [id]);

    // Персонажи через character_appearances
    // Используем GROUP BY вместо DISTINCT + ORDER BY по полям из SELECT
    const charsQ = await pool.query(`
      SELECT c.id, c.name, c.name_jp, c.role, c.image_url,
             c.description, c.age, c.gender, c.abilities,
             ca.role_in_anime,
             MIN(ca2.aired_from) AS first_appearance
      FROM character_appearances ca
      JOIN characters c ON c.id = ca.character_id
      -- для сортировки берём min aired_from из всех аниме персонажа
      LEFT JOIN (
        SELECT ca3.character_id, a3.aired_from
        FROM character_appearances ca3
        JOIN anime a3 ON a3.id = ca3.anime_id
      ) ca2 ON ca2.character_id = c.id
      WHERE ca.anime_id = $1
      GROUP BY c.id, c.name, c.name_jp, c.role, c.image_url,
               c.description, c.age, c.gender, c.abilities, ca.role_in_anime
      ORDER BY
        CASE ca.role_in_anime WHEN 'main' THEN 0 ELSE 1 END,
        c.name
    `, [id]);

    const [staffQ, commentsQ, reviewsQ] = await Promise.all([
      pool.query(`
        SELECT st.*, ast.role AS anime_role
        FROM staff st
        JOIN anime_staff ast ON ast.staff_id = st.id
        WHERE ast.anime_id = $1
      `, [id]),

      pool.query(`
        SELECT c.id, c.body, c.created_at, c.parent_id, c.image_url,
               u.username, u.id AS user_id, u.avatar_url,
               pu.username AS parent_username
        FROM comments c
        JOIN users u ON u.id = c.user_id
        LEFT JOIN comments pc ON pc.id = c.parent_id
        LEFT JOIN users pu ON pu.id = pc.user_id
        WHERE c.anime_id = $1 AND c.is_deleted = FALSE
        ORDER BY COALESCE(c.parent_id, c.id) ASC, c.created_at ASC
      `, [id]),

      pool.query(`
        SELECT r.id, r.score, r.title, r.body, r.helpful,
               r.created_at, r.updated_at,
               u.id AS user_id, u.username,
               ${req.userId
                  ? `(SELECT 1 FROM review_likes WHERE user_id = ${req.userId} AND review_id = r.id) IS NOT NULL AS liked_by_me,`
                  : "FALSE AS liked_by_me,"}
               (SELECT COUNT(*) FROM review_likes WHERE review_id = r.id)::int AS likes_count
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        WHERE r.anime_id = $1 AND r.is_deleted = FALSE
        ORDER BY r.helpful DESC, r.created_at DESC
      `, [id]),
    ]);

    // Распределение оценок (1-10) для диаграммы
    const scoreDistRaw = await pool.query(`
      SELECT score, COUNT(*)::int AS count
      FROM user_ratings WHERE anime_id=$1
      GROUP BY score ORDER BY score
    `, [id]);
    const totalVotes = scoreDistRaw.rows.reduce((s,r)=>s+r.count,0);
    const scoreDist = Array.from({length:10},(_,i)=>{
      const row = scoreDistRaw.rows.find(r=>Number(r.score)===(i+1));
      const count = row?.count||0;
      return { score: i+1, count, pct: totalVotes>0 ? Math.round(count/totalVotes*100) : 0 };
    });

    const myReview = req.userId
      ? (await pool.query(
          "SELECT * FROM reviews WHERE user_id=$1 AND anime_id=$2 AND is_deleted=FALSE",
          [req.userId, id]
        )).rows[0] || null
      : null;

    res.json({
      ...animeQ.rows[0],
      series:          seriesQ.rows[0] || null,
      characters:      charsQ.rows,
      staff:           staffQ.rows,
      comments:        commentsQ.rows,
      reviews:         reviewsQ.rows,
      my_review:       myReview,
      score_distribution: scoreDist,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/anime/:id/rate ──────────────────────────────────
router.post("/:id/rate", requireAuth, validate(schemas.rating), async (req, res) => {
  try {
    const { id } = req.params;
    const { score } = req.body;
    await pool.query(`
      INSERT INTO user_ratings (user_id, anime_id, score) VALUES ($1,$2,$3)
      ON CONFLICT (user_id, anime_id) DO UPDATE SET score=$3, rated_at=NOW()
    `, [req.userId, id, score]);
    const r = await pool.query(
      "SELECT ROUND(AVG(score)::numeric,1) AS avg_rating, COUNT(*)::int AS rating_count FROM user_ratings WHERE anime_id=$1",
      [id]
    );
    res.json({ ok: true, ...r.rows[0], my_rating: score });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/anime/:id/comments ─────────────────────────────
router.post("/:id/comments", requireAuth, validate(schemas.comment), async (req, res) => {
  try {
    const { id } = req.params;
    const { body, parent_id, image_url } = req.body;

    // Получаем username родительского комментария (если есть)
    let parentUsername = null;
    if (parent_id) {
      const pq = await pool.query(
        "SELECT u.username FROM comments c JOIN users u ON u.id=c.user_id WHERE c.id=$1",
        [parent_id]
      );
      parentUsername = pq.rows[0]?.username || null;
    }

    const r = await pool.query(`
      INSERT INTO comments (user_id, anime_id, body, parent_id, image_url)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id, body, created_at, parent_id, image_url
    `, [req.userId, id, (body || "").trim(), parent_id || null, image_url || null]);

    const u = await pool.query("SELECT username, avatar_url FROM users WHERE id=$1", [req.userId]);
    res.json({ ...r.rows[0], username: u.rows[0].username, avatar_url: u.rows[0].avatar_url, user_id: req.userId, parent_username: parentUsername });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /api/anime/comments/:commentId — удалить комментарий (свой или модератор/админ)
router.delete("/comments/:commentId", requireAuth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const auth = req.headers.authorization;
    const p = require("jsonwebtoken").verify(auth.slice(7), process.env.JWT_SECRET);
    const isModAdmin = p.role === 1 || p.role === 2;
    const q = await pool.query("SELECT user_id FROM comments WHERE id=$1 AND is_deleted=FALSE", [commentId]);
    if (!q.rows[0]) return res.status(404).json({ error: "Комментарий не найден" });
    if (q.rows[0].user_id !== req.userId && !isModAdmin)
      return res.status(403).json({ error: "Нет доступа" });
    await pool.query("UPDATE comments SET is_deleted=TRUE WHERE id=$1", [commentId]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH /api/anime/comments/:commentId — редактировать (только автор, в течение 15 мин)
router.patch("/comments/:commentId", requireAuth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ error: "Пустой комментарий" });
    const q = await pool.query("SELECT user_id, created_at FROM comments WHERE id=$1 AND is_deleted=FALSE", [commentId]);
    if (!q.rows[0]) return res.status(404).json({ error: "Комментарий не найден" });
    if (q.rows[0].user_id !== req.userId) return res.status(403).json({ error: "Нет доступа" });
    const age = (Date.now() - new Date(q.rows[0].created_at).getTime()) / 1000 / 60;
    if (age > 15) return res.status(403).json({ error: "Редактирование доступно только в течение 15 минут после публикации" });
    const r = await pool.query(
      "UPDATE comments SET body=$1, updated_at=NOW() WHERE id=$2 RETURNING body, updated_at",
      [body.trim(), commentId]
    );
    res.json({ ok: true, ...r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/anime/:id/reviews ───────────────────────────────
router.post("/:id/reviews", requireAuth, validate(schemas.review), async (req, res) => {
  try {
    const { id } = req.params;
    const { score, title, body } = req.body;

    const r = await pool.query(`
      INSERT INTO reviews (user_id, anime_id, score, title, body)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (user_id, anime_id) DO UPDATE
        SET score=$3, title=$4, body=$5, updated_at=NOW(), is_deleted=FALSE
      RETURNING *
    `, [req.userId, id, score, title.trim(), body.trim()]);

    await pool.query(`
      INSERT INTO user_ratings (user_id, anime_id, score) VALUES ($1,$2,$3)
      ON CONFLICT (user_id, anime_id) DO UPDATE SET score=$3, rated_at=NOW()
    `, [req.userId, id, score]);

    const u = await pool.query("SELECT username FROM users WHERE id=$1", [req.userId]);
    res.json({ ...r.rows[0], username: u.rows[0].username, likes_count: 0, liked_by_me: false });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /api/anime/:id/reviews ────────────────────────────
router.delete("/:id/reviews", requireAuth, async (req, res) => {
  try {
    await pool.query(
      "UPDATE reviews SET is_deleted=TRUE WHERE user_id=$1 AND anime_id=$2",
      [req.userId, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/anime/reviews/:reviewId/like ────────────────────
router.post("/reviews/:reviewId/like", requireAuth, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const ex = await pool.query(
      "SELECT 1 FROM review_likes WHERE user_id=$1 AND review_id=$2",
      [req.userId, reviewId]
    );
    if (ex.rows.length > 0) {
      await pool.query("DELETE FROM review_likes WHERE user_id=$1 AND review_id=$2", [req.userId, reviewId]);
      await pool.query("UPDATE reviews SET helpful=helpful-1 WHERE id=$1", [reviewId]);
      res.json({ liked: false });
    } else {
      await pool.query("INSERT INTO review_likes (user_id, review_id) VALUES ($1,$2)", [req.userId, reviewId]);
      await pool.query("UPDATE reviews SET helpful=helpful+1 WHERE id=$1", [reviewId]);
      // Уведомление автору рецензии
      const rvAuthor = await pool.query("SELECT user_id, anime_id FROM reviews WHERE id=$1", [reviewId]);
      if (rvAuthor.rows[0]) {
        await createNotification(pool, {
          userId: rvAuthor.rows[0].user_id,
          actorId: req.userId,
          type: "review_like",
          reviewId: Number(reviewId),
          animeId: rvAuthor.rows[0].anime_id,
        });
      }
      res.json({ liked: true });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/anime/:id/staff — привязать автора к аниме ────
router.post("/:id/staff", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { staff_id, role } = req.body;
    if (!staff_id) return res.status(400).json({ error: "Укажите staff_id" });
    await pool.query(
      `INSERT INTO anime_staff (anime_id, staff_id, role)
       VALUES ($1,$2,$3) ON CONFLICT (anime_id, staff_id, role) DO NOTHING`,
      [id, staff_id, role?.trim() || "Director"]
    );
    const r = await pool.query(
      `SELECT st.id, st.name, st.name_jp, st.image_url, ast.role
       FROM staff st JOIN anime_staff ast ON ast.staff_id=st.id
       WHERE ast.anime_id=$1 AND ast.staff_id=$2`,
      [id, staff_id]
    );
    res.status(201).json(r.rows[0] || { ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /api/anime/:id/staff/:staffId ─────────────────────
router.delete("/:id/staff/:staffId", requireAdmin, async (req, res) => {
  try {
    const { id, staffId } = req.params;
    const { role } = req.body;
    const q = role
      ? await pool.query("DELETE FROM anime_staff WHERE anime_id=$1 AND staff_id=$2 AND role=$3", [id, staffId, role])
      : await pool.query("DELETE FROM anime_staff WHERE anime_id=$1 AND staff_id=$2", [id, staffId]);
    res.json({ ok: true, deleted: q.rowCount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/anime/:id/similar — похожие аниме (по жанрам + типу, исключая текущее и из той же серии)
router.get("/:id/similar", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: "Неверный id" });
  try {
    // Получаем жанры и тип текущего аниме
    const baseQ = await pool.query(
      `SELECT a.type, a.studio_id,
              COALESCE(array_agg(ag.genre_id) FILTER (WHERE ag.genre_id IS NOT NULL), '{}') AS genre_ids
       FROM anime a
       LEFT JOIN anime_genres ag ON ag.anime_id = a.id
       WHERE a.id = $1
       GROUP BY a.id`,
      [id]
    );
    if (!baseQ.rows[0]) return res.status(404).json({ error: "Аниме не найдено" });

    const { type, studio_id, genre_ids } = baseQ.rows[0];
    if (!genre_ids.length) return res.json([]);

    // Выбираем похожие: совпадение жанров (больше совпадений = выше), тот же тип приоритет
    const similar = await pool.query(
      `SELECT
         a.id, a.title, a.title_en, a.poster_url, a.status, a.type,
         a.episodes, a.aired_from,
         s.name AS studio_name,
         ROUND(AVG(ur.score)::numeric, 1) AS avg_rating,
         COUNT(DISTINCT ur.user_id)::int AS rating_count,
         COALESCE(JSON_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL), '[]') AS genres,
         -- score: совпавшие жанры * 3 + бонус за тип + бонус за студию
         (
           SELECT COUNT(*) FROM anime_genres ag2
           WHERE ag2.anime_id = a.id AND ag2.genre_id = ANY($2::int[])
         ) * 3
         + CASE WHEN a.type = $3 THEN 2 ELSE 0 END
         + CASE WHEN a.studio_id = $4 AND $4 IS NOT NULL THEN 1 ELSE 0 END
         AS relevance
       FROM anime a
       LEFT JOIN anim_studies s  ON s.id = a.studio_id
       LEFT JOIN anime_genres ag ON ag.anime_id = a.id
       LEFT JOIN genres       g  ON g.id = ag.genre_id
       LEFT JOIN user_ratings ur ON ur.anime_id = a.id
       WHERE a.id != $1
         AND a.id IN (
           SELECT DISTINCT ag3.anime_id FROM anime_genres ag3
           WHERE ag3.genre_id = ANY($2::int[])
         )
         -- Исключаем аниме из той же серии
         AND a.id NOT IN (
           SELECT ase2.anime_id FROM anime_series_entries ase2
           WHERE ase2.series_id IN (
             SELECT ase.series_id FROM anime_series_entries ase WHERE ase.anime_id = $1
           )
         )
       GROUP BY a.id, s.name
       HAVING (
         SELECT COUNT(*) FROM anime_genres ag2
         WHERE ag2.anime_id = a.id AND ag2.genre_id = ANY($2::int[])
       ) >= 1
       ORDER BY relevance DESC, avg_rating DESC NULLS LAST
       LIMIT 6`,
      [id, genre_ids, type, studio_id]
    );

    res.json(similar.rows);
  } catch (err) {
    console.error("similar anime error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
