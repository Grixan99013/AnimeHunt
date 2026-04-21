// server/routes/anime.js
const router = require("express").Router();
const pool   = require("../db");
const jwt    = require("jsonwebtoken");
const { requireAdmin } = require("../middleware/admin");

function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    try { req.userId = jwt.verify(auth.slice(7), process.env.JWT_SECRET).id; } catch {}
  }
  next();
}
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer "))
    return res.status(401).json({ error: "Не авторизован" });
  try { req.userId = jwt.verify(auth.slice(7), process.env.JWT_SECRET).id; next(); }
  catch { res.status(401).json({ error: "Токен недействителен" }); }
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

// ── POST /api/anime — добавление (только админ) ─────────────────
router.post("/", requireAdmin, async (req, res) => {
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
    await client.query("COMMIT");
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
router.put("/:id", requireAdmin, async (req, res) => {
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
    await client.query("COMMIT");
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
    const { q, status, type, sort, genre, studio, theme, is_new, series, limit=100, offset=0 } = req.query;
    const conds = ["1=1"];
    const params = [];
    let i = 1;

    if (q)      { conds.push(`(a.title ILIKE $${i} OR a.title_en ILIKE $${i} OR a.title_jp ILIKE $${i})`); params.push(`%${q}%`); i++; }
    if (status) { conds.push(`a.status = $${i}`); params.push(status); i++; }
    if (type)   { conds.push(`a.type = $${i}`);   params.push(type);   i++; }
    if (is_new === "true") conds.push("a.is_new = TRUE");
    if (genre)  {
      conds.push(`a.id IN (SELECT ag.anime_id FROM anime_genres ag JOIN genres g ON g.id = ag.genre_id WHERE g.name = $${i})`);
      params.push(genre); i++;
    }
    if (theme) {
      conds.push(`a.id IN (SELECT anime_id FROM anime_themes WHERE theme = $${i})`);
      params.push(theme); i++;
    }
    if (studio) { conds.push(`s.name = $${i}`); params.push(studio); i++; }
    if (series) {
      conds.push(`a.id IN (SELECT anime_id FROM anime_series_entries WHERE series_id = $${i})`);
      params.push(series); i++;
    }

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
    res.json((await pool.query(sql, params)).rows);
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
router.post("/:id/rate", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { score } = req.body;
    if (!score || score < 1 || score > 10)
      return res.status(400).json({ error: "Оценка 1-10" });
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
router.post("/:id/comments", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { body, parent_id, image_url } = req.body;
    if (!body?.trim() && !image_url) return res.status(400).json({ error: "Пустой комментарий" });

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

// ── POST /api/anime/:id/reviews ───────────────────────────────
router.post("/:id/reviews", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { score, title, body } = req.body;
    if (!score || score < 1 || score > 10)
      return res.status(400).json({ error: "Оценка 1-10" });
    if (!title?.trim())
      return res.status(400).json({ error: "Укажите заголовок" });
    if (!body?.trim() || body.trim().length < 100)
      return res.status(400).json({ error: "Рецензия должна быть не менее 100 символов" });

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
      res.json({ liked: true });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
