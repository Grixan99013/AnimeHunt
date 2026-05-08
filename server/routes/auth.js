const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const crypto = require("crypto");
const pool   = require("../db");
const { validate, schemas } = require("../middleware/validate");

// ── Хелперы ───────────────────────────────────────────────────
const ACCESS_TTL  = "15m";   // Access token — короткий
const REFRESH_TTL = 30;      // Refresh token — 30 дней (дни)

function signAccess(user) {
  return jwt.sign(
    { id: user.id, role: user.role_id ?? user.role },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TTL }
  );
}

async function createRefreshToken(userId) {
  const token     = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TTL * 24 * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, token, expiresAt]
  );
  return { token, expiresAt };
}

// ── POST /api/auth/register ───────────────────────────────────
router.post("/register", validate(schemas.register), async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const exists = await pool.query(
      "SELECT id FROM users WHERE email=$1 OR username=$2", [email, username]
    );
    if (exists.rows.length > 0)
      return res.status(400).json({ error: "Email или имя пользователя уже заняты" });

    const hash   = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3) RETURNING id, username, email, role_id`,
      [username, email, hash]
    );
    const user         = result.rows[0];
    const accessToken  = signAccess(user);
    const { token: refreshToken, expiresAt } = await createRefreshToken(user.id);

    res.json({
      user,
      token:         accessToken,   // основной токен (обратная совместимость)
      access_token:  accessToken,
      refresh_token: refreshToken,
      refresh_expires_at: expiresAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post("/login", validate(schemas.login), async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    const user   = result.rows[0];
    if (!user) return res.status(401).json({ error: "Неверный email или пароль" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Неверный email или пароль" });

    const accessToken  = signAccess(user);
    const { token: refreshToken, expiresAt } = await createRefreshToken(user.id);

    res.json({
      user:  { id: user.id, username: user.username, email: user.email, role_id: user.role_id },
      token:         accessToken,
      access_token:  accessToken,
      refresh_token: refreshToken,
      refresh_expires_at: expiresAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/refresh ────────────────────────────────────
// Принимает { refresh_token } → возвращает новый access_token (и ротирует refresh)
router.post("/refresh", async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token)
    return res.status(400).json({ error: "Укажите refresh_token" });

  try {
    const r = await pool.query(
      `SELECT rt.*, u.role_id
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token = $1 AND rt.revoked = FALSE AND rt.expires_at > NOW()`,
      [refresh_token]
    );
    if (!r.rows[0])
      return res.status(401).json({ error: "Refresh token недействителен или истёк" });

    const row = r.rows[0];

    // Отзываем старый токен (ротация)
    await pool.query("UPDATE refresh_tokens SET revoked=TRUE WHERE id=$1", [row.id]);

    // Выдаём новую пару
    const userRow     = { id: row.user_id, role_id: row.role_id };
    const accessToken = signAccess(userRow);
    const { token: newRefresh, expiresAt } = await createRefreshToken(row.user_id);

    res.json({
      token:         accessToken,
      access_token:  accessToken,
      refresh_token: newRefresh,
      refresh_expires_at: expiresAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────
// Отзывает конкретный refresh token (или все токены пользователя)
router.post("/logout", async (req, res) => {
  const { refresh_token, revoke_all } = req.body;
  const auth = req.headers.authorization;

  try {
    if (revoke_all && auth?.startsWith("Bearer ")) {
      // Отзываем все токены пользователя
      const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
      await pool.query(
        "UPDATE refresh_tokens SET revoked=TRUE WHERE user_id=$1",
        [payload.id]
      );
    } else if (refresh_token) {
      await pool.query(
        "UPDATE refresh_tokens SET revoked=TRUE WHERE token=$1",
        [refresh_token]
      );
    }
    res.json({ ok: true });
  } catch {
    res.json({ ok: true }); // Всегда успех при logout
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get("/me", async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer "))
    return res.status(401).json({ error: "Нет токена" });
  try {
    const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    const result  = await pool.query(
      "SELECT id, username, email, role_id FROM users WHERE id=$1", [payload.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Пользователь не найден" });
    res.json({ user: result.rows[0] });
  } catch {
    res.status(401).json({ error: "Токен недействителен" });
  }
});

module.exports = router;
