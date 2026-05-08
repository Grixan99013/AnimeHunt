// server/routes/watchlist.js
// Всё по /api/watchlist/* — чтобы не конфликтовать с /api/anime/:id
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
  } catch (e) {
    if (e.name === "TokenExpiredError")
      return res.status(401).json({ error: "Токен недействителен" }); // expired
    return res.status(401).json({ error: "Токен недействителен" });
  }
}

// GET /api/watchlist — мой список
router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        w.status, w.episodes_watched, w.added_at, w.updated_at,
        a.id, a.title, a.title_jp, a.poster_url, a.episodes, a.aired_from,
        a.type, a.status AS anime_status, a.is_new,
        s.name AS studio_name,
        COALESCE(JSON_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL), '[]') AS genres,
        ROUND(AVG(ur.score)::numeric, 1) AS avg_rating,
        COUNT(DISTINCT ur.user_id)::int  AS rating_count,
        (SELECT score FROM user_ratings
         WHERE user_id = $1 AND anime_id = a.id) AS my_rating
      FROM watchlist w
      JOIN anime a ON a.id = w.anime_id
      LEFT JOIN anim_studies   s  ON s.id = a.studio_id
      LEFT JOIN anime_genres   ag ON ag.anime_id = a.id
      LEFT JOIN genres         g  ON g.id = ag.genre_id
      LEFT JOIN user_ratings   ur ON ur.anime_id = a.id
      WHERE w.user_id = $1
      GROUP BY
        w.status, w.episodes_watched, w.added_at, w.updated_at,
        a.id, a.title, a.title_jp, a.poster_url, a.episodes, a.aired_from,
        a.type, a.status, a.is_new, s.name
      ORDER BY w.updated_at DESC
    `, [req.userId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/watchlist/:animeId — добавить / обновить
router.put("/:animeId", requireAuth, async (req, res) => {
  try {
    const { animeId } = req.params;
    const { status, episodes_watched = 0 } = req.body;
    const valid = ["watching", "completed", "planned", "on_hold", "dropped"];
    if (!valid.includes(status))
      return res.status(400).json({ error: "Неверный статус" });

    await pool.query(`
      INSERT INTO watchlist (user_id, anime_id, status, episodes_watched)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, anime_id)
      DO UPDATE SET status=$3, episodes_watched=$4, updated_at=NOW()
    `, [req.userId, animeId, status, episodes_watched]);

    res.json({ ok: true, status, episodes_watched });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// GET /api/watchlist/export?format=json|csv — экспорт списка
router.get("/export", requireAuth, async (req, res) => {
  const format = (req.query.format || "json").toLowerCase();
  try {
    const result = await pool.query(`
      SELECT
        a.id, a.title, a.title_jp, a.type, a.episodes, a.aired_from,
        w.status, w.episodes_watched,
        rv.score AS my_rating
      FROM watchlist w
      JOIN anime a ON a.id = w.anime_id
      LEFT JOIN reviews rv ON rv.anime_id = a.id AND rv.user_id = w.user_id
      WHERE w.user_id = $1
      ORDER BY w.updated_at DESC
    `, [req.userId]);

    const rows = result.rows;

    if (format === "csv") {
      const headers = ["ID","Название","Название (JP)","Статус","Эп. просмотрено","Всего эп.","Моя оценка","Тип","Год"];
      const escape  = v => `"${String(v || "").replace(/"/g, '""')}"`;
      const csv = [
        headers.join(","),
        ...rows.map(r => [
          r.id, escape(r.title), escape(r.title_jp || ""),
          r.status, r.episodes_watched || 0, r.episodes || "",
          r.my_rating || "", r.type || "",
          r.aired_from ? String(r.aired_from).slice(0, 4) : "",
        ].join(","))
      ].join("\n");

      res.set("Content-Type", "text/csv; charset=utf-8");
      res.set("Content-Disposition", "attachment; filename=animelist.csv");
      return res.send("\uFEFF" + csv); // BOM для Excel
    }

    // JSON
    res.json({
      exported_at: new Date().toISOString(),
      total: rows.length,
      list: rows.map(r => ({
        id:               r.id,
        title:            r.title,
        title_jp:         r.title_jp || null,
        status:           r.status,
        episodes_watched: r.episodes_watched || 0,
        episodes:         r.episodes || null,
        my_rating:        r.my_rating || null,
        type:             r.type || null,
        year:             r.aired_from ? String(r.aired_from).slice(0, 4) : null,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/watchlist/:animeId — удалить
router.delete("/:animeId", requireAuth, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM watchlist WHERE user_id=$1 AND anime_id=$2",
      [req.userId, req.params.animeId]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
