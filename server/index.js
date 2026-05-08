require("dotenv").config();
const path        = require("path");

// ── Критическая проверка переменных окружения ─────────────────
if (!process.env.JWT_SECRET) {
  console.error("❌ FATAL: JWT_SECRET не задан в .env! Сервер не может стартовать безопасно.");
  process.exit(1);
}
const express     = require("express");
const cors        = require("cors");
const helmet      = require("helmet");
const compression = require("compression");
const morgan      = require("morgan");
const rateLimit   = require("express-rate-limit");

const app = express();

// ── Авто-миграция при старте ──────────────────────────────────
// Добавляет недостающие колонки безопасно (IF NOT EXISTS через DO $$)
async function runMigrations() {
  const pool = require("./db");
  try {
    await pool.query(`
      DO $$ BEGIN
        -- Расширенный профиль пользователя (003_stage4_features)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bio') THEN
          ALTER TABLE users ADD COLUMN bio TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='banner_url') THEN
          ALTER TABLE users ADD COLUMN banner_url TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='location') THEN
          ALTER TABLE users ADD COLUMN location VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='website') THEN
          ALTER TABLE users ADD COLUMN website TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='social_links') THEN
          ALTER TABLE users ADD COLUMN social_links JSONB DEFAULT '{}';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='hide_email') THEN
          ALTER TABLE users ADD COLUMN hide_email BOOLEAN NOT NULL DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='hide_watchlist') THEN
          ALTER TABLE users ADD COLUMN hide_watchlist BOOLEAN NOT NULL DEFAULT FALSE;
        END IF;
        -- Закреплённые рецензии
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='is_pinned') THEN
          ALTER TABLE reviews ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT FALSE;
        END IF;
        -- Сезонный фильтр в аниме
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='anime' AND column_name='season_year') THEN
          ALTER TABLE anime ADD COLUMN season_year SMALLINT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='anime' AND column_name='season_quarter') THEN
          ALTER TABLE anime ADD COLUMN season_quarter SMALLINT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='anime' AND column_name='age_rating') THEN
          ALTER TABLE anime ADD COLUMN age_rating VARCHAR(10);
        END IF;
      END $$;
    `);

    // Таблица жалоб (создаём если нет)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id           SERIAL PRIMARY KEY,
        reporter_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        comment_id   INT REFERENCES comments(id) ON DELETE CASCADE,
        review_id    INT REFERENCES reviews(id)  ON DELETE CASCADE,
        reason       VARCHAR(50)  NOT NULL DEFAULT 'spam',
        details      TEXT,
        status       VARCHAR(20)  NOT NULL DEFAULT 'pending',
        created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT reports_target_check CHECK (
          (comment_id IS NOT NULL AND review_id IS NULL) OR
          (comment_id IS NULL     AND review_id IS NOT NULL)
        )
      );
    `);

    // Notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id           SERIAL PRIMARY KEY,
        user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        actor_id     INT REFERENCES users(id) ON DELETE SET NULL,
        type         VARCHAR(40) NOT NULL,
        anime_id     INT REFERENCES anime(id) ON DELETE CASCADE,
        comment_id   INT REFERENCES comments(id) ON DELETE CASCADE,
        review_id    INT REFERENCES reviews(id) ON DELETE CASCADE,
        character_id INT REFERENCES characters(id) ON DELETE CASCADE,
        is_read      BOOLEAN NOT NULL DEFAULT FALSE,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);`);

    // Collections tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS collections (
        id          SERIAL PRIMARY KEY,
        user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title       VARCHAR(200) NOT NULL,
        description TEXT,
        is_public   BOOLEAN NOT NULL DEFAULT TRUE,
        cover_url   TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS collection_items (
        collection_id INT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
        anime_id      INT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
        sort_order    INT NOT NULL DEFAULT 0,
        note          TEXT,
        added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (collection_id, anime_id)
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id);`);

    // News table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS news (
        id          SERIAL PRIMARY KEY,
        title       VARCHAR(300) NOT NULL,
        body        TEXT NOT NULL,
        cover_url   TEXT,
        author_id   INT REFERENCES users(id) ON DELETE SET NULL,
        is_published BOOLEAN NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_news_published ON news(is_published, created_at DESC);`);

    console.log("✅ Migrations OK");
  } catch (err) {
    console.error("❌ Migration error:", err.message);
  }
}
runMigrations();

// ── Security headers ─────────────────────────────────────────
// crossOriginResourcePolicy: "cross-origin" — разрешает браузеру
// загружать /uploads/* с другого origin (фронт :5173 → бэк :3001)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// ── HTTP-логи ────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ── CORS ─────────────────────────────────────────────────────
const allowedOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
app.use(cors({ origin: allowedOrigin, credentials: true }));

// ── Сжатие ───────────────────────────────────────────────────
app.use(compression());

// ── Rate limiting для auth-роутов ────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Слишком много запросов, попробуйте позже" },
});
app.use("/api/auth", authLimiter);

// ── Body parser ───────────────────────────────────────────────
app.use(express.json({ limit: "20mb" }));

// ── Статика uploads ──────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── В продакшене раздаём React SPA из /dist ───────────────────
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "..", "dist");
  app.use(express.static(distPath, { index: false }));
  // SPA fallback — все не-API маршруты → index.html
  app.get(/^(?!\/api|\/uploads).*/, (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// ── Роуты ────────────────────────────────────────────────────
app.use("/api/auth",       require("./routes/auth"));
app.use("/api/upload",     require("./routes/upload"));
app.use("/api/anime",      require("./routes/anime"));
app.use("/api/watchlist",  require("./routes/watchlist"));
app.use("/api/user",       require("./routes/user"));
app.use("/api/characters", require("./routes/characters"));
app.use("/api/media",      require("./routes/media"));
app.use("/api/admin",      require("./routes/admin"));
app.use("/api/reports",       require("./routes/reports"));
app.use("/api/news",          require("./routes/news"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/collections",   require("./routes/collections"));

// ── Sitemap ──────────────────────────────────────────────────
app.use("/sitemap.xml", require("./routes/sitemap"));

// ── Health check ─────────────────────────────────────────────
app.get("/api/health", (req, res) => res.json({ ok: true, env: process.env.NODE_ENV }));

// ── Глобальный обработчик ошибок ─────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || "Внутренняя ошибка сервера" });
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log("🚀 Server running on http://localhost:" + PORT);
  console.log("   CORS allowed: " + allowedOrigin);
  console.log("   ENV: " + (process.env.NODE_ENV || "development"));
});

// ── Episode Scheduler (выход серий онгоингов) ────────────────
const { startScheduler } = require("./services/episodeScheduler");
startScheduler();

// ── Graceful Shutdown ─────────────────────────────────────────
// Корректное завершение: ждём окончания активных соединений
// перед выходом (важно для Railway / Docker / pm2)
function gracefulShutdown(signal) {
  console.log(`\n[${signal}] Graceful shutdown...`);
  server.close(async () => {
    console.log("HTTP server closed.");
    try {
      const db = require("./db");
      await db.end();           // закрываем пул PostgreSQL
      console.log("DB pool closed.");
    } catch (e) {
      console.error("DB pool close error:", e.message);
    }
    process.exit(0);
  });

  // Принудительный выход если 10 сек не хватило
  setTimeout(() => {
    console.error("Shutdown timeout — forcing exit.");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT",  () => gracefulShutdown("SIGINT"));
