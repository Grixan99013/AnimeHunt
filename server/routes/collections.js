// server/routes/collections.js
const router = require("express").Router();
const pool   = require("../db");
const jwt    = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer "))
    return res.status(401).json({ error: "Не авторизован" });
  try {
    const p = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    req.userId = p.id;
    next();
  } catch { res.status(401).json({ error: "Токен недействителен" }); }
}

function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    try { req.userId = jwt.verify(auth.slice(7), process.env.JWT_SECRET).id; } catch {}
  }
  next();
}

// ── GET /api/collections?user_id=&username=&page=1 ───────────
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { user_id, username, page = 1, limit = 12 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let targetUserId = user_id ? Number(user_id) : null;
    if (!targetUserId && username) {
      const u = await pool.query("SELECT id FROM users WHERE username=$1", [username]);
      if (!u.rows[0]) return res.status(404).json({ error: "Пользователь не найден" });
      targetUserId = u.rows[0].id;
    }

    const isOwner = targetUserId && req.userId === targetUserId;
    const conds = targetUserId
      ? ["c.user_id = $1", isOwner ? "TRUE" : "c.is_public = TRUE"]
      : ["c.is_public = TRUE"];
    const params = targetUserId ? [targetUserId] : [];
    let i = params.length + 1;

    const [countRow, rows] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM collections c WHERE ${conds.join(" AND ")}`, params),
      pool.query(`
        SELECT c.id, c.title, c.description, c.is_public, c.cover_url, c.created_at, c.updated_at,
               u.username AS author_username, u.avatar_url AS author_avatar,
               (SELECT COUNT(*)::int FROM collection_items WHERE collection_id=c.id) AS anime_count,
               -- первые 4 постера
               (SELECT JSON_AGG(poster) FROM (
                  SELECT a.poster_url AS poster FROM collection_items ci
                  JOIN anime a ON a.id=ci.anime_id
                  WHERE ci.collection_id=c.id
                  ORDER BY ci.sort_order LIMIT 4
               ) _p) AS preview_posters
        FROM collections c
        JOIN users u ON u.id=c.user_id
        WHERE ${conds.join(" AND ")}
        ORDER BY c.updated_at DESC
        LIMIT $${i} OFFSET $${i+1}
      `, [...params, Number(limit), offset]),
    ]);

    res.json({ items: rows.rows, total: countRow.rows[0].total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/collections/:id ──────────────────────────────────
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const r = await pool.query(
      `SELECT c.*, u.username AS author_username, u.avatar_url AS author_avatar
       FROM collections c JOIN users u ON u.id=c.user_id WHERE c.id=$1`,
      [id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Коллекция не найдена" });
    const col = r.rows[0];
    const isOwner = req.userId === col.user_id;
    if (!col.is_public && !isOwner)
      return res.status(403).json({ error: "Коллекция приватная" });

    const items = await pool.query(`
      SELECT ci.sort_order, ci.note, ci.added_at,
             a.id, a.title, a.title_jp, a.poster_url, a.status, a.type, a.episodes,
             ROUND(AVG(ur.score)::numeric,1) AS avg_rating
      FROM collection_items ci
      JOIN anime a ON a.id=ci.anime_id
      LEFT JOIN user_ratings ur ON ur.anime_id=a.id
      WHERE ci.collection_id=$1
      GROUP BY ci.sort_order, ci.note, ci.added_at, a.id
      ORDER BY ci.sort_order ASC, ci.added_at DESC
    `, [id]);

    res.json({ ...col, is_owner: isOwner, items: items.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/collections — создать ──────────────────────────
router.post("/", requireAuth, async (req, res) => {
  try {
    const { title, description, is_public = true, cover_url } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: "Укажите название" });
    if (title.length > 200) return res.status(400).json({ error: "Название не более 200 символов" });
    const r = await pool.query(
      `INSERT INTO collections (user_id, title, description, is_public, cover_url)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.userId, title.trim(), description?.trim()||null, !!is_public, cover_url?.trim()||null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/collections/:id — редактировать ───────────────
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, is_public, cover_url } = req.body;
    const own = await pool.query("SELECT user_id FROM collections WHERE id=$1", [id]);
    if (!own.rows[0]) return res.status(404).json({ error: "Не найдена" });
    if (own.rows[0].user_id !== req.userId) return res.status(403).json({ error: "Нет доступа" });
    const r = await pool.query(
      `UPDATE collections SET
        title=$1, description=$2, is_public=$3, cover_url=$4, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [title?.trim(), description?.trim()||null, !!is_public, cover_url?.trim()||null, id]
    );
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/collections/:id ───────────────────────────────
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const own = await pool.query("SELECT user_id FROM collections WHERE id=$1", [id]);
    if (!own.rows[0]) return res.status(404).json({ error: "Не найдена" });
    if (own.rows[0].user_id !== req.userId) return res.status(403).json({ error: "Нет доступа" });
    await pool.query("DELETE FROM collections WHERE id=$1", [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/collections/:id/items — добавить аниме ─────────
router.post("/:id/items", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { anime_id, note, sort_order } = req.body;
    if (!anime_id) return res.status(400).json({ error: "Укажите anime_id" });
    const own = await pool.query("SELECT user_id FROM collections WHERE id=$1", [id]);
    if (!own.rows[0]) return res.status(404).json({ error: "Коллекция не найдена" });
    if (own.rows[0].user_id !== req.userId) return res.status(403).json({ error: "Нет доступа" });

    // Получаем max sort_order если не указан
    let order = sort_order;
    if (order == null) {
      const maxQ = await pool.query(
        "SELECT COALESCE(MAX(sort_order),0)+1 AS next FROM collection_items WHERE collection_id=$1", [id]
      );
      order = maxQ.rows[0].next;
    }

    await pool.query(
      `INSERT INTO collection_items (collection_id, anime_id, sort_order, note)
       VALUES ($1,$2,$3,$4) ON CONFLICT (collection_id, anime_id) DO UPDATE SET note=$4`,
      [id, anime_id, order, note?.trim()||null]
    );
    await pool.query("UPDATE collections SET updated_at=NOW() WHERE id=$1", [id]);
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/collections/:id/items/:animeId ───────────────
router.delete("/:id/items/:animeId", requireAuth, async (req, res) => {
  try {
    const { id, animeId } = req.params;
    const own = await pool.query("SELECT user_id FROM collections WHERE id=$1", [id]);
    if (!own.rows[0]) return res.status(404).json({ error: "Не найдена" });
    if (own.rows[0].user_id !== req.userId) return res.status(403).json({ error: "Нет доступа" });
    await pool.query(
      "DELETE FROM collection_items WHERE collection_id=$1 AND anime_id=$2",
      [id, animeId]
    );
    await pool.query("UPDATE collections SET updated_at=NOW() WHERE id=$1", [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
