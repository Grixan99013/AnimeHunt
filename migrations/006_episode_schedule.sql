-- migrations/006_episode_schedule.sql
-- Расписание выхода серий для онгоингов

-- Поля расписания в таблице anime
ALTER TABLE anime
  ADD COLUMN IF NOT EXISTS episodes_aired  INT     DEFAULT 0,       -- сколько серий уже вышло
  ADD COLUMN IF NOT EXISTS air_weekday     SMALLINT DEFAULT NULL,   -- день недели: 0=пн...6=вс (NULL = неизвестно)
  ADD COLUMN IF NOT EXISTS air_time        TIME     DEFAULT NULL,   -- время выхода (по московскому времени)
  ADD COLUMN IF NOT EXISTS next_episode_at TIMESTAMPTZ DEFAULT NULL; -- дата/время следующего эпизода

-- Индекс для быстрого поиска онгоингов с расписанием
CREATE INDEX IF NOT EXISTS idx_anime_next_episode ON anime(next_episode_at)
  WHERE status = 'ongoing' AND next_episode_at IS NOT NULL;

-- Тип уведомления new_episode добавляем в комментарий (уже TEXT, ограничений нет)
-- Убеждаемся что поле episode_number есть в notifications для передачи номера серии
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS episode_number INT DEFAULT NULL;

COMMENT ON COLUMN anime.episodes_aired  IS 'Количество вышедших эпизодов (обновляется автоматически)';
COMMENT ON COLUMN anime.air_weekday     IS 'День недели выхода: 0=Пн, 1=Вт, 2=Ср, 3=Чт, 4=Пт, 5=Сб, 6=Вс';
COMMENT ON COLUMN anime.air_time        IS 'Время выхода новой серии (МСК)';
COMMENT ON COLUMN anime.next_episode_at IS 'Дата и время следующего эпизода (UTC, обновляется планировщиком)';
