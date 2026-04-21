const jwt = require("jsonwebtoken");

/** JWT payload: role === 1 — администратор (см. auth.js) */
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer "))
    return res.status(401).json({ error: "Не авторизован" });
  try {
    const p = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    if (p.role !== 1) return res.status(403).json({ error: "Доступ только для администратора" });
    req.userId = p.id;
    next();
  } catch {
    res.status(401).json({ error: "Токен недействителен" });
  }
}

module.exports = { requireAdmin };
