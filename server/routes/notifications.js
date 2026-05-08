// server/routes/notifications.js
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
    req.roleId = p.role;
    next();
  } catch { res.status(401).json({ error: "Токен недействителен" }); }
}

// ── Хелпер: создать уведомление (вызывается из других роутов) ─
async function createNotification(pool, { userId, actorId, type, animeId, commentId, reviewId, characterId }) {
  // Не уведомляем самого себя
  if (userId === actorId) return;
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, actor_id, type, anime_id, comment_id, review_id, character_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [userId, actorId || null, type, animeId || null, commentId || null, reviewId || null, characterId || null]
    );
  } catch (e) {
    console.error("Notification insert error:", e.message);
  }
}

// ── GET /api/notifications — мои уведомления ─────────────────
router.get("/", requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, unread_only } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const conds = ["n.user_id = $1"];
    const params = [req.userId];
    let i = 2;
    if (unread_only === "true") { conds.push("n.is_read = FALSE"); }

    const [countRow, rows] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM notifications n WHERE ${conds.join(" AND ")}`, params),
      pool.query(`
        SELECT
          n.id, n.type, n.is_read, n.created_at,
          n.anime_id, n.comment_id, n.review_id, n.character_id,
          n.episode_number, n.body AS notification_body,
          -- актор
          u.id   AS actor_id,
          u.username AS actor_username,
          u.avatar_url AS actor_avatar,
          -- аниме
          a.title AS anime_title,
          a.poster_url AS anime_poster,
          -- рецензия
          r.title AS review_title,
          -- комментарий (первые 80 символов)
          LEFT(c.body, 80) AS comment_preview
        FROM notifications n
        LEFT JOIN users u    ON u.id = n.actor_id
        LEFT JOIN anime a    ON a.id = n.anime_id
        LEFT JOIN reviews r  ON r.id = n.review_id
        LEFT JOIN comments c ON c.id = n.comment_id
        WHERE ${conds.join(" AND ")}
        ORDER BY n.created_at DESC
        LIMIT $${i} OFFSET $${i+1}
      `, [...params, Number(limit), offset]),
    ]);

    res.json({ items: rows.rows, total: countRow.rows[0].total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/notifications/unread-count ───────────────────────
router.get("/unread-count", requireAuth, async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT COUNT(*)::int AS count FROM notifications WHERE user_id=$1 AND is_read=FALSE",
      [req.userId]
    );
    res.json({ count: r.rows[0].count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/notifications/read-all — прочитать все ────────
router.patch("/read-all", requireAuth, async (req, res) => {
  try {
    await pool.query(
      "UPDATE notifications SET is_read=TRUE WHERE user_id=$1 AND is_read=FALSE",
      [req.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/notifications/:id/read — прочитать одно ───────
router.patch("/:id/read", requireAuth, async (req, res) => {
  try {
    await pool.query(
      "UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2",
      [req.params.id, req.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/notifications/:id ────────────────────────────
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM notifications WHERE id=$1 AND user_id=$2",
      [req.params.id, req.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.createNotification = createNotification;
