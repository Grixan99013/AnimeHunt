// server/routes/user.js
// /api/user/* — данные текущего пользователя
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
  } catch {
    res.status(401).json({ error: "Токен недействителен" });
  }
}

// GET /api/user/comments — мои комментарии
router.get("/comments", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id, c.body, c.created_at,
        a.title AS anime_title, a.id AS anime_id
      FROM comments c
      JOIN anime a ON a.id = c.anime_id
      WHERE c.user_id = $1 AND c.is_deleted = FALSE
      ORDER BY c.created_at DESC
    `, [req.userId]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/user/ratings — мои оценки
router.get("/ratings", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ur.score, ur.rated_at, a.id, a.title, a.poster_url
      FROM user_ratings ur
      JOIN anime a ON a.id = ur.anime_id
      WHERE ur.user_id = $1
      ORDER BY ur.rated_at DESC
    `, [req.userId]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
