const router = require("express").Router();
const pool   = require("../db");

// GET /api/anime — все аниме
router.get("/", async (req, res) => {
  const { q, status, type, sort } = req.query;
  let query = `
    SELECT a.*, s.name AS studio_name,
      ARRAY_AGG(DISTINCT g.name) AS genres
    FROM anime a
    LEFT JOIN anim_studies s ON s.id = a.studio_id
    LEFT JOIN anime_genres ag ON ag.anime_id = a.id
    LEFT JOIN genres g ON g.id = ag.genre_id
    WHERE 1=1
  `;
  const params = [];
  let i = 1;

  if (q)      { query += ` AND (a.title ILIKE $${i} OR a.title_jp ILIKE $${i})`; params.push(`%${q}%`); i++; }
  if (status) { query += ` AND a.status = $${i}`;  params.push(status); i++; }
  if (type)   { query += ` AND a.type = $${i}`;    params.push(type);   i++; }

  query += ` GROUP BY a.id, s.name`;
  if (sort === "rating") query += " ORDER BY a.rating DESC NULLS LAST";
  else if (sort === "newest") query += " ORDER BY a.aired_from DESC NULLS LAST";
  else query += " ORDER BY a.title ASC";

  const result = await pool.query(query, params);
  res.json(result.rows);
});

// GET /api/anime/:id — одно аниме с сезонами и персонажами
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const anime = await pool.query(
      `SELECT a.*, s.name AS studio_name FROM anime a
       LEFT JOIN anim_studies s ON s.id = a.studio_id
       WHERE a.id = $1`, [id]
    );
    if (!anime.rows[0]) return res.status(404).json({ error: "Not found" });

    const seasons    = await pool.query("SELECT * FROM seasons WHERE anime_id=$1 ORDER BY season_num", [id]);
    const characters = await pool.query("SELECT * FROM characters WHERE anime_id=$1", [id]);
    const genres     = await pool.query(
      `SELECT g.name FROM genres g
       JOIN anime_genres ag ON ag.genre_id = g.id
       WHERE ag.anime_id = $1`, [id]
    );
    const comments = await pool.query(
      `SELECT c.*, u.username FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.anime_id = $1 AND c.is_deleted = false
       ORDER BY c.created_at DESC`, [id]
    );

    res.json({
      ...anime.rows[0],
      genres:     genres.rows.map(g => g.name),
      seasons:    seasons.rows,
      characters: characters.rows,
      comments:   comments.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;