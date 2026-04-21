const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const { requireAdmin } = require("../middleware/admin");

const router = express.Router();

const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safe = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"].includes(ext) ? ext : ".bin";
    cb(null, `${crypto.randomUUID()}${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|gif|webp|avif|pjpeg|x-png)$/i.test(file.mimetype);
    if (!ok) return cb(new Error("Допустимы только изображения"));
    cb(null, true);
  },
});

router.post("/", requireAdmin, (req, res) => {
  upload.single("file")(req, res, err => {
    if (err) {
      const msg = err.message || "Ошибка загрузки";
      return res.status(400).json({ error: msg });
    }
    if (!req.file) return res.status(400).json({ error: "Файл не получен" });
    const base = `${req.protocol}://${req.get("host")}`;
    const url = `${base}/uploads/${req.file.filename}`;
    res.json({ url });
  });
});

module.exports = router;
