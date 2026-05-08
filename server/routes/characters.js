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
  try {
    const p = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    req.userId = p.id;
    req.roleId = p.role;
    next();
  }
  catch { res.status(401).json({ error: "Токен недействителен" }); }
}
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer "))
    return res.status(401).json({ error: "Не авторизован" });
  try {
    const p = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    if (p.role !== 1) return res.status(403).json({ error: "Только для администраторов" });
    req.userId = p.id;
    req.roleId = p.role;
    next();
  }
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
    if (req.query.role && req.query.role !== "all") {
      // role_in_anime фильтр: персонаж должен иметь эту роль хотя бы в одном аниме
      conds.push(`c.id IN (SELECT ca_r.character_id FROM character_appearances ca_r WHERE ca_r.role_in_anime = $${i})`);
      params.push(req.query.role); i++;
    }
    if (req.query.anime_id) {
      const aid = parseInt(req.query.anime_id, 10);
      if (!isNaN(aid)) {
        conds.push(`c.id IN (SELECT ca_a.character_id FROM character_appearances ca_a WHERE ca_a.anime_id = $${i})`);
        params.push(aid); i++;
      }
    }

    let orderBy = "favorites_count DESC NULLS LAST, c.name ASC";
    if (sort === "name")   orderBy = "c.name ASC";
    if (sort === "newest") orderBy = "c.id DESC";

    params.push(Number(limit), Number(offset));
    const li = i++, oi = i++;

    const countSql = `SELECT COUNT(DISTINCT c.id)::int AS total FROM characters c WHERE ${conds.join(" AND ")}`;

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

    const [result, countResult] = await Promise.all([
      pool.query(sql, params),
      pool.query(countSql, params.slice(0, params.length - 2)), // без limit/offset
    ]);
    res.json({ items: result.rows, total: countResult.rows[0].total });
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
               u.username, u.id AS user_id, u.avatar_url,
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


