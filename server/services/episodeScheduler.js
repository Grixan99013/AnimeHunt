// server/services/episodeScheduler.js
// Планировщик выхода серий для онгоингов
// Запускается при старте сервера, проверяет каждый час
// Логика: если next_episode_at < NOW() → серия вышла → обновляем счётчик,
//         вычисляем следующую дату (+7 дней), рассылаем уведомления

const pool = require("../db");

// МСК = UTC+3
const MSK_OFFSET_HOURS = 3;

/**
 * Вычислить следующую дату выхода серии (UTC)
 * @param {number} weekday  0=Пн…6=Вс
 * @param {string} airTime  "HH:MM" в МСК
 * @param {Date}   fromDate  от какой даты искать (по умолчанию сейчас)
 * @returns {Date} UTC дата следующего эпизода
 */
function calcNextEpisodeAt(weekday, airTime, fromDate = new Date()) {
  const [h, m] = (airTime || "00:00").split(":").map(Number);
  const mskNow  = new Date(fromDate.getTime() + MSK_OFFSET_HOURS * 3600 * 1000);

  // Найти ближайший будущий weekday (0=Пн … 6=Вс → JS: 1=Пн…0=Вс)
  const jsWeekday = weekday === 6 ? 0 : weekday + 1; // конвертация: наша 0=Пн → JS 1
  const mskDay    = mskNow.getUTCDay(); // 0=Вс,1=Пн,...
  let daysAhead   = (jsWeekday - mskDay + 7) % 7;
  if (daysAhead === 0) {
    // Сегодня нужный день — проверяем не прошло ли время
    const mskHHMM = mskNow.getUTCHours() * 60 + mskNow.getUTCMinutes();
    const airHHMM = h * 60 + m;
    if (mskHHMM >= airHHMM) daysAhead = 7; // уже прошло — следующая неделя
  }

  const next = new Date(mskNow);
  next.setUTCDate(next.getUTCDate() + daysAhead);
  next.setUTCHours(h - MSK_OFFSET_HOURS, m, 0, 0); // МСК→UTC
  return next;
}

/**
 * Основная функция проверки и обновления расписания
 */
