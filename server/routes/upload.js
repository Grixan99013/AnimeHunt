const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const { requireAdmin } = require("../middleware/admin");

let sharp;
try { sharp = require("sharp"); } catch { sharp = null; }

const router = express.Router();

const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer использует memoryStorage, чтобы sharp мог обработать буфер до записи
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // принимаем до 20 МБ, после сжатия будет значительно меньше
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|gif|webp|avif|pjpeg|x-png)$/i.test(file.mimetype);
    if (!ok) return cb(new Error("Допустимы только изображения"));
    cb(null, true);
  },
});

// Сжимает изображение через sharp (если доступен) и сохраняет как WebP
async function processAndSave(buffer, mimetype) {
  const filename = `${crypto.randomUUID()}.webp`;
  const outPath = path.join(uploadsDir, filename);

  if (sharp) {
    const isGif = mimetype === "image/gif";
    // GIF сохраняем как есть (анимация), остальное → WebP ≤1920px, качество 82
    if (isGif) {
      const gifName = `${crypto.randomUUID()}.gif`;
      const gifPath = path.join(uploadsDir, gifName);
      fs.writeFileSync(gifPath, buffer);
      return gifName;
    }
    await sharp(buffer)
      .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(outPath);
  } else {
    // Fallback: пишем как есть
    fs.writeFileSync(outPath, buffer);
  }
  return filename;
}

router.post("/", requireAdmin, (req, res) => {
  upload.single("file")(req, res, async err => {
    if (err) {
      const msg = err.message || "Ошибка загрузки";
      return res.status(400).json({ error: msg });
    }
    if (!req.file) return res.status(400).json({ error: "Файл не получен" });
    try {
      const filename = await processAndSave(req.file.buffer, req.file.mimetype);
      const base = `${req.protocol}://${req.get("host")}`;
      const url = `${base}/uploads/${filename}`;
      res.json({ url });
    } catch (e) {
      console.error("Image processing error:", e);
      res.status(500).json({ error: "Ошибка обработки изображения" });
    }
  });
});

module.exports = router;
