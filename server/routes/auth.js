const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const pool   = require("../db");

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: "Заполните все поля" });
  if (password.length < 6)
    return res.status(400).json({ error: "Пароль должен быть не менее 6 символов" });
  try {
    const exists = await pool.query(
      "SELECT id FROM users WHERE email=$1 OR username=$2", [email, username]
    );
    if (exists.rows.length > 0)
      return res.status(400).json({ error: "Email или имя пользователя уже заняты" });

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3) RETURNING id, username, email, role_id`,
      [username, email, hash]
    );
    const user  = result.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role_id }, process.env.JWT_SECRET, { expiresIn: "30d" });
    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    const user   = result.rows[0];
    if (!user) return res.status(401).json({ error: "Неверный email или пароль" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Неверный email или пароль" });

    const token = jwt.sign({ id: user.id, role: user.role_id }, process.env.JWT_SECRET, { expiresIn: "30d" });
    res.json({
      user:  { id: user.id, username: user.username, email: user.email, role_id: user.role_id },
      token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me — проверить токен
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
