// server/routes/sitemap.js
// Динамическая генерация sitemap.xml
const express = require('express');
const router  = express.Router();
const db      = require('../db');

const BASE_URL = process.env.SITE_URL || 'https://animehunt.ru';

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildUrl(loc, lastmod, changefreq = 'weekly', priority = '0.7') {
  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].filter(Boolean).join('\n');
}

router.get('/', async (req, res) => {
  try {
    const [animeRows, charRows] = await Promise.all([
      db.query('SELECT id, updated_at FROM anime ORDER BY id LIMIT 10000'),
      db.query('SELECT id, updated_at FROM characters ORDER BY id LIMIT 5000'),
    ]);

    const today = new Date().toISOString().slice(0, 10);

    const staticUrls = [
      buildUrl(`${BASE_URL}/`,          today, 'daily',   '1.0'),
      buildUrl(`${BASE_URL}/catalog`,   today, 'daily',   '0.9'),
      buildUrl(`${BASE_URL}/characters`,today, 'weekly',  '0.8'),
    ];

    const animeUrls = animeRows.rows.map((row) => {
      const lastmod = row.updated_at
        ? new Date(row.updated_at).toISOString().slice(0, 10)
        : today;
      return buildUrl(`${BASE_URL}/anime/${row.id}`, lastmod, 'weekly', '0.7');
    });

    const charUrls = charRows.rows.map((row) => {
      const lastmod = row.updated_at
        ? new Date(row.updated_at).toISOString().slice(0, 10)
        : today;
      return buildUrl(`${BASE_URL}/character/${row.id}`, lastmod, 'monthly', '0.5');
    });

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...staticUrls,
      ...animeUrls,
      ...charUrls,
      '</urlset>',
    ].join('\n');

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600'); // кэш 1 час
    res.send(xml);
  } catch (err) {
    console.error('Sitemap error:', err);
    res.status(500).send('<?xml version="1.0"?><error>Internal Server Error</error>');
  }
});

module.exports = router;
