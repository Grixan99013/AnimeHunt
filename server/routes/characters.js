// server/routes/characters.js
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

// GET /api/characters/:id
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const charQ = await pool.query(`
      SELECT c.*,
        a.id AS anime_id, a.title AS anime_title,
        a.title_jp AS anime_title_jp, a.poster_url AS anime_poster
      FROM characters c
      JOIN anime a ON a.id = c.anime_id
      WHERE c.id = $1
    `, [id]);

    if (!charQ.rows[0]) return res.status(404).json({ error: "Персонаж не найден" });
    const char = charQ.rows[0];

    const [seiyuQ, commentsQ, favQ] = await Promise.all([
      pool.query(`
        SELECT s.*, cs.language FROM seiyu s
        JOIN character_seiyu cs ON cs.seiyu_id = s.id
        WHERE cs.character_id=$1
      `, [id]),

      pool.query(`
        SELECT c.id, c.body, c.created_at, c.parent_id,
               u.username, u.id AS user_id
        FROM character_comments c
        JOIN users u ON u.id = c.user_id
        WHERE c.character_id=$1 AND c.is_deleted=FALSE
        ORDER BY c.created_at DESC
      `, [id]),

      req.userId
        ? pool.query("SELECT 1 FROM favorites WHERE user_id=$1 AND character_id=$2", [req.userId, id])
        : Promise.resolve({ rows: [] }),
    ]);

    res.json({
      ...char,
      seiyu:       seiyuQ.rows,
      comments:    commentsQ.rows,
      is_favorite: favQ.rows.length > 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/characters/:id/favorite
router.post("/:id/favorite", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query(
      "SELECT 1 FROM favorites WHERE user_id=$1 AND character_id=$2",
      [req.userId, id]
    );
    if (existing.rows.length > 0) {
      await pool.query("DELETE FROM favorites WHERE user_id=$1 AND character_id=$2", [req.userId, id]);
      res.json({ is_favorite: false });
    } else {
      await pool.query("INSERT INTO favorites (user_id, character_id) VALUES ($1,$2)", [req.userId, id]);
      res.json({ is_favorite: true });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/characters/:id/comments
router.post("/:id/comments", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { body, parent_id } = req.body;
    if (!body?.trim()) return res.status(400).json({ error: "Пустой комментарий" });

    const result = await pool.query(`
      INSERT INTO character_comments (user_id, character_id, body, parent_id)
      VALUES ($1,$2,$3,$4) RETURNING id, body, created_at, parent_id
    `, [req.userId, id, body.trim(), parent_id || null]);

    const userQ = await pool.query("SELECT username FROM users WHERE id=$1", [req.userId]);
    res.json({ ...result.rows[0], username: userQ.rows[0].username, user_id: req.userId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
