// server/routes/media.js  →  /api/media/*
const router = require("express").Router();
const pool   = require("../db");
const jwt    = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer "))
    return res.status(401).json({ error: "Не авторизован" });
  try {
    const p = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    req.userId  = p.id;
    req.roleId  = p.role;   // 1=admin, 2=moderator, 3=user
    next();
  } catch { res.status(401).json({ error: "Токен недействителен" }); }
}

function requireMod(req, res, next) {
  if (req.roleId !== 1 && req.roleId !== 2)
    return res.status(403).json({ error: "Недостаточно прав" });
  next();
}

function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    try {
      const p = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
      req.userId = p.id;
      req.roleId = p.role;
    } catch {}
  }
  next();
}

const isMod = (roleId) => roleId === 1 || roleId === 2;

// ── СКРИНШОТЫ ────────────────────────────────────────────────

// GET /api/media/anime/:animeId/screenshots
// Авторизованные модеры видят все; остальные — только approved
router.get("/anime/:animeId/screenshots", optionalAuth, async (req, res) => {
  try {
    const { animeId } = req.params;
    const showAll = isMod(req.roleId);

    const r = await pool.query(`
      SELECT s.id, s.image_url, s.status, s.created_at,
             u.username AS submitted_by,
             u.id AS user_id,
             ru.username AS reviewed_by_name
      FROM anime_screenshots s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN users ru ON ru.id = s.reviewed_by
      WHERE s.anime_id = $1
        ${showAll ? "" : "AND s.status = 'approved'"}
      ORDER BY s.created_at DESC
    `, [animeId]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/media/anime/:animeId/screenshots — предложить скриншот
router.post("/anime/:animeId/screenshots", requireAuth, async (req, res) => {
  try {
    const { animeId } = req.params;
    const { image_url } = req.body;
    if (!image_url?.trim())
      return res.status(400).json({ error: "Изображение обязательно" });

    // Проверяем что аниме существует
    const check = await pool.query("SELECT id FROM anime WHERE id=$1", [animeId]);
    if (!check.rows[0]) return res.status(404).json({ error: "Аниме не найдено" });

    const r = await pool.query(`
      INSERT INTO anime_screenshots (anime_id, user_id, image_url, status)
      VALUES ($1, $2, $3, $4)
      RETURNING id, image_url, status, created_at
    `, [animeId, req.userId, image_url.trim(), isMod(req.roleId) ? "approved" : "pending"]);

    const u = await pool.query("SELECT username FROM users WHERE id=$1", [req.userId]);
    res.json({ ...r.rows[0], submitted_by: u.rows[0].username, user_id: req.userId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/media/screenshots/:id — модератор меняет статус
router.patch("/screenshots/:id", requireAuth, requireMod, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status))
      return res.status(400).json({ error: "Неверный статус" });

    const r = await pool.query(`
      UPDATE anime_screenshots
      SET status=$1, reviewed_by=$2, reviewed_at=NOW()
      WHERE id=$3
      RETURNING id, status
    `, [status, req.userId, id]);

    if (!r.rows[0]) return res.status(404).json({ error: "Не найдено" });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/media/screenshots/:id — удалить (мод или автор)
router.delete("/screenshots/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const row = await pool.query("SELECT user_id FROM anime_screenshots WHERE id=$1", [id]);
    if (!row.rows[0]) return res.status(404).json({ error: "Не найдено" });
    if (row.rows[0].user_id !== req.userId && !isMod(req.roleId))
      return res.status(403).json({ error: "Нет доступа" });

    await pool.query("DELETE FROM anime_screenshots WHERE id=$1", [id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── ВИДЕО ─────────────────────────────────────────────────────

// GET /api/media/anime/:animeId/videos
router.get("/anime/:animeId/videos", optionalAuth, async (req, res) => {
  try {
    const { animeId } = req.params;
    const showAll = isMod(req.roleId);

    const r = await pool.query(`
      SELECT v.id, v.url, v.video_type, v.title, v.status, v.created_at,
             u.username AS submitted_by, u.id AS user_id,
             ru.username AS reviewed_by_name
      FROM anime_videos v
      JOIN users u ON u.id = v.user_id
      LEFT JOIN users ru ON ru.id = v.reviewed_by
      WHERE v.anime_id = $1
        ${showAll ? "" : "AND v.status = 'approved'"}
      ORDER BY v.created_at DESC
    `, [animeId]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/media/anime/:animeId/videos — предложить видео
router.post("/anime/:animeId/videos", requireAuth, async (req, res) => {
  try {
    const { animeId } = req.params;
    const { url, video_type, title } = req.body;

    if (!url?.trim()) return res.status(400).json({ error: "URL обязателен" });

    const validTypes = ["pv","trailer","character","cm","op","ed","mv","clip","other","episode_preview"];
    if (!validTypes.includes(video_type))
      return res.status(400).json({ error: "Неверный тип видео" });

    // Базовая валидация URL
    const allowedHosts = [
      "youtube.com","youtu.be","vk.com","vkvideo.ru",
      "rutube.ru","sibnet.ru","smotret-anime.com","smotret-anime.ru",
      "vimeo.com"
    ];
    let urlObj;
    try { urlObj = new URL(url.trim()); } catch { return res.status(400).json({ error: "Неверный URL" }); }
    const hostOk = allowedHosts.some(h => urlObj.hostname.endsWith(h));
    if (!hostOk) return res.status(400).json({ error: "Разрешены только: YouTube, VK, Rutube, Sibnet, Smotret-Anime, Vimeo" });

    const check = await pool.query("SELECT id FROM anime WHERE id=$1", [animeId]);
    if (!check.rows[0]) return res.status(404).json({ error: "Аниме не найдено" });

    const r = await pool.query(`
      INSERT INTO anime_videos (anime_id, user_id, url, video_type, title, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, url, video_type, title, status, created_at
    `, [animeId, req.userId, url.trim(), video_type, title?.trim() || null,
        isMod(req.roleId) ? "approved" : "pending"]);

    const u = await pool.query("SELECT username FROM users WHERE id=$1", [req.userId]);
    res.json({ ...r.rows[0], submitted_by: u.rows[0].username, user_id: req.userId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/media/videos/:id — модератор меняет статус
router.patch("/videos/:id", requireAuth, requireMod, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status))
      return res.status(400).json({ error: "Неверный статус" });

    const r = await pool.query(`
      UPDATE anime_videos
      SET status=$1, reviewed_by=$2, reviewed_at=NOW()
      WHERE id=$3
      RETURNING id, status
    `, [status, req.userId, id]);

    if (!r.rows[0]) return res.status(404).json({ error: "Не найдено" });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/media/videos/:id
router.delete("/videos/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const row = await pool.query("SELECT user_id FROM anime_videos WHERE id=$1", [id]);
    if (!row.rows[0]) return res.status(404).json({ error: "Не найдено" });
    if (row.rows[0].user_id !== req.userId && !isMod(req.roleId))
      return res.status(403).json({ error: "Нет доступа" });

    await pool.query("DELETE FROM anime_videos WHERE id=$1", [id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
