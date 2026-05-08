// server/routes/admin.js
// Административные роуты: пользователи, жанры, студии, удаление аниме, очередь медиа
const router = require("express").Router();
const pool   = require("../db");
const { requireAdmin } = require("../middleware/admin");
const { validate, schemas } = require("../middleware/validate");

// Все роуты требуют прав администратора
router.use(requireAdmin);

// ════════════════════════════════════════════════════════════════
// ПОЛЬЗОВАТЕЛИ
// ════════════════════════════════════════════════════════════════

// GET /api/admin/users?q=&page=1&limit=30
router.get("/users", async (req, res) => {
  try {
    const { q, page = 1, limit = 30 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const conds = ["1=1"];
    const params = [];
    let i = 1;

    if (q) {
      conds.push(`(u.username ILIKE $${i} OR u.email ILIKE $${i})`);
      params.push(`%${q}%`);
      i++;
    }

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM users u
      WHERE ${conds.join(" AND ")}
    `;
    const dataSql = `
      SELECT u.id, u.username, u.email, u.role_id, u.is_active,
             u.avatar_url, u.created_at,
             r.name AS role_name,
             (SELECT COUNT(*)::int FROM comments   WHERE user_id = u.id AND is_deleted = FALSE) AS comment_count,
             (SELECT COUNT(*)::int FROM reviews    WHERE user_id = u.id AND is_deleted = FALSE) AS review_count,
             (SELECT COUNT(*)::int FROM user_ratings WHERE user_id = u.id) AS rating_count
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE ${conds.join(" AND ")}
      ORDER BY u.created_at DESC
      LIMIT $${i} OFFSET $${i + 1}
    `;

    const [countRow, dataRows] = await Promise.all([
      pool.query(countSql, params),
      pool.query(dataSql, [...params, Number(limit), offset]),
    ]);

    res.json({ items: dataRows.rows, total: countRow.rows[0].total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/users/:id/role — сменить роль
router.patch("/users/:id/role", validate(schemas.userRole), async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(+id)) return res.status(400).json({ error: "Неверный id" });
    if (Number(id) === req.userId) return res.status(400).json({ error: "Нельзя менять собственную роль" });

    const { role_id } = req.body;
    const r = await pool.query(
      "UPDATE users SET role_id=$1, updated_at=NOW() WHERE id=$2 RETURNING id, username, role_id",
      [role_id, id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Пользователь не найден" });
    res.json({ ok: true, ...r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/users/:id/ban — заблокировать / разблокировать
router.patch("/users/:id/ban", async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(+id)) return res.status(400).json({ error: "Неверный id" });
    if (Number(id) === req.userId) return res.status(400).json({ error: "Нельзя заблокировать себя" });

    const cur = await pool.query("SELECT is_active FROM users WHERE id=$1", [id]);
    if (!cur.rows[0]) return res.status(404).json({ error: "Пользователь не найден" });

    const newStatus = !cur.rows[0].is_active;
    await pool.query("UPDATE users SET is_active=$1, updated_at=NOW() WHERE id=$2", [newStatus, id]);
    res.json({ ok: true, is_active: newStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// ЖАНРЫ
// ════════════════════════════════════════════════════════════════

// GET /api/admin/genres
router.get("/genres", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT g.id, g.name,
             COUNT(ag.anime_id)::int AS anime_count
      FROM genres g
      LEFT JOIN anime_genres ag ON ag.genre_id = g.id
      GROUP BY g.id
      ORDER BY g.name
    `);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/genres
router.post("/genres", validate(schemas.genre), async (req, res) => {
  try {
    const { name } = req.body;
    const r = await pool.query(
      "INSERT INTO genres (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *",
      [name]
    );
    if (!r.rows[0]) return res.status(409).json({ error: "Жанр с таким названием уже существует" });
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/genres/:id
router.patch("/genres/:id", validate(schemas.genre), async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(+id)) return res.status(400).json({ error: "Неверный id" });
    const { name } = req.body;
    const r = await pool.query(
      "UPDATE genres SET name=$1 WHERE id=$2 RETURNING *",
      [name, id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Жанр не найден" });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/admin/genres/:id
router.delete("/genres/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(+id)) return res.status(400).json({ error: "Неверный id" });
    const r = await pool.query("DELETE FROM genres WHERE id=$1 RETURNING id", [id]);
    if (!r.rows[0]) return res.status(404).json({ error: "Жанр не найден" });
    res.json({ ok: true, id: Number(id) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// СТУДИИ
// ════════════════════════════════════════════════════════════════

// GET /api/admin/studios
router.get("/studios", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT s.id, s.name, s.country,
             COUNT(a.id)::int AS anime_count
      FROM anim_studies s
      LEFT JOIN anime a ON a.studio_id = s.id
      GROUP BY s.id
      ORDER BY s.name
    `);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/studios
router.post("/studios", validate(schemas.studio), async (req, res) => {
  try {
    const { name, country } = req.body;
    const r = await pool.query(
      "INSERT INTO anim_studies (name, country) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING RETURNING *",
      [name, country || null]
    );
    if (!r.rows[0]) return res.status(409).json({ error: "Студия с таким названием уже существует" });
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/studios/:id
router.patch("/studios/:id", validate(schemas.studio), async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(+id)) return res.status(400).json({ error: "Неверный id" });
    const { name, country } = req.body;
    const r = await pool.query(
      "UPDATE anim_studies SET name=$1, country=$2 WHERE id=$3 RETURNING *",
      [name, country || null, id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Студия не найдена" });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/admin/studios/:id
router.delete("/studios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(+id)) return res.status(400).json({ error: "Неверный id" });
    // Обнуляем studio_id у аниме перед удалением
    await pool.query("UPDATE anime SET studio_id=NULL WHERE studio_id=$1", [id]);
    const r = await pool.query("DELETE FROM anim_studies WHERE id=$1 RETURNING id", [id]);
    if (!r.rows[0]) return res.status(404).json({ error: "Студия не найдена" });
    res.json({ ok: true, id: Number(id) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// УДАЛЕНИЕ АНИМЕ (каскад)
// ════════════════════════════════════════════════════════════════

// DELETE /api/admin/anime/:id
router.delete("/anime/:id", async (req, res) => {
  const { id } = req.params;
  if (isNaN(+id)) return res.status(400).json({ error: "Неверный id" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Проверяем существование
    const ex = await client.query("SELECT title FROM anime WHERE id=$1", [id]);
    if (!ex.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Аниме не найдено" });
    }

    // Каскадное удаление (порядок важен для FK без ON DELETE CASCADE)
    await client.query("DELETE FROM anime_genres         WHERE anime_id=$1", [id]);
    await client.query("DELETE FROM anime_themes         WHERE anime_id=$1", [id]);
    await client.query("DELETE FROM anime_series_entries WHERE anime_id=$1", [id]);
    await client.query("DELETE FROM character_appearances WHERE anime_id=$1", [id]);
    await client.query("DELETE FROM anime_staff          WHERE anime_id=$1", [id]);
    await client.query("DELETE FROM user_ratings         WHERE anime_id=$1", [id]);
    await client.query("DELETE FROM watchlist            WHERE anime_id=$1", [id]);
    await client.query("DELETE FROM review_likes WHERE review_id IN (SELECT id FROM reviews WHERE anime_id=$1)", [id]);
    await client.query("DELETE FROM reviews              WHERE anime_id=$1", [id]);
    await client.query("DELETE FROM comments             WHERE anime_id=$1", [id]);
    await client.query("DELETE FROM media                WHERE anime_id=$1", [id]);
    await client.query("DELETE FROM anime                WHERE id=$1",       [id]);

    await client.query("COMMIT");
    res.json({ ok: true, id: Number(id), title: ex.rows[0].title });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ════════════════════════════════════════════════════════════════
// ОЧЕРЕДЬ МОДЕРАЦИИ МЕДИА (все аниме, pending)
// ════════════════════════════════════════════════════════════════

// GET /api/admin/media/pending?page=1&limit=20
router.get("/media/pending", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const [countRow, dataRows] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS total FROM media WHERE status='pending'"),
      pool.query(`
        SELECT m.id, m.type, m.url, m.thumbnail_url, m.status,
               m.created_at, m.anime_id,
               a.title AS anime_title,
               u.username AS uploader_username, u.id AS uploader_id
        FROM media m
        JOIN anime a ON a.id = m.anime_id
        JOIN users u ON u.id = m.uploaded_by
        WHERE m.status = 'pending'
        ORDER BY m.created_at ASC
        LIMIT $1 OFFSET $2
      `, [Number(limit), offset]),
    ]);

    res.json({ items: dataRows.rows, total: countRow.rows[0].total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/media/:id — approve / reject
router.patch("/media/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(+id)) return res.status(400).json({ error: "Неверный id" });
    const { action } = req.body;
    if (!["approve", "reject"].includes(action))
      return res.status(400).json({ error: "action должен быть approve или reject" });

    const newStatus = action === "approve" ? "approved" : "rejected";
    const r = await pool.query(
      "UPDATE media SET status=$1 WHERE id=$2 RETURNING id, status",
      [newStatus, id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Медиа не найдено" });
    res.json({ ok: true, ...r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// СТАТИСТИКА (дашборд)
// ════════════════════════════════════════════════════════════════

// GET /api/admin/stats
router.get("/stats", async (req, res) => {
  try {
    const [animeR, usersR, mediaR, reviewsR, commentsR] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS total FROM anime"),
      pool.query("SELECT COUNT(*)::int AS total FROM users"),
      pool.query("SELECT COUNT(*)::int AS total FROM media WHERE status='pending'"),
      pool.query("SELECT COUNT(*)::int AS total FROM reviews WHERE is_deleted=FALSE"),
      pool.query("SELECT COUNT(*)::int AS total FROM comments WHERE is_deleted=FALSE"),
    ]);

    res.json({
      anime:           animeR.rows[0].total,
      users:           usersR.rows[0].total,
      pending_media:   mediaR.rows[0].total,
      reviews:         reviewsR.rows[0].total,
      comments:        commentsR.rows[0].total,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// ЖАЛОБЫ — очередь для модерации
// ════════════════════════════════════════════════════════════════

// GET /api/admin/reports?status=pending&page=1&limit=20
router.get("/reports", async (req, res) => {
  try {
    const { status = "pending", page = 1, limit = 20 } = req.query;
    const validStatuses = ["pending", "reviewed", "dismissed"];
    const st = validStatuses.includes(status) ? status : "pending";
    const offset = (Number(page) - 1) * Number(limit);

    const [countRow, rows] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS total FROM reports WHERE status=$1", [st]),
      pool.query(`
        SELECT
          r.id, r.reason, r.details, r.status, r.created_at,
          ru.username AS reporter_username, ru.id AS reporter_id,
          c.id AS comment_id, c.body AS comment_body,
          cu.username AS comment_author, c.anime_id AS comment_anime_id,
          rv.id AS review_id, rv.title AS review_title, rv.body AS review_body,
          rvu.username AS review_author, rv.anime_id AS review_anime_id
        FROM reports r
        JOIN users ru ON ru.id = r.reporter_id
        LEFT JOIN comments c   ON c.id  = r.comment_id
        LEFT JOIN users cu     ON cu.id = c.user_id
        LEFT JOIN reviews rv   ON rv.id = r.review_id
        LEFT JOIN users rvu    ON rvu.id = rv.user_id
        WHERE r.status = $1
        ORDER BY r.created_at ASC
        LIMIT $2 OFFSET $3
      `, [st, Number(limit), offset]),
    ]);
    res.json({ items: rows.rows, total: countRow.rows[0].total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/reports/:id — обработать жалобу
router.patch("/reports/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // "resolve" | "dismiss"
    if (!["resolve", "dismiss"].includes(action))
      return res.status(400).json({ error: "action: resolve или dismiss" });
    const newStatus = action === "resolve" ? "reviewed" : "dismissed";
    const r = await pool.query(
      "UPDATE reports SET status=$1 WHERE id=$2 RETURNING id, status",
      [newStatus, id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Жалоба не найдена" });
    res.json({ ok: true, ...r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// ЗАКРЕПЛЁННЫЕ РЕЦЕНЗИИ
// ════════════════════════════════════════════════════════════════

// PATCH /api/admin/reviews/:id/pin
router.patch("/reviews/:id/pin", async (req, res) => {
  try {
    const { id } = req.params;
    const { pinned } = req.body;
    const r = await pool.query(
      "UPDATE reviews SET is_pinned=$1 WHERE id=$2 AND is_deleted=FALSE RETURNING id, is_pinned",
      [!!pinned, id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Рецензия не найдена" });
    res.json({ ok: true, ...r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ════════════════════════════════════════════════════════════════
// РЕЙТИНГ ПОЛЬЗОВАТЕЛЕЙ ПО АКТИВНОСТИ
// ════════════════════════════════════════════════════════════════

// GET /api/admin/leaderboard?limit=20
router.get("/leaderboard", async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const r = await pool.query(`
      SELECT
        u.id, u.username, u.avatar_url, u.created_at,
        r.name AS role_name,
        (SELECT COUNT(*)::int FROM comments  WHERE user_id=u.id AND is_deleted=FALSE) AS comments,
        (SELECT COUNT(*)::int FROM reviews   WHERE user_id=u.id AND is_deleted=FALSE) AS reviews,
        (SELECT COUNT(*)::int FROM user_ratings WHERE user_id=u.id) AS ratings,
        (SELECT COUNT(*)::int FROM watchlist WHERE user_id=u.id)    AS watchlist_count,
        (
          (SELECT COUNT(*) FROM comments WHERE user_id=u.id AND is_deleted=FALSE) * 2 +
          (SELECT COUNT(*) FROM reviews  WHERE user_id=u.id AND is_deleted=FALSE) * 5 +
          (SELECT COUNT(*) FROM user_ratings WHERE user_id=u.id) * 1
        )::int AS activity_score
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.is_active = TRUE
      ORDER BY activity_score DESC
      LIMIT $1
    `, [Number(limit)]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
