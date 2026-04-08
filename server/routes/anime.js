// server/routes/anime.js
const router = require("express").Router();
const pool   = require("../db");
const jwt    = require("jsonwebtoken");

function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    try { req.userId = jwt.verify(auth.slice(7), process.env.JWT_SECRET).id; } catch {}
  }
  next();
}
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer "))
    return res.status(401).json({ error: "Не авторизован" });
  try { req.userId = jwt.verify(auth.slice(7), process.env.JWT_SECRET).id; next(); }
  catch { res.status(401).json({ error: "Токен недействителен" }); }
}

// ── Статические роуты ПЕРЕД /:id ─────────────────────────────

router.get("/genres", async (req, res) => {
  try {
    res.json((await pool.query("SELECT * FROM genres ORDER BY name")).rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/studios", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT s.id, s.name, s.country, COUNT(a.id)::int AS anime_count
      FROM anim_studies s LEFT JOIN anime a ON a.studio_id=s.id
      GROUP BY s.id ORDER BY anime_count DESC, s.name
    `);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/anime — список ───────────────────────────────────
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { q, status, type, sort, genre, studio, is_new, series, limit=100, offset=0 } = req.query;
    const conds = ["1=1"], params = [];
    let i = 1;

    if (q)      { conds.push(`(a.title ILIKE $${i} OR a.title_en ILIKE $${i} OR a.title_jp ILIKE $${i})`); params.push(`%${q}%`); i++; }
    if (status) { conds.push(`a.status=$${i}`); params.push(status); i++; }
    if (type)   { conds.push(`a.type=$${i}`);   params.push(type);   i++; }
    if (is_new==="true") conds.push("a.is_new=TRUE");
    if (genre)  { conds.push(`a.id IN (SELECT ag.anime_id FROM anime_genres ag JOIN genres g ON g.id=ag.genre_id WHERE g.name=$${i})`); params.push(genre); i++; }
    if (studio) { conds.push(`s.name=$${i}`);   params.push(studio); i++; }
    // фильтр по серии
    if (series) { conds.push(`a.id IN (SELECT anime_id FROM anime_series_entries WHERE series_id=$${i})`); params.push(series); i++; }

    const myR = req.userId ? `, (SELECT score FROM user_ratings WHERE user_id=$${i++} AND anime_id=a.id) AS my_rating` : "";
    if (req.userId) params.push(req.userId);

    let ord = "a.title ASC";
    if (sort==="rating") ord="avg_rating DESC NULLS LAST";
    if (sort==="newest") ord="a.aired_from DESC NULLS LAST";

    params.push(Number(limit), Number(offset));
    const li=i++, oi=i++;

    const sql = `
      SELECT a.id,a.title,a.title_en,a.title_jp,a.synopsis,a.poster_url,a.banner_url,
             a.status,a.type,a.episodes,a.duration_min,a.aired_from,a.aired_to,
             a.is_new,a.studio_id,a.season_num,
             s.name AS studio_name,
             COALESCE(JSON_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL),'[]') AS genres,
             ROUND(AVG(ur.score)::numeric,1) AS avg_rating,
             COUNT(DISTINCT ur.user_id)::int  AS rating_count
             ${myR}
      FROM anime a
      LEFT JOIN anim_studies   s  ON s.id=a.studio_id
      LEFT JOIN anime_genres   ag ON ag.anime_id=a.id
      LEFT JOIN genres         g  ON g.id=ag.genre_id
      LEFT JOIN user_ratings   ur ON ur.anime_id=a.id
      WHERE ${conds.join(" AND ")}
      GROUP BY a.id,s.id,s.name
      ORDER BY ${ord}
      LIMIT $${li} OFFSET $${oi}
    `;
    res.json((await pool.query(sql, params)).rows);
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// ── GET /api/anime/:id ────────────────────────────────────────
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(+id)) return res.status(400).json({ error: "Неверный id" });

    const myR = req.userId ? `, (SELECT score FROM user_ratings WHERE user_id=$2 AND anime_id=a.id) AS my_rating` : "";
    const qp  = req.userId ? [id, req.userId] : [id];

    const animeQ = await pool.query(`
      SELECT a.*,s.name AS studio_name,
        COALESCE(JSON_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL),'[]') AS genres,
        ROUND(AVG(ur.score)::numeric,1) AS avg_rating,
        COUNT(DISTINCT ur.user_id)::int AS rating_count
        ${myR}
      FROM anime a
      LEFT JOIN anim_studies s  ON s.id=a.studio_id
      LEFT JOIN anime_genres ag ON ag.anime_id=a.id
      LEFT JOIN genres       g  ON g.id=ag.genre_id
      LEFT JOIN user_ratings ur ON ur.anime_id=a.id
      WHERE a.id=$1 GROUP BY a.id,s.name
    `, qp);
    if (!animeQ.rows[0]) return res.status(404).json({ error: "Не найдено" });

    // Серия и соседние сезоны
    const seriesQ = await pool.query(`
      SELECT ser.id AS series_id, ser.title AS series_title, ser.description AS series_description,
             JSON_AGG(
               JSON_BUILD_OBJECT(
                 'id', a2.id, 'title', a2.title, 'poster_url', a2.poster_url,
                 'season_num', a2.season_num, 'aired_from', a2.aired_from,
                 'status', a2.status, 'episodes', a2.episodes
               ) ORDER BY ase.sort_order
             ) AS entries
      FROM anime_series_entries ase
      JOIN anime_series ser ON ser.id=ase.series_id
      JOIN anime_series_entries ase2 ON ase2.series_id=ser.id
      JOIN anime a2 ON a2.id=ase2.anime_id
      WHERE ase.anime_id=$1
      GROUP BY ser.id
    `, [id]);

    const [chars, staffQ, comments, reviews] = await Promise.all([
      pool.query("SELECT * FROM characters WHERE anime_id=$1 ORDER BY CASE role WHEN 'main' THEN 0 ELSE 1 END", [id]),
      pool.query("SELECT st.*,ast.role AS anime_role FROM staff st JOIN anime_staff ast ON ast.staff_id=st.id WHERE ast.anime_id=$1", [id]),
      pool.query(`
        SELECT c.id,c.body,c.created_at,c.parent_id,u.username,u.id AS user_id
        FROM comments c JOIN users u ON u.id=c.user_id
        WHERE c.anime_id=$1 AND c.is_deleted=FALSE ORDER BY c.created_at DESC
      `, [id]),
      pool.query(`
        SELECT r.id,r.score,r.title,r.body,r.helpful,r.created_at,r.updated_at,
               u.id AS user_id, u.username,
               ${req.userId ? `(SELECT 1 FROM review_likes WHERE user_id=${req.userId} AND review_id=r.id) IS NOT NULL AS liked_by_me,` : "FALSE AS liked_by_me,"}
               (SELECT COUNT(*) FROM review_likes WHERE review_id=r.id)::int AS likes_count
        FROM reviews r JOIN users u ON u.id=r.user_id
        WHERE r.anime_id=$1 AND r.is_deleted=FALSE
        ORDER BY r.helpful DESC, r.created_at DESC
      `, [id]),
    ]);

    // Рецензия текущего пользователя
    const myReview = req.userId
      ? (await pool.query("SELECT * FROM reviews WHERE user_id=$1 AND anime_id=$2 AND is_deleted=FALSE", [req.userId, id])).rows[0] || null
      : null;

    res.json({
      ...animeQ.rows[0],
      series:     seriesQ.rows[0] || null,
      characters: chars.rows,
      staff:      staffQ.rows,
      comments:   comments.rows,
      reviews:    reviews.rows,
      my_review:  myReview,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// ── POST /api/anime/:id/rate ──────────────────────────────────
router.post("/:id/rate", requireAuth, async (req, res) => {
  try {
    const { id }=req.params, { score }=req.body;
    if (!score||score<1||score>10) return res.status(400).json({ error:"Оценка 1-10" });
    await pool.query(`
      INSERT INTO user_ratings (user_id,anime_id,score) VALUES ($1,$2,$3)
      ON CONFLICT (user_id,anime_id) DO UPDATE SET score=$3,rated_at=NOW()
    `, [req.userId,id,score]);
    const r=await pool.query("SELECT ROUND(AVG(score)::numeric,1) AS avg_rating,COUNT(*)::int AS rating_count FROM user_ratings WHERE anime_id=$1",[id]);
    res.json({ ok:true,...r.rows[0],my_rating:score });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

// ── POST /api/anime/:id/comments ─────────────────────────────
router.post("/:id/comments", requireAuth, async (req, res) => {
  try {
    const { id }=req.params, { body,parent_id }=req.body;
    if (!body?.trim()) return res.status(400).json({ error:"Пустой комментарий" });
    const r=await pool.query(`
      INSERT INTO comments (user_id,anime_id,body,parent_id) VALUES ($1,$2,$3,$4)
      RETURNING id,body,created_at,parent_id
    `,[req.userId,id,body.trim(),parent_id||null]);
    const u=await pool.query("SELECT username FROM users WHERE id=$1",[req.userId]);
    res.json({...r.rows[0],username:u.rows[0].username,user_id:req.userId});
  } catch (err) { res.status(500).json({ error:err.message }); }
});

// ── POST /api/anime/:id/reviews — создать/обновить рецензию ───
router.post("/:id/reviews", requireAuth, async (req, res) => {
  try {
    const { id }=req.params;
    const { score, title, body }=req.body;
    if (!score||score<1||score>10) return res.status(400).json({ error:"Оценка 1-10" });
    if (!title?.trim()) return res.status(400).json({ error:"Укажите заголовок" });
    if (!body?.trim()||body.trim().length<100) return res.status(400).json({ error:"Рецензия должна быть не менее 100 символов" });

    const r=await pool.query(`
      INSERT INTO reviews (user_id,anime_id,score,title,body)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (user_id,anime_id) DO UPDATE
        SET score=$3,title=$4,body=$5,updated_at=NOW(),is_deleted=FALSE
      RETURNING *
    `,[req.userId,id,score,title.trim(),body.trim()]);

    // Синхронизируем оценку аниме с рецензией
    await pool.query(`
      INSERT INTO user_ratings (user_id,anime_id,score) VALUES ($1,$2,$3)
      ON CONFLICT (user_id,anime_id) DO UPDATE SET score=$3,rated_at=NOW()
    `,[req.userId,id,score]);

    const u=await pool.query("SELECT username FROM users WHERE id=$1",[req.userId]);
    res.json({...r.rows[0],username:u.rows[0].username,likes_count:0,liked_by_me:false});
  } catch (err) { res.status(500).json({ error:err.message }); }
});

// ── DELETE /api/anime/:id/reviews — удалить рецензию ─────────
router.delete("/:id/reviews", requireAuth, async (req, res) => {
  try {
    await pool.query(
      "UPDATE reviews SET is_deleted=TRUE WHERE user_id=$1 AND anime_id=$2",
      [req.userId,req.params.id]
    );
    res.json({ ok:true });
  } catch (err) { res.status(500).json({ error:err.message }); }
});

// ── POST /api/anime/reviews/:reviewId/like — лайк рецензии ───
router.post("/reviews/:reviewId/like", requireAuth, async (req, res) => {
  try {
    const { reviewId }=req.params;
    const ex=await pool.query("SELECT 1 FROM review_likes WHERE user_id=$1 AND review_id=$2",[req.userId,reviewId]);
    if (ex.rows.length>0) {
      await pool.query("DELETE FROM review_likes WHERE user_id=$1 AND review_id=$2",[req.userId,reviewId]);
      await pool.query("UPDATE reviews SET helpful=helpful-1 WHERE id=$1",[reviewId]);
      res.json({ liked:false });
    } else {
      await pool.query("INSERT INTO review_likes (user_id,review_id) VALUES ($1,$2)",[req.userId,reviewId]);
      await pool.query("UPDATE reviews SET helpful=helpful+1 WHERE id=$1",[reviewId]);
      res.json({ liked:true });
    }
  } catch (err) { res.status(500).json({ error:err.message }); }
});

module.exports = router;