async function hasScheduleColumns() {
  try {
    const r = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name='anime' AND column_name='air_weekday'
    `);
    return r.rows.length > 0;
  } catch { return false; }
}

async function checkAndUpdateEpisodes() {
  const now = new Date();
  try {
    if (!(await hasScheduleColumns())) return; // миграция 006 ещё не применена
    // Находим онгоинги у которых next_episode_at уже прошёл
    const aired = await pool.query(`
      SELECT id, title, episodes, episodes_aired, air_weekday, air_time, next_episode_at
      FROM anime
      WHERE status = 'ongoing'
        AND next_episode_at IS NOT NULL
        AND air_weekday IS NOT NULL
        AND next_episode_at <= NOW()
    `);

    for (const anime of aired.rows) {
      const newEpisodesAired = (anime.episodes_aired || 0) + 1;
      const totalEpisodes    = anime.episodes || null;

      // Вычисляем следующую дату (+7 дней от вышедшей)
      const prevAt    = new Date(anime.next_episode_at);
      const nextAt    = new Date(prevAt.getTime() + 7 * 24 * 3600 * 1000);

      // Проверяем — не превысили ли общее число серий
      const isLastEpisode = totalEpisodes && newEpisodesAired >= totalEpisodes;
      const nextEpAt  = isLastEpisode ? null : nextAt;
      const newStatus = isLastEpisode ? "completed" : "ongoing";

      // Обновляем аниме
      await pool.query(`
        UPDATE anime
        SET episodes_aired  = $1,
            next_episode_at = $2,
            status          = $3,
            updated_at      = NOW()
        WHERE id = $4
      `, [newEpisodesAired, nextEpAt, newStatus, anime.id]);
      // episodes_aired гарантированно существует т.к. hasScheduleColumns() проверен выше

      console.log(`[EpisodeScheduler] ${anime.title}: эп.${newEpisodesAired} вышел${isLastEpisode ? " (финал)" : ""}`);

      // ── Рассылаем уведомления всем кто смотрит это аниме ─────
      await sendEpisodeNotifications(anime.id, anime.title, newEpisodesAired, nextEpAt);
    }

    if (aired.rows.length > 0) {
      console.log(`[EpisodeScheduler] Обработано ${aired.rows.length} аниме`);
    }
  } catch (err) {
    console.error("[EpisodeScheduler] Ошибка:", err.message);
  }
}

/**
 * Отправка уведомлений пользователям которые смотрят аниме
 */
async function sendEpisodeNotifications(animeId, animeTitle, episodeNumber, nextAt) {
  try {
    // Пользователи у которых аниме в списке "Смотрю" (watching)
    const watchers = await pool.query(`
      SELECT DISTINCT user_id
      FROM watchlist
      WHERE anime_id = $1 AND status = 'watching'
    `, [animeId]);

    if (watchers.rows.length === 0) return;

    const nextStr = nextAt
      ? formatNextEpisodeDate(nextAt)
      : null;

    const bodyText = nextStr
      ? `Вышел эпизод ${episodeNumber}. Следующий: ${nextStr}`
      : `Вышел финальный эпизод ${episodeNumber}!`;

    // Пакетная вставка уведомлений
    const values = watchers.rows.map((_, i) =>
      `($${i * 4 + 1}, 'new_episode', $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`
    ).join(", ");

    const params = watchers.rows.flatMap(w => [
      w.user_id, animeId, episodeNumber, bodyText,
    ]);

    await pool.query(`
      INSERT INTO notifications (user_id, type, anime_id, episode_number, body)
      VALUES ${values}
    `, params);

    console.log(`[EpisodeScheduler] Уведомления отправлены ${watchers.rows.length} пользователям (${animeTitle} эп.${episodeNumber})`);
  } catch (err) {
    console.error("[EpisodeScheduler] Ошибка рассылки уведомлений:", err.message);
  }
}

/**
 * Форматирует дату следующего эпизода: "5 мая 18:30"
 */
function formatNextEpisodeDate(utcDate) {
  // Переводим UTC → МСК
  const msk = new Date(utcDate.getTime() + MSK_OFFSET_HOURS * 3600 * 1000);
  const day  = msk.getUTCDate();
  const mon  = msk.getUTCMonth();
  const hh   = String(msk.getUTCHours()).padStart(2, "0");
  const mm   = String(msk.getUTCMinutes()).padStart(2, "0");
  const months = ["января","февраля","марта","апреля","мая","июня",
                  "июля","августа","сентября","октября","ноября","декабря"];
  return `${day} ${months[mon]} ${hh}:${mm}`;
}

/**
 * Инициализация/пересчёт next_episode_at для аниме у которых оно NULL
 * но есть air_weekday и air_time
 */
async function initMissingSchedules() {
  try {
    // Проверяем что колонки расписания уже добавлены (миграция 006)
    if (!(await hasScheduleColumns())) {
      console.log("[EpisodeScheduler] Колонки расписания ещё не добавлены — применить migrations/006_episode_schedule.sql");
      return;
    }
    const rows = await pool.query(`
      SELECT id, air_weekday, air_time, episodes_aired, aired_from
      FROM anime
      WHERE status = 'ongoing'
        AND air_weekday IS NOT NULL
        AND air_time IS NOT NULL
        AND next_episode_at IS NULL
    `);

    for (const row of rows.rows) {
      const nextAt = calcNextEpisodeAt(row.air_weekday, row.air_time);
      await pool.query(
        "UPDATE anime SET next_episode_at=$1 WHERE id=$2",
        [nextAt, row.id]
      );
    }

    if (rows.rows.length > 0) {
      console.log(`[EpisodeScheduler] Инициализировано расписание для ${rows.rows.length} аниме`);
    }
  } catch (err) {
    // Не критично — планировщик просто не инициализирует расписание
    console.warn("[EpisodeScheduler] initMissingSchedules пропущен:", err.message);
  }
}

/**
 * Запуск планировщика
 * Проверяет каждые 5 минут (для точности + не упустить полночные релизы)
 */
function startScheduler() {
  console.log("[EpisodeScheduler] Запущен");

  // Инициализируем недостающие расписания при старте
  initMissingSchedules();

  // Первая проверка через 30 секунд после старта
  setTimeout(() => {
    checkAndUpdateEpisodes();
    // Затем каждые 5 минут
    setInterval(checkAndUpdateEpisodes, 5 * 60 * 1000);
  }, 30_000);
}

module.exports = { startScheduler, calcNextEpisodeAt, formatNextEpisodeDate };
