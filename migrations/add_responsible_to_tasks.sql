-- Migration: Add responsible_id to tasks table
-- Date: 2025-11-11
-- Description: Добавляет возможность назначения ответственного пользователя за задачу

-- Добавляем колонку responsible_id
ALTER TABLE tasks 
ADD COLUMN responsible_id UUID NULL;

-- Добавляем внешний ключ
ALTER TABLE tasks 
ADD CONSTRAINT fk_tasks_responsible 
FOREIGN KEY (responsible_id) 
REFERENCES users(id) 
ON DELETE SET NULL;

-- Добавляем индекс для быстрого поиска задач по ответственному
CREATE INDEX idx_tasks_responsible_id 
ON tasks(responsible_id);

-- Опционально: автоматически назначить владельца API ключа ответственным за существующие задачи
-- UPDATE tasks t
-- SET responsible_id = (
--   SELECT ak.user_id 
--   FROM api_keys ak 
--   WHERE ak.id = t.api_key_id
-- )
-- WHERE t.api_key_id IS NOT NULL AND t.responsible_id IS NULL;

-- Rollback:
-- ALTER TABLE tasks DROP CONSTRAINT fk_tasks_responsible;
-- DROP INDEX idx_tasks_responsible_id;
-- ALTER TABLE tasks DROP COLUMN responsible_id;






