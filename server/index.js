require("dotenv").config();
const path    = require("path");
const express = require("express");
const cors    = require("cors");
const app     = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "20mb" }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth",       require("./routes/auth"));
app.use("/api/upload",     require("./routes/upload"));
app.use("/api/anime",      require("./routes/anime"));
app.use("/api/watchlist",  require("./routes/watchlist"));
app.use("/api/user",       require("./routes/user"));
app.use("/api/characters", require("./routes/characters"));
// /api/seasons — удалён, сезоны теперь обычные anime
app.use("/api/media",      require("./routes/media"));

app.listen(process.env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${process.env.PORT}`);
});
