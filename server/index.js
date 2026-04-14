require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const app     = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "20mb" }));

app.use("/api/auth",       require("./routes/auth"));
app.use("/api/anime",      require("./routes/anime"));
app.use("/api/watchlist",  require("./routes/watchlist"));
app.use("/api/user",       require("./routes/user"));
app.use("/api/characters", require("./routes/characters"));
// /api/seasons — удалён, сезоны теперь обычные anime

app.listen(process.env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${process.env.PORT}`);
});
