// server/routes/user.js
const router = require("express").Router();
const pool   = require("../db");
const jwt    = require("jsonwebtoken");
const path   = require("path");
const fs     = require("fs");
const crypto = require("crypto");
const multer = require("multer");

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

// ── Аватар: multer для /api/user/avatar ──────────────────────
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safe = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"].includes(ext) ? ext : ".jpg";
    cb(null, `avatar_${crypto.randomUUID()}${safe}`);
  },
});
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|gif|webp|avif|pjpeg|x-png)$/i.test(file.mimetype);
    cb(ok ? null : new Error("Допустимы только изображения"), ok);
  },
});

// ══════════════════════════════════════════════════════════════
// СВОЙ ПРОФИЛЬ
// ══════════════════════════════════════════════════════════════

// GET /api/user/me — данные текущего пользователя (с настройками)
router.get("/me", requireAuth, async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT id, username, email, avatar_url, role_id, hide_email, hide_watchlist, created_at FROM users WHERE id=$1",
      [req.userId]
    );
    if (!r.rows[0]) return res.status(404).json({ error: "Не найдено" });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/user/avatar — загрузить аватар
router.post("/avatar", requireAuth, (req, res) => {
  avatarUpload.single("avatar")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || "Ошибка загрузки" });
    if (!req.file) return res.status(400).json({ error: "Файл не получен" });

    const base = `${req.protocol}://${req.get("host")}`;
    const url  = `${base}/uploads/${req.file.filename}`;

    // Удаляем старый аватар (если не дефолтный)
    try {
      const old = await pool.query("SELECT avatar_url FROM users WHERE id=$1", [req.userId]);
      const oldUrl = old.rows[0]?.avatar_url || "";
      if (oldUrl && oldUrl.includes("/uploads/avatar_")) {
        const oldFile = path.join(uploadsDir, path.basename(oldUrl));
        if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
      }
    } catch {}

    await pool.query("UPDATE users SET avatar_url=$1, updated_at=NOW() WHERE id=$2", [url, req.userId]);

    // Обновляем JWT — возвращаем новый токен с avatar_url
    const userQ = await pool.query(
      "SELECT id, username, email, role_id, avatar_url FROM users WHERE id=$1",
      [req.userId]
    );
    const user = userQ.rows[0];
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role_id, avatar_url: user.avatar_url },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ ok: true, avatar_url: url, token, user });
  });
});

