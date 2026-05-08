// server/routes/news.js
const router = require("express").Router();
const pool   = require("../db");
const jwt    = require("jsonwebtoken");

// role 1 = admin, 2 = moderator
function requireModOrAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer "))
    return res.status(401).json({ error: "Не авторизован" });
  try {
    const p = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    if (p.role !== 1 && p.role !== 2)
      return res.status(403).json({ error: "Только для модераторов и администраторов" });
    req.userId = p.id;
    req.userRole = p.role;
    next();
  } catch { res.status(401).json({ error: "Токен недействителен" }); }
}

// GET /api/news?limit=6&page=1
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 6 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const [countRow, rows] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS total FROM news WHERE is_published=TRUE"),
      pool.query(`
        SELECT n.id, n.title, n.body, n.cover_url, n.created_at,
               u.username AS author_username, u.avatar_url AS author_avatar
        FROM news n
        LEFT JOIN users u ON u.id = n.author_id
        WHERE n.is_published = TRUE
        ORDER BY n.created_at DESC
        LIMIT $1 OFFSET $2
      `, [Number(limit), offset]),
    ]);
    res.json({ items: rows.rows, total: countRow.rows[0].total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/news/:id
router.get("/:id", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT n.*, u.username AS author_username, u.avatar_url AS author_avatar
       FROM news n LEFT JOIN users u ON u.id=n.author_id
       WHERE n.id=$1 AND n.is_published=TRUE`,
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Новость не найдена" });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/news (admin)
router.post("/", requireModOrAdmin, async (req, res) => {
  try {
    const { title, body, cover_url, is_published = true } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: "Укажите заголовок" });
    if (!body?.trim())  return res.status(400).json({ error: "Укажите текст" });
    const r = await pool.query(
      `INSERT INTO news (title, body, cover_url, author_id, is_published)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [title.trim(), body.trim(), cover_url?.trim()||null, req.userId, !!is_published]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/news/:id (admin)
router.patch("/:id", requireModOrAdmin, async (req, res) => {
  try {
    const { title, body, cover_url, is_published } = req.body;
    const r = await pool.query(
      `UPDATE news SET title=$1, body=$2, cover_url=$3, is_published=$4, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [title?.trim(), body?.trim(), cover_url?.trim()||null, !!is_published, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Не найдена" });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/news/:id (admin)
router.delete("/:id", requireModOrAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM news WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
