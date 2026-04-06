// server/routes/anime.js
const router = require("express").Router();
const pool   = require("../db");
const jwt    = require("jsonwebtoken");

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
  try {
    req.userId = jwt.verify(auth.slice(7), process.env.JWT_SECRET).id;
    next();
  } catch {
    res.status(401).json({ error: "Токен недействителен" });
  }
}

// ── GET /api/anime/genres ────────────────────────────────────
// ВАЖНО: статические роуты ПЕРЕД /:id
router.get("/genres", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM genres ORDER BY name");
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/anime ───────────────────────────────────────────
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { q, status, type, sort, genre, is_new, limit = 100, offset = 0 } = req.query;

    const conditions = ["1=1"];
    const params = [];
    let i = 1;

    if (q) {
      conditions.push(`(a.title ILIKE $${i} OR a.title_en ILIKE $${i} OR a.title_jp ILIKE $${i})`);
      params.push(`%${q}%`); i++;
    }
    if (status) { conditions.push(`a.status = $${i}`); params.push(status); i++; }
    if (type)   { conditions.push(`a.type = $${i}`);   params.push(type);   i++; }
    if (is_new === "true") { conditions.push("a.is_new = TRUE"); }
    if (genre) {
      conditions.push(`a.id IN (
        SELECT ag.anime_id FROM anime_genres ag
        JOIN genres g ON g.id = ag.genre_id WHERE g.name = $${i}
      )`);
      params.push(genre); i++;
    }

    const myRatingSelect = req.userId
      ? `, (SELECT score FROM user_ratings WHERE user_id=$${i++} AND anime_id=a.id) AS my_rating`
      : "";
    if (req.userId) params.push(req.userId);

    let orderBy = "a.title ASC";
    if (sort === "rating") orderBy = "avg_rating DESC NULLS LAST";
    if (sort === "newest") orderBy = "a.aired_from DESC NULLS LAST";

    params.push(Number(limit), Number(offset));
    const limitIdx  = i++;
    const offsetIdx = i++;

    const sql = `
      SELECT
        a.id, a.title, a.title_en, a.title_jp, a.synopsis,
        a.poster_url, a.banner_url, a.status, a.type,
        a.episodes, a.duration_min, a.aired_from, a.aired_to,
        a.is_new, a.studio_id,
        s.name AS studio_name,
        COALESCE(JSON_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL), '[]') AS genres,
        ROUND(AVG(ur.score)::numeric, 1) AS avg_rating,
        COUNT(DISTINCT ur.user_id)::int  AS rating_count
        ${myRatingSelect}
      FROM anime a
      LEFT JOIN anim_studies   s  ON s.id = a.studio_id
      LEFT JOIN anime_genres   ag ON ag.anime_id = a.id
      LEFT JOIN genres         g  ON g.id = ag.genre_id
      LEFT JOIN user_ratings   ur ON ur.anime_id = a.id
      WHERE ${conditions.join(" AND ")}
      GROUP BY a.id, s.name
      ORDER BY ${orderBy}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/anime/:id ───────────────────────────────────────
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(Number(id))) return res.status(400).json({ error: "Неверный id" });

    const myRatingSelect = req.userId
      ? `, (SELECT score FROM user_ratings WHERE user_id=$2 AND anime_id=a.id) AS my_rating`
      : "";
    const queryParams = req.userId ? [id, req.userId] : [id];

    const animeQ = await pool.query(`
      SELECT
        a.*,
        s.name AS studio_name,
        COALESCE(JSON_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL), '[]') AS genres,
        ROUND(AVG(ur.score)::numeric, 1) AS avg_rating,
        COUNT(DISTINCT ur.user_id)::int  AS rating_count
        ${myRatingSelect}
      FROM anime a
      LEFT JOIN anim_studies s  ON s.id = a.studio_id
      LEFT JOIN anime_genres ag ON ag.anime_id = a.id
      LEFT JOIN genres       g  ON g.id = ag.genre_id
      LEFT JOIN user_ratings ur ON ur.anime_id = a.id
      WHERE a.id = $1
      GROUP BY a.id, s.name
    `, queryParams);

    if (!animeQ.rows[0]) return res.status(404).json({ error: "Не найдено" });

    const [seasons, characters, staffQ, comments] = await Promise.all([
      pool.query(
        "SELECT * FROM seasons WHERE anime_id=$1 ORDER BY season_num", [id]
      ),
      pool.query(
        "SELECT * FROM characters WHERE anime_id=$1 ORDER BY CASE role WHEN 'main' THEN 0 ELSE 1 END", [id]
      ),
      pool.query(`
        SELECT st.id, st.name, st.name_jp, st.bio, st.image_url, ast.role AS anime_role
        FROM staff st
        JOIN anime_staff ast ON ast.staff_id = st.id
        WHERE ast.anime_id = $1
      `, [id]),
      pool.query(`
        SELECT c.id, c.body, c.created_at, c.parent_id,
               u.username, u.id AS user_id
        FROM comments c
        JOIN users u ON u.id = c.user_id
        WHERE c.anime_id = $1 AND c.is_deleted = FALSE
        ORDER BY c.created_at DESC
      `, [id]),
    ]);

    res.json({
      ...animeQ.rows[0],
      seasons:    seasons.rows,
      characters: characters.rows,
      staff:      staffQ.rows,
      comments:   comments.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/anime/:id/rate ─────────────────────────────────
router.post("/:id/rate", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { score } = req.body;
    if (!score || score < 1 || score > 10)
      return res.status(400).json({ error: "Оценка от 1 до 10" });

    await pool.query(`
      INSERT INTO user_ratings (user_id, anime_id, score)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, anime_id) DO UPDATE SET score=$3, rated_at=NOW()
    `, [req.userId, id, score]);

    const r = await pool.query(`
      SELECT ROUND(AVG(score)::numeric,1) AS avg_rating,
             COUNT(*)::int AS rating_count
      FROM user_ratings WHERE anime_id=$1
    `, [id]);

    res.json({ ok: true, ...r.rows[0], my_rating: score });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/anime/:id/comments ─────────────────────────────
router.post("/:id/comments", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { body, parent_id } = req.body;
    if (!body?.trim()) return res.status(400).json({ error: "Комментарий пустой" });

    const result = await pool.query(`
      INSERT INTO comments (user_id, anime_id, body, parent_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, body, created_at, parent_id
    `, [req.userId, id, body.trim(), parent_id || null]);

    const userQ = await pool.query(
      "SELECT username FROM users WHERE id=$1", [req.userId]
    );

    res.json({
      ...result.rows[0],
      username: userQ.rows[0].username,
      user_id: req.userId,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
