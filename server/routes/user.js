// server/routes/user.js
const router = require("express").Router();
const pool   = require("../db");
const jwt    = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer "))
    return res.status(401).json({ error: "Не авторизован" });
  try {
    req.userId = jwt.verify(auth.slice(7), process.env.JWT_SECRET).id;
    next();
  } catch { res.status(401).json({ error: "Токен недействителен" }); }
}

// GET /api/user/comments
router.get("/comments", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.body, c.created_at, a.title AS anime_title, a.id AS anime_id
      FROM comments c
      JOIN anime a ON a.id = c.anime_id
      WHERE c.user_id=$1 AND c.is_deleted=FALSE
      ORDER BY c.created_at DESC
    `, [req.userId]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/user/ratings
router.get("/ratings", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ur.score, ur.rated_at, a.id, a.title, a.poster_url
      FROM user_ratings ur
      JOIN anime a ON a.id = ur.anime_id
      WHERE ur.user_id=$1
      ORDER BY ur.rated_at DESC
    `, [req.userId]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/user/favorites — избранные персонажи
router.get("/favorites", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (c.id)
        c.id, c.name, c.name_jp, c.role, c.image_url, c.description,
        a.id AS anime_id, a.title AS anime_title, a.poster_url AS anime_poster,
        f.added_at
      FROM favorites f
      JOIN characters c ON c.id = f.character_id
      JOIN character_appearances ca ON ca.character_id = c.id
      JOIN anime a ON a.id = ca.anime_id
      WHERE f.user_id=$1
      ORDER BY c.id, a.aired_from ASC NULLS LAST
    `, [req.userId]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

// GET /api/user/reviews — мои рецензии
router.get("/reviews", requireAuth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT rv.id, rv.score, rv.title, rv.body, rv.created_at,
             a.id AS anime_id, a.title AS anime_title, a.poster_url AS anime_poster
      FROM reviews rv
      JOIN anime a ON a.id=rv.anime_id
      WHERE rv.user_id=$1 AND rv.is_deleted=FALSE
      ORDER BY rv.created_at DESC
    `, [req.userId]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
