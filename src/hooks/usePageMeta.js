// src/hooks/usePageMeta.js
// Хук для динамических SEO мета-тегов (title, description, Open Graph)
import { useEffect } from "react";

const SITE = "AnimeHunt";

/**
 * @param {string} title      — заголовок страницы (без суффикса сайта)
 * @param {string} [description] — мета-описание
 * @param {object} [og]       — { image, url, type }
 */
export function usePageMeta(title, description, og = {}) {
  useEffect(() => {
    // Title
    const fullTitle = title ? `${title} — ${SITE}` : SITE;
    document.title = fullTitle;

    // Description
    setMeta("name", "description", description || `${SITE} — каталог аниме с оценками, рецензиями и персонажами`);

    // Open Graph
    setMeta("property", "og:title",       fullTitle);
    setMeta("property", "og:description", description || "");
    setMeta("property", "og:type",        og.type || "website");
    if (og.image) setMeta("property", "og:image", og.image);
    if (og.url)   setMeta("property", "og:url",   og.url);

    // Twitter Card
    setMeta("name", "twitter:card",        "summary_large_image");
    setMeta("name", "twitter:title",       fullTitle);
    setMeta("name", "twitter:description", description || "");

    return () => {
      document.title = SITE;
    };
  }, [title, description, og.image, og.url, og.type]);
}

function setMeta(attr, name, content) {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}
