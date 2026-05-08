const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host:               process.env.DB_HOST,
  port:               process.env.DB_PORT     || 5432,
  database:           process.env.DB_NAME,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  // Connection pool tuning
  max:                parseInt(process.env.DB_POOL_MAX)  || 10,  // максимум соединений
  idleTimeoutMillis:  parseInt(process.env.DB_IDLE_MS)   || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT_MS) || 5000,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  console.error("Unexpected idle client error:", err.message);
});

pool.connect()
  .then(client => {
    console.log("✅ PostgreSQL connected");
    client.release();
  })
  .catch(err => console.error("❌ DB connection error:", err.message));

module.exports = pool;
