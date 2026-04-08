// server/routes/seasons.js
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
  try { req.userId = jwt.verify(auth.slice(7), process.env.JWT_SECRET).id; next(); }
  catch { res.status(401).json({ error: "Токен недействителен" }); }
}

// GET /api/seasons/:id
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const seasonQ = await pool.query(`
      SELECT s.*,
        a.id AS anime_id, a.title AS anime_title,
        a.title_jp AS anime_title_jp,
        a.poster_url AS anime_poster,
        a.status AS anime_status, a.type AS anime_type,
        st.name AS studio_name
      FROM seasons s
      JOIN anime a ON a.id = s.anime_id
      LEFT JOIN anim_studies st ON st.id = a.studio_id
      WHERE s.id = $1
    `, [id]);

    if (!seasonQ.rows[0]) return res.status(404).json({ error: "Сезон не найден" });
    const season = seasonQ.rows[0];

    const [chars, allSeasons, comments, ratingQ, myRatingQ] = await Promise.all([
      pool.query(`
        SELECT id, name, name_jp, role, image_url, description
        FROM characters WHERE anime_id=$1
        ORDER BY CASE role WHEN 'main' THEN 0 ELSE 1 END
      `, [season.anime_id]),

      pool.query(`
        SELECT id, season_num, title, episodes, aired_from
        FROM seasons WHERE anime_id=$1 ORDER BY season_num
      `, [season.anime_id]),

      pool.query(`
        SELECT c.id, c.body, c.created_at, c.parent_id,
               u.username, u.id AS user_id
        FROM season_comments c
        JOIN users u ON u.id = c.user_id
        WHERE c.season_id=$1 AND c.is_deleted=FALSE
        ORDER BY c.created_at DESC
      `, [id]),

      pool.query(`
        SELECT ROUND(AVG(score)::numeric,1) AS avg_rating,
               COUNT(*)::int AS rating_count
        FROM season_ratings WHERE season_id=$1
      `, [id]),

      req.userId ? pool.query(
        "SELECT score FROM season_ratings WHERE user_id=$1 AND season_id=$2",
        [req.userId, id]
      ) : Promise.resolve({ rows: [] }),
    ]);

    res.json({
      ...season,
      characters:  chars.rows,
      all_seasons: allSeasons.rows,
      comments:    comments.rows,
      avg_rating:  ratingQ.rows[0].avg_rating,
      rating_count: ratingQ.rows[0].rating_count,
      my_rating:   myRatingQ.rows[0]?.score ?? null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/seasons/anime/:animeId
router.get("/anime/:animeId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM seasons WHERE anime_id=$1 ORDER BY season_num",
      [req.params.animeId]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/seasons/:id/rate
router.post("/:id/rate", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { score } = req.body;
    if (!score || score < 1 || score > 10)
      return res.status(400).json({ error: "Оценка от 1 до 10" });

    await pool.query(`
      INSERT INTO season_ratings (user_id, season_id, score)
      VALUES ($1,$2,$3)
      ON CONFLICT (user_id, season_id) DO UPDATE SET score=$3, rated_at=NOW()
    `, [req.userId, id, score]);

    const r = await pool.query(`
      SELECT ROUND(AVG(score)::numeric,1) AS avg_rating, COUNT(*)::int AS rating_count
      FROM season_ratings WHERE season_id=$1
    `, [id]);

    res.json({ ok: true, ...r.rows[0], my_rating: score });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/seasons/:id/comments
router.post("/:id/comments", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { body, parent_id } = req.body;
    if (!body?.trim()) return res.status(400).json({ error: "Пустой комментарий" });

    const result = await pool.query(`
      INSERT INTO season_comments (user_id, season_id, body, parent_id)
      VALUES ($1,$2,$3,$4) RETURNING id, body, created_at, parent_id
    `, [req.userId, id, body.trim(), parent_id || null]);

    const userQ = await pool.query("SELECT username FROM users WHERE id=$1", [req.userId]);
    res.json({ ...result.rows[0], username: userQ.rows[0].username, user_id: req.userId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