// ── PUT /api/characters/:id — редактирование персонажа (только admin) ──
router.put("/:id", requireAuth, async (req, res) => {
  try {
    // Проверяем что это admin (role_id = 1)
    const userQ = await pool.query("SELECT role_id FROM users WHERE id=$1", [req.userId]);
    if (!userQ.rows[0] || userQ.rows[0].role_id !== 1) {
      return res.status(403).json({ error: "Только администратор может редактировать персонажей" });
    }

    const { id } = req.params;
    const {
      name, name_jp, role, description,
      image_url, age, gender, abilities,
    } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: "Укажите имя персонажа" });

    const validRoles = ["main", "supporting", "extra"];
    const charRole = validRoles.includes(role) ? role : "supporting";

    const r = await pool.query(`
      UPDATE characters
      SET name=$1, name_jp=$2, role=$3, description=$4,
          image_url=$5, age=$6, gender=$7, abilities=$8
      WHERE id=$9
      RETURNING *
    `, [
      name.trim(),
      name_jp?.trim() || null,
      charRole,
      description?.trim() || null,
      image_url?.trim() || null,
      age?.trim() || null,
      gender?.trim() || null,
      abilities?.trim() || null,
      id,
    ]);

    if (!r.rows[0]) return res.status(404).json({ error: "Персонаж не найден" });
    res.json({ ok: true, character: r.rows[0] });
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

    const u = await pool.query("SELECT username, avatar_url FROM users WHERE id=$1", [req.userId]);
    res.json({ ...r.rows[0], username: u.rows[0].username, avatar_url: u.rows[0].avatar_url, user_id: req.userId, parent_username: parentUsername });
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

// ── DELETE /api/characters/comments/:commentId ───────────────
router.delete("/comments/:commentId", requireAuth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const auth = req.headers.authorization;
    const p = require("jsonwebtoken").verify(auth.slice(7), process.env.JWT_SECRET);
    const isModAdmin = p.role === 1 || p.role === 2;
    const q = await pool.query("SELECT user_id FROM character_comments WHERE id=$1 AND is_deleted=FALSE", [commentId]);
    if (!q.rows[0]) return res.status(404).json({ error: "Комментарий не найден" });
    if (q.rows[0].user_id !== req.userId && !isModAdmin)
      return res.status(403).json({ error: "Нет доступа" });
    await pool.query("UPDATE character_comments SET is_deleted=TRUE WHERE id=$1", [commentId]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH /api/characters/comments/:commentId ─────────────────
router.patch("/comments/:commentId", requireAuth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ error: "Пустой комментарий" });
    const q = await pool.query("SELECT user_id, created_at FROM character_comments WHERE id=$1 AND is_deleted=FALSE", [commentId]);
    if (!q.rows[0]) return res.status(404).json({ error: "Комментарий не найден" });
    if (q.rows[0].user_id !== req.userId) return res.status(403).json({ error: "Нет доступа" });
    const age = (Date.now() - new Date(q.rows[0].created_at).getTime()) / 1000 / 60;
    if (age > 15) return res.status(403).json({ error: "Редактирование доступно только в течение 15 минут после публикации" });
    const r = await pool.query(
      "UPDATE character_comments SET body=$1, updated_at=NOW() WHERE id=$2 RETURNING body, updated_at",
      [body.trim(), commentId]
    );
    res.json({ ok: true, ...r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


module.exports = router;

// ══════════════════════════════════════════════════════════════
// СЭЙЮ — поиск, добавление/удаление к персонажу
// ══════════════════════════════════════════════════════════════

// GET /api/characters/seiyu/search?q=&limit=10
router.get("/seiyu/search", async (req, res) => {
  try {
    const { q = "", limit = 10 } = req.query;
    const r = await pool.query(
      `SELECT id, name, name_jp, image_url, agency
       FROM seiyu
       WHERE name ILIKE $1 OR name_jp ILIKE $1
       ORDER BY name LIMIT $2`,
      [`%${q}%`, Number(limit)]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/characters/seiyu — создать нового сэйю
router.post("/seiyu", requireAdmin, async (req, res) => {
  try {
    const { name, name_jp, bio, image_url, born_at, agency } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Укажите имя" });
    const r = await pool.query(
      `INSERT INTO seiyu (name, name_jp, bio, image_url, born_at, agency)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name.trim(), name_jp?.trim()||null, bio?.trim()||null,
       image_url?.trim()||null, born_at||null, agency?.trim()||null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/characters/:id/seiyu — привязать сэйю к персонажу
router.post("/:id/seiyu", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { seiyu_id, language = "ja" } = req.body;
    if (!seiyu_id) return res.status(400).json({ error: "Укажите seiyu_id" });
    await pool.query(
      `INSERT INTO character_seiyu (character_id, seiyu_id, language)
       VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [id, seiyu_id, language]
    );
    const s = await pool.query(
      "SELECT s.*, cs.language FROM seiyu s JOIN character_seiyu cs ON cs.seiyu_id=s.id WHERE cs.character_id=$1 AND cs.seiyu_id=$2",
      [id, seiyu_id]
    );
    res.status(201).json(s.rows[0] || { ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/characters/:id/seiyu/:seiyuId
router.delete("/:id/seiyu/:seiyuId", requireAdmin, async (req, res) => {
  try {
    const { id, seiyuId } = req.params;
    await pool.query(
      "DELETE FROM character_seiyu WHERE character_id=$1 AND seiyu_id=$2",
      [id, seiyuId]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ══════════════════════════════════════════════════════════════
// АВТОРЫ (STAFF) — поиск, добавление, привязка к аниме
// ══════════════════════════════════════════════════════════════

// GET /api/characters/staff/search?q=&limit=10
router.get("/staff/search", async (req, res) => {
  try {
    const { q = "", limit = 10 } = req.query;
    const r = await pool.query(
      `SELECT id, name, name_jp, role, image_url
       FROM staff
       WHERE name ILIKE $1 OR name_jp ILIKE $1
       ORDER BY name LIMIT $2`,
      [`%${q}%`, Number(limit)]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/characters/staff — создать нового автора
router.post("/staff", requireAdmin, async (req, res) => {
  try {
    const { name, name_jp, role, bio, image_url, born_at } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Укажите имя" });
    const r = await pool.query(
      `INSERT INTO staff (name, name_jp, role, bio, image_url, born_at)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name.trim(), name_jp?.trim()||null, role?.trim()||null,
       bio?.trim()||null, image_url?.trim()||null, born_at||null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
