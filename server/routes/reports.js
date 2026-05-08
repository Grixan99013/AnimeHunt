// server/routes/reports.js
// Жалобы на комментарии и рецензии
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

function requireModAdmin(req, res, next) {
  if (!req.userId) return res.status(401).json({ error: "Не авторизован" });
  if (req.roleId !== 1 && req.roleId !== 2)
    return res.status(403).json({ error: "Только для модераторов и администраторов" });
  next();
}

const REASONS = ["spam", "insult", "spoiler", "off_topic", "other"];
const REASON_LABELS = {
  spam:      "Спам",
  insult:    "Оскорбление",
  spoiler:   "Незакрытый спойлер",
  off_topic: "Не по теме",
  other:     "Другое",
};

// ── POST /api/reports — подать жалобу ────────────────────────
router.post("/", requireAuth, async (req, res) => {
  try {
    const { comment_id, review_id, reason, details } = req.body;

    if (!comment_id && !review_id)
      return res.status(400).json({ error: "Укажите comment_id или review_id" });
    if (comment_id && review_id)
      return res.status(400).json({ error: "Укажите только один: comment_id или review_id" });
    if (!REASONS.includes(reason))
      return res.status(400).json({ error: `Причина должна быть одной из: ${REASONS.join(", ")}` });
    if (details && details.length > 500)
      return res.status(400).json({ error: "Подробности не более 500 символов" });

    // Проверяем дублирование жалобы
    const dupCheck = comment_id
      ? await pool.query(
          "SELECT 1 FROM reports WHERE reporter_id=$1 AND comment_id=$2",
          [req.userId, comment_id]
        )
      : await pool.query(
          "SELECT 1 FROM reports WHERE reporter_id=$1 AND review_id=$2",
          [req.userId, review_id]
        );
    if (dupCheck.rows.length > 0)
      return res.status(409).json({ error: "Вы уже жаловались на этот контент" });

    const r = await pool.query(
      `INSERT INTO reports (reporter_id, comment_id, review_id, reason, details)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [req.userId, comment_id || null, review_id || null, reason, details?.trim() || null]
    );
    res.status(201).json({ ok: true, id: r.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/reports — список жалоб (мод/админ) ───────────────
router.get("/", requireAuth, requireModAdmin, async (req, res) => {
  try {
    const { status = "pending", page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const [countRow, rows] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS total FROM reports WHERE status=$1", [status]),
      pool.query(`
        SELECT
          r.id, r.reason, r.details, r.status, r.created_at,
          ru.username AS reporter_username, ru.id AS reporter_id,
          -- Комментарий
          c.id        AS comment_id,
          c.body      AS comment_body,
          cu.username AS comment_author,
          c.anime_id  AS comment_anime_id,
          -- Рецензия
          rv.id       AS review_id,
          rv.title    AS review_title,
          rv.body     AS review_body,
          rvu.username AS review_author,
          rv.anime_id  AS review_anime_id
        FROM reports r
        JOIN users ru ON ru.id = r.reporter_id
        LEFT JOIN comments c  ON c.id  = r.comment_id
        LEFT JOIN users cu    ON cu.id = c.user_id
        LEFT JOIN reviews rv  ON rv.id = r.review_id
        LEFT JOIN users rvu   ON rvu.id = rv.user_id
        WHERE r.status = $1
        ORDER BY r.created_at ASC
        LIMIT $2 OFFSET $3
      `, [status, Number(limit), offset]),
    ]);

    res.json({ items: rows.rows, total: countRow.rows[0].total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/reports/:id — изменить статус (мод/админ) ─────
router.patch("/:id", requireAuth, requireModAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // "dismiss" | "resolve"
    if (!["dismiss", "resolve"].includes(action))
      return res.status(400).json({ error: "action: dismiss или resolve" });

    const newStatus = action === "resolve" ? "reviewed" : "dismissed";
    const r = await pool.query(
      "UPDATE reports SET status=$1 WHERE id=$2 RETURNING id, status",
      [newStatus, id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Жалоба не найдена" });
    res.json({ ok: true, ...r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.REASON_LABELS = REASON_LABELS;
