-- Добавляем image_url к комментариям аниме и персонажей
ALTER TABLE comments           ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE character_comments ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Убедимся что parent_id есть (должен быть по схеме)
-- ALTER TABLE comments           ADD COLUMN IF NOT EXISTS parent_id INT REFERENCES comments(id) ON DELETE CASCADE;
-- ALTER TABLE character_comments ADD COLUMN IF NOT EXISTS parent_id INT REFERENCES character_comments(id) ON DELETE CASCADE;
