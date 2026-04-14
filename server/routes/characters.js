// server/routes/characters.js
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

// ── GET /api/characters — каталог персонажей ─────────────────
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { q, gender, sort = "favorites", limit = 60, offset = 0 } = req.query;

    const conds  = ["1=1"];
    const params = [];
    let i = 1;

    if (q) {
      conds.push(`(c.name ILIKE $${i} OR c.name_jp ILIKE $${i})`);
      params.push(`%${q}%`); i++;
    }
    if (gender && gender !== "all") {
      conds.push(`c.gender = $${i}`);
      params.push(gender); i++;
    }

    let orderBy = "favorites_count DESC NULLS LAST, c.name ASC";
    if (sort === "name")   orderBy = "c.name ASC";
    if (sort === "newest") orderBy = "c.id DESC";

    params.push(Number(limit), Number(offset));
    const li = i++, oi = i++;

    const sql = `
      SELECT
        c.id, c.name, c.name_jp, c.role, c.image_url,
        c.gender, c.age, c.abilities,
        COUNT(DISTINCT f.user_id)::int AS favorites_count,
        (SELECT ca2.anime_id FROM character_appearances ca2
         WHERE ca2.character_id = c.id ORDER BY ca2.anime_id ASC LIMIT 1) AS primary_anime_id,
        (SELECT a2.title FROM anime a2
         JOIN character_appearances ca3 ON ca3.anime_id = a2.id
         WHERE ca3.character_id = c.id ORDER BY ca3.anime_id ASC LIMIT 1) AS primary_anime_title,
        (SELECT a2.poster_url FROM anime a2
         JOIN character_appearances ca4 ON ca4.anime_id = a2.id
         WHERE ca4.character_id = c.id ORDER BY ca4.anime_id ASC LIMIT 1) AS primary_anime_poster
      FROM characters c
      LEFT JOIN favorites f ON f.character_id = c.id
      WHERE ${conds.join(" AND ")}
      GROUP BY c.id
      ORDER BY ${orderBy}
      LIMIT $${li} OFFSET $${oi}
    `;

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/characters/:id ───────────────────────────────────
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const charQ = await pool.query(
      "SELECT * FROM characters WHERE id = $1",
      [id]
    );
    if (!charQ.rows[0]) return res.status(404).json({ error: "Персонаж не найден" });
    const char = charQ.rows[0];

    // Все аниме персонажа
    const appearancesQ = await pool.query(`
      SELECT a.id, a.title, a.title_jp, a.poster_url,
             a.season_num, a.status, a.episodes,
             a.aired_from, ca.role_in_anime
      FROM character_appearances ca
      JOIN anime a ON a.id = ca.anime_id
      WHERE ca.character_id = $1
      ORDER BY a.aired_from ASC NULLS LAST, a.id ASC
    `, [id]);
    const appearances  = appearancesQ.rows;
    const primaryAnime = appearances[0] || null;

    const gender  = char.gender || '';
    const animeIds = appearances.map(a => a.id);

    const [
      seiyuQ,
      commentsQ,
      favQ,
      favCountQ,
      candidatesQ,
      myShipQ,
    ] = await Promise.all([

      pool.query(`
        SELECT s.*, cs.language FROM seiyu s
        JOIN character_seiyu cs ON cs.seiyu_id = s.id
        WHERE cs.character_id = $1
      `, [id]),

      pool.query(`
        SELECT cc.id, cc.body, cc.created_at, cc.parent_id, cc.image_url,
               u.username, u.id AS user_id,
               pu.username AS parent_username
        FROM character_comments cc
        JOIN users u ON u.id = cc.user_id
        LEFT JOIN character_comments pc ON pc.id = cc.parent_id
        LEFT JOIN users pu ON pu.id = pc.user_id
        WHERE cc.character_id = $1 AND cc.is_deleted = FALSE
        ORDER BY COALESCE(cc.parent_id, cc.id) ASC, cc.created_at ASC
      `, [id]),

      req.userId
        ? pool.query(
            "SELECT 1 FROM favorites WHERE user_id=$1 AND character_id=$2",
            [req.userId, id]
          )
        : Promise.resolve({ rows: [] }),

      pool.query(
        "SELECT COUNT(*)::int AS count FROM favorites WHERE character_id=$1",
        [id]
      ),

      // Кандидаты для шипперинга: противоположный пол из тех же аниме
      animeIds.length > 0
        ? pool.query(`
            SELECT DISTINCT ON (c.id)
                   c.id, c.name, c.name_jp, c.image_url, c.gender, c.role,
                   a.title AS anime_title
            FROM character_appearances ca
            JOIN characters c  ON c.id  = ca.character_id
            JOIN anime a       ON a.id  = ca.anime_id
            WHERE ca.anime_id  = ANY($1::int[])
              AND ca.character_id != $2
              AND c.gender IS NOT NULL
              AND c.gender != ''
              AND c.gender != 'Неизвестно'
              AND c.gender != $3
            ORDER BY c.id, a.aired_from ASC NULLS LAST
          `, [animeIds, Number(id), gender])
        : Promise.resolve({ rows: [] }),

      req.userId
        ? pool.query(`
            SELECT s.shipped_with,
                   c.name      AS shipped_name,
                   c.image_url AS shipped_img
            FROM shippings s
            JOIN characters c ON c.id = s.shipped_with
            WHERE s.user_id = $1 AND s.character_id = $2
          `, [req.userId, id])
        : Promise.resolve({ rows: [] }),
    ]);

    // ── Двусторонний топ шипперинга ──────────────────────────
    // Считаем голоса со ОБЕИХ сторон пары:
    //   1) Пользователи, которые шипперят ЭТОГО персонажа с кем-то
    //      (character_id = id) → партнёр = shipped_with
    //   2) Пользователи, которые шипперят кого-то С ЭТИМ персонажем
    //      (shipped_with = id) → партнёр = character_id
    // Объединяем в одну таблицу (partner_id) и считаем суммарно.
    const topShipsQ = await pool.query(`
      SELECT
        partner_id,
        c.name      AS shipped_name,
        c.image_url AS shipped_img,
        COUNT(DISTINCT user_id)::int AS votes
      FROM (
        -- Направление А: я (character_id) → shipped_with
        SELECT user_id, shipped_with AS partner_id
        FROM shippings
        WHERE character_id = $1

        UNION ALL

        -- Направление Б: кто-то (character_id) → я (shipped_with)
        SELECT user_id, character_id AS partner_id
        FROM shippings
        WHERE shipped_with = $1
      ) pairs
      JOIN characters c ON c.id = pairs.partner_id
      GROUP BY partner_id, c.name, c.image_url
      ORDER BY votes DESC
      LIMIT 10
    `, [id]);

    // Мой шип (текущий пользователь)
    // Сохраняем shipped_with + проверяем обратный шип
    let myShip = myShipQ.rows[0] || null;

    // Если у пользователя нет прямого шипа (character_id = id),
    // проверяем, шипперит ли он этого персонажа «с другой стороны»
    // (он поставил шип character_id=X, shipped_with=id)
    if (!myShip && req.userId) {
      const reverseQ = await pool.query(`
        SELECT s.character_id AS shipped_with,
               c.name         AS shipped_name,
               c.image_url    AS shipped_img
        FROM shippings s
        JOIN characters c ON c.id = s.character_id
        WHERE s.user_id = $1 AND s.shipped_with = $2
        LIMIT 1
      `, [req.userId, id]);
      // Не показываем как «мой шип» — это шип другого персонажа,
      // но можно добавить флаг чтобы UI показал «вы шипперите X с этим персонажем»
      if (reverseQ.rows[0]) {
        myShip = { ...reverseQ.rows[0], is_reverse: true };
      }
    }

    res.json({
      ...char,
      primary_anime:    primaryAnime,
      seiyu:            seiyuQ.rows,
      comments:         commentsQ.rows,
      is_favorite:      favQ.rows.length > 0,
      favorites_count:  favCountQ.rows[0].count,
      appearances,
      ship_candidates:  candidatesQ.rows,
      my_ship:          myShip,
      top_ships:        topShipsQ.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/characters/:id/favorite ────────────────────────
router.post("/:id/favorite", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const ex = await pool.query(
      "SELECT 1 FROM favorites WHERE user_id=$1 AND character_id=$2",
      [req.userId, id]
    );
    if (ex.rows.length > 0) {
      await pool.query("DELETE FROM favorites WHERE user_id=$1 AND character_id=$2", [req.userId, id]);
    } else {
      await pool.query("INSERT INTO favorites (user_id, character_id) VALUES ($1,$2)", [req.userId, id]);
    }
    const cnt = await pool.query(
      "SELECT COUNT(*)::int AS count FROM favorites WHERE character_id=$1", [id]
    );
    res.json({ is_favorite: ex.rows.length === 0, favorites_count: cnt.rows[0].count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/characters/:id/comments ────────────────────────
router.post("/:id/comments", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { body, parent_id, image_url } = req.body;
    if (!body?.trim() && !image_url) return res.status(400).json({ error: "Пустой комментарий" });

    let parentUsername = null;
    if (parent_id) {
      const pq = await pool.query(
        "SELECT u.username FROM character_comments c JOIN users u ON u.id=c.user_id WHERE c.id=$1",
        [parent_id]
      );
      parentUsername = pq.rows[0]?.username || null;
    }

    const r = await pool.query(`
      INSERT INTO character_comments (user_id, character_id, body, parent_id, image_url)
      VALUES ($1,$2,$3,$4,$5) RETURNING id, body, created_at, parent_id, image_url
    `, [req.userId, id, (body || "").trim(), parent_id || null, image_url || null]);

    const u = await pool.query("SELECT username FROM users WHERE id=$1", [req.userId]);
    res.json({ ...r.rows[0], username: u.rows[0].username, user_id: req.userId, parent_username: parentUsername });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/characters/:id/ship ────────────────────────────
router.post("/:id/ship", requireAuth, async (req, res) => {
  try {
    const charId = req.params.id;
    const { shipped_with } = req.body;

    if (!shipped_with) return res.status(400).json({ error: "Укажите персонажа" });
    if (String(charId) === String(shipped_with))
      return res.status(400).json({ error: "Нельзя шипперить персонажа с самим собой" });

    const checkQ = await pool.query(
      "SELECT id FROM characters WHERE id = ANY($1::int[])",
      [[Number(charId), Number(shipped_with)]]
    );
    if (checkQ.rows.length < 2)
      return res.status(404).json({ error: "Персонаж не найден" });

    await pool.query(`
      INSERT INTO shippings (user_id, character_id, shipped_with)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, character_id) DO UPDATE SET shipped_with=$3, created_at=NOW()
    `, [req.userId, charId, shipped_with]);

    // Возвращаем двусторонний топ для текущего персонажа
    const [topQ, myShipQ] = await Promise.all([
      pool.query(`
        SELECT partner_id,
               c.name      AS shipped_name,
               c.image_url AS shipped_img,
               COUNT(DISTINCT user_id)::int AS votes
        FROM (
          SELECT user_id, shipped_with AS partner_id FROM shippings WHERE character_id=$1
          UNION ALL
          SELECT user_id, character_id AS partner_id FROM shippings WHERE shipped_with=$1
        ) pairs
        JOIN characters c ON c.id = pairs.partner_id
        GROUP BY partner_id, c.name, c.image_url
        ORDER BY votes DESC LIMIT 10
      `, [charId]),
      pool.query(`
        SELECT s.shipped_with, c.name AS shipped_name, c.image_url AS shipped_img
        FROM shippings s JOIN characters c ON c.id = s.shipped_with
        WHERE s.user_id=$1 AND s.character_id=$2
      `, [req.userId, charId]),
    ]);

    res.json({ ok: true, my_ship: myShipQ.rows[0] || null, top_ships: topQ.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/characters/:id/ship ──────────────────────────
router.delete("/:id/ship", requireAuth, async (req, res) => {
  try {
    const charId = req.params.id;
    await pool.query(
      "DELETE FROM shippings WHERE user_id=$1 AND character_id=$2",
      [req.userId, charId]
    );
    // Двусторонний топ после удаления
    const top = await pool.query(`
      SELECT partner_id,
             c.name      AS shipped_name,
             c.image_url AS shipped_img,
             COUNT(DISTINCT user_id)::int AS votes
      FROM (
        SELECT user_id, shipped_with AS partner_id FROM shippings WHERE character_id=$1
        UNION ALL
        SELECT user_id, character_id AS partner_id FROM shippings WHERE shipped_with=$1
      ) pairs
      JOIN characters c ON c.id = pairs.partner_id
      GROUP BY partner_id, c.name, c.image_url
      ORDER BY votes DESC LIMIT 10
    `, [charId]);
    res.json({ ok: true, my_ship: null, top_ships: top.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
