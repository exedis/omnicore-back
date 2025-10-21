# Рефакторинг Social модуля

## Обзор изменений

Модуль social был полностью переработан для упрощения архитектуры и улучшения производительности. Теперь он отвечает только за связывание сообщений webhook с их статусом отправки в Telegram, а настройки Telegram перенесены в таблицу пользователя.

## Основные изменения

### 1. **Упрощение SocialMessage entity**

- Удалено поле `platform` (теперь только для Telegram)
- Удалена связь с `SocialSettings`
- Упрощена структура для связи только с webhook
- Изменено название таблицы на `social_messages`

### 2. **Перенос настроек в User entity**

Добавлены новые поля в таблицу пользователей:

```typescript
@Column({ default: false })
telegramEnabled: boolean; // Включена ли пересылка в Telegram

@Column({ nullable: true })
telegramChatId: string; // ID чата пользователя в Telegram

@Column({ nullable: true })
telegramUsername: string; // Username пользователя в Telegram

@Column({ type: 'jsonb', nullable: true })
telegramSettings: Record<string, any>; // Дополнительные настройки Telegram
```

### 3. **Удаление SocialSettings entity**

- Полностью удалена таблица `user_social_settings`
- Удалены связанные DTO файлы
- Упрощена логика управления настройками

### 4. **Обновление SocialService**

Новые методы:

- `createSocialMessage()` - создание записи о сообщении
- `updateMessageStatus()` - обновление статуса сообщения
- `isTelegramEnabled()` - проверка включенности Telegram
- `getTelegramSettings()` - получение настроек Telegram
- `updateTelegramSettings()` - обновление настроек Telegram

### 5. **Обновление SenderService**

- Использует новые методы SocialService
- Работает с настройками из таблицы User
- Упрощена логика проверки настроек

### 6. **Обновление TelegramBotService**

- Работает напрямую с User entity
- Обновляет настройки пользователя при авторизации
- Упрощена проверка авторизации

## Новая архитектура

```
Webhook → Sender → SocialService → SocialMessage
                ↓
            User.telegramSettings
                ↓
         TelegramBotService
```

## Преимущества рефакторинга

### 1. **Упрощение архитектуры**

- Меньше сущностей и связей
- Более понятная структура данных
- Упрощенная логика управления настройками

### 2. **Улучшение производительности**

- Меньше JOIN операций
- Прямой доступ к настройкам пользователя
- Упрощенные запросы к базе данных

### 3. **Лучшая масштабируемость**

- Легче добавлять новые платформы
- Проще управлять настройками
- Меньше дублирования кода

### 4. **Упрощение API**

- Меньше эндпоинтов
- Более понятные методы
- Упрощенная структура ответов

## Миграция данных

При развертывании изменений необходимо:

1. **Создать миграцию для User entity:**

```sql
ALTER TABLE users ADD COLUMN telegram_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN telegram_chat_id VARCHAR;
ALTER TABLE users ADD COLUMN telegram_username VARCHAR;
ALTER TABLE users ADD COLUMN telegram_settings JSONB;
```

2. **Перенести данные из SocialSettings:**

```sql
UPDATE users
SET telegram_enabled = ss.is_enabled,
    telegram_chat_id = ss.chat_id,
    telegram_username = ss.additional_settings->>'username',
    telegram_settings = ss.additional_settings
FROM user_social_settings ss
WHERE users.id = ss.user_id
AND ss.platform = 'telegram';
```

3. **Удалить старые таблицы:**

```sql
DROP TABLE user_social_settings;
DROP TABLE user_social_messages;
```

4. **Создать новую таблицу SocialMessage:**

```sql
CREATE TABLE social_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  status VARCHAR NOT NULL DEFAULT 'pending',
  content TEXT NOT NULL,
  metadata JSONB,
  external_message_id VARCHAR,
  error_message TEXT,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Новые API эндпоинты

### SocialController

- `GET /social/telegram/settings` - получение настроек Telegram
- `PUT /social/telegram/settings` - обновление настроек Telegram
- `GET /social/messages` - история сообщений
- `GET /social/stats` - статистика сообщений
- `GET /social/messages/:id` - получение сообщения по ID
- `GET /social/webhook/:webhookId/messages` - сообщения по webhook
- `DELETE /social/messages/:id` - удаление сообщения

### SenderController (без изменений)

- `POST /sender/process-webhook/:webhookId` - обработка webhook
- `GET /sender/stats` - статистика отправки
- `GET /sender/history` - история отправки

## Обратная совместимость

⚠️ **ВНИМАНИЕ**: Данный рефакторинг нарушает обратную совместимость API. Необходимо обновить фронтенд приложение для работы с новыми эндпоинтами.

## Тестирование

После развертывания рекомендуется протестировать:

1. **Авторизацию в Telegram боте**
2. **Создание webhook сообщений**
3. **Автоматическую отправку в Telegram**
4. **Получение статистики и истории**
5. **Обновление настроек Telegram**

## Заключение

Рефакторинг значительно упростил архитектуру системы, улучшил производительность и сделал код более поддерживаемым. Теперь модуль social фокусируется только на своей основной задаче - управлении статусом сообщений, а настройки Telegram интегрированы непосредственно в профиль пользователя.