// DELETE /api/user/avatar — удалить аватар
router.delete("/avatar", requireAuth, async (req, res) => {
  try {
    const old = await pool.query("SELECT avatar_url FROM users WHERE id=$1", [req.userId]);
    const oldUrl = old.rows[0]?.avatar_url || "";
    if (oldUrl && oldUrl.includes("/uploads/avatar_")) {
      const oldFile = path.join(uploadsDir, path.basename(oldUrl));
      if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
    }
    await pool.query("UPDATE users SET avatar_url=NULL, updated_at=NOW() WHERE id=$1", [req.userId]);
    res.json({ ok: true, avatar_url: null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/user/privacy — обновить настройки приватности
router.patch("/privacy", requireAuth, async (req, res) => {
  try {
    const { hide_email, hide_watchlist } = req.body;
    await pool.query(
      "UPDATE users SET hide_email=$1, hide_watchlist=$2, updated_at=NOW() WHERE id=$3",
      [!!hide_email, !!hide_watchlist, req.userId]
    );
    res.json({ ok: true, hide_email: !!hide_email, hide_watchlist: !!hide_watchlist });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
// ПУБЛИЧНЫЙ ПРОФИЛЬ ДРУГОГО ПОЛЬЗОВАТЕЛЯ
// ══════════════════════════════════════════════════════════════

// GET /api/user/profile/:username — публичный профиль
router.get("/profile/:username", optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const userQ = await pool.query(
      `SELECT id, username, avatar_url, role_id, hide_email, hide_watchlist,
              created_at, email
       FROM users WHERE username=$1 AND is_active=TRUE`,
      [username]
    );
    if (!userQ.rows[0]) return res.status(404).json({ error: "Пользователь не найден" });

    const u          = userQ.rows[0];
    const isSelf     = req.userId === u.id;
    const isAdminMod = req.roleId === 1 || req.roleId === 2;

    // Формируем публичные данные
    const pub = {
      id:         u.id,
      username:   u.username,
      avatar_url: u.avatar_url,
      role_id:    u.role_id,
      created_at: u.created_at,
      is_self:    isSelf,
      // email — только себе или если не скрыт, или мод/админ
      email: (isSelf || isAdminMod || !u.hide_email) ? u.email : null,
      hide_email:    u.hide_email,
      hide_watchlist: u.hide_watchlist,
    };

    // Статистика (всегда публичная — только числа)
    const [watchQ, favQ, reviewQ, commentQ] = await Promise.all([
      pool.query("SELECT status, COUNT(*)::int FROM watchlist WHERE user_id=$1 GROUP BY status", [u.id]),
      pool.query("SELECT COUNT(*)::int AS count FROM favorites WHERE user_id=$1", [u.id]),
      pool.query("SELECT COUNT(*)::int AS count FROM reviews WHERE user_id=$1 AND is_deleted=FALSE", [u.id]),
      pool.query("SELECT COUNT(*)::int AS count FROM comments WHERE user_id=$1 AND is_deleted=FALSE", [u.id]),
    ]);

    const watchStats = { watching: 0, completed: 0, planned: 0 };
    watchQ.rows.forEach(r => { if (watchStats[r.status] !== undefined) watchStats[r.status] = r.count; });

    pub.stats = {
      ...watchStats,
      favorites: favQ.rows[0]?.count || 0,
      reviews:   reviewQ.rows[0]?.count || 0,
      comments:  commentQ.rows[0]?.count || 0,
    };

    // Список просмотра (если не скрыт или сам/мод)
    if (!u.hide_watchlist || isSelf || isAdminMod) {
      const wlQ = await pool.query(`
        SELECT w.status, w.episodes_watched, w.updated_at,
               a.id, a.title, a.title_jp, a.poster_url,
               a.episodes, a.type,
               ROUND(AVG(ur.score)::numeric,1) AS avg_rating,
               COUNT(DISTINCT ur.user_id)::int AS rating_count,
               (SELECT score FROM user_ratings WHERE user_id=$1 AND anime_id=a.id) AS my_rating
        FROM watchlist w
        JOIN anime a ON a.id = w.anime_id
        LEFT JOIN user_ratings ur ON ur.anime_id = a.id
        WHERE w.user_id=$1
        GROUP BY w.status, w.episodes_watched, w.updated_at, a.id, a.title, a.title_jp, a.poster_url, a.episodes, a.type
        ORDER BY w.updated_at DESC
      `, [u.id]);
      pub.watchlist = wlQ.rows;
    } else {
      pub.watchlist = null; // null = скрыт
    }

    // Рецензии (всегда публичные)
    const rvQ = await pool.query(`
      SELECT rv.id, rv.score, rv.title, rv.body, rv.created_at, rv.helpful,
             a.id AS anime_id, a.title AS anime_title, a.poster_url AS anime_poster
      FROM reviews rv JOIN anime a ON a.id=rv.anime_id
      WHERE rv.user_id=$1 AND rv.is_deleted=FALSE
      ORDER BY rv.created_at DESC
    `, [u.id]);
    pub.reviews = rvQ.rows;

    // Избранные (всегда публичные)
    const favListQ = await pool.query(`
      SELECT DISTINCT ON (c.id)
        c.id, c.name, c.name_jp, c.image_url,
        a.id AS anime_id, a.title AS anime_title
      FROM favorites f
      JOIN characters c ON c.id = f.character_id
      JOIN character_appearances ca ON ca.character_id = c.id
      JOIN anime a ON a.id = ca.anime_id
      WHERE f.user_id=$1
      ORDER BY c.id, a.aired_from ASC NULLS LAST
    `, [u.id]);
    pub.favorites = favListQ.rows;

    res.json(pub);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// СВОИ ДАННЫЕ (старые роуты — без изменений)
// ══════════════════════════════════════════════════════════════

router.get("/comments", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.body, c.created_at, a.title AS anime_title, a.id AS anime_id
      FROM comments c JOIN anime a ON a.id = c.anime_id
      WHERE c.user_id=$1 AND c.is_deleted=FALSE
      ORDER BY c.created_at DESC
    `, [req.userId]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/ratings", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ur.score, ur.rated_at, a.id, a.title, a.poster_url
      FROM user_ratings ur JOIN anime a ON a.id = ur.anime_id
      WHERE ur.user_id=$1 ORDER BY ur.rated_at DESC
    `, [req.userId]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/favorites", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (c.id)
        c.id, c.name, c.name_jp, c.role, c.image_url, c.description,
        a.id AS anime_id, a.title AS anime_title, a.poster_url AS anime_poster, f.added_at
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

router.get("/reviews", requireAuth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT rv.id, rv.score, rv.title, rv.body, rv.created_at,
             a.id AS anime_id, a.title AS anime_title, a.poster_url AS anime_poster
      FROM reviews rv JOIN anime a ON a.id=rv.anime_id
      WHERE rv.user_id=$1 AND rv.is_deleted=FALSE
      ORDER BY rv.created_at DESC
    `, [req.userId]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
