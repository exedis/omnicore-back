# Интеграция Sender модуля с Telegram Bot

## Обзор

Sender модуль управляет отправкой сообщений из webhook модуля в Telegram через telegram-bot модуль. Интеграция обеспечивает автоматическую обработку входящих сообщений и их доставку в Telegram при соблюдении условий авторизации и настроек пользователя.

## Архитектура интеграции

```
Webhook → Sender → Telegram Bot → User
```

### Поток обработки сообщений:

1. **Webhook получает сообщение** - сообщение приходит в webhook модуль
2. **Проверка настроек** - Sender проверяет настройки пользователя для Telegram
3. **Проверка авторизации** - проверяется авторизация пользователя в Telegram боте
4. **Отправка в Telegram** - если условия выполнены, сообщение отправляется в Telegram
5. **Обновление статуса** - статус сообщения обновляется на "доставлено в Telegram"

## Компоненты

### SenderService

Основной сервис для обработки сообщений:

- `processWebhookMessage(webhookId, userId)` - обрабатывает webhook сообщение
- `getMessageStats(userId)` - получает статистику отправленных сообщений
- `getMessageHistory(userId, limit)` - получает историю сообщений

### SenderController

API эндпоинты:

- `POST /sender/process-webhook/:webhookId` - обработка webhook сообщения
- `GET /sender/stats` - статистика сообщений
- `GET /sender/history` - история сообщений

### Интеграция с WebhookService

WebhookService автоматически вызывает SenderService при создании нового webhook:

```typescript
// В WebhookService.create()
await this.senderService.processWebhookMessage(savedWebhook.id, userId);
```

## Условия отправки

Сообщение отправляется в Telegram только если:

1. **Пользователь авторизован в Telegram боте** - проверяется через `TelegramBotService.isUserAuthorizedInTelegram()`
2. **Включены уведомления Telegram** - `SocialSettings.isEnabled = true` для платформы Telegram
3. **Настроен chatId** - пользователь имеет активный chatId в настройках

## Статусы сообщений

Добавлен новый статус `TELEGRAM_DELIVERED` в `MessageStatus`:

- `PENDING` - ожидает отправки
- `SENT` - отправлено
- `FAILED` - ошибка отправки
- `DELIVERED` - доставлено
- `TELEGRAM_DELIVERED` - доставлено в Telegram

## Форматирование сообщений

Сообщения форматируются для Telegram с эмодзи и структурированным текстом:

```
📨 Новое сообщение с сайта "Название сайта"
📋 Форма: Название формы
🕐 Время: дата и время

📝 Данные формы:
• Поле1: Значение1
• Поле2: Значение2

📊 Рекламные параметры:
• utm_source: google
• utm_campaign: summer
```

## Обработка ошибок

- Ошибки отправки логируются и сохраняются в статусе сообщения
- При ошибке статус устанавливается в `FAILED` с описанием ошибки
- Обработка ошибок не прерывает основной поток webhook

## Переменные окружения

Необходимые переменные для работы:

- `TELEGRAM_BOT_TOKEN` - токен Telegram бота
- `TELEGRAM_BOT_USERNAME` - username бота для генерации ссылок авторизации

## Использование

### Автоматическая обработка

Сообщения обрабатываются автоматически при создании webhook через API или публичный эндпоинт.

### Ручная обработка

Можно вручную обработать webhook сообщение:

```bash
POST /sender/process-webhook/{webhookId}
Authorization: Bearer {jwt_token}
```

### Получение статистики

```bash
GET /sender/stats
Authorization: Bearer {jwt_token}
```

### Получение истории

```bash
GET /sender/history?limit=50
Authorization: Bearer {jwt_token}
```

## Логирование

Все операции логируются с соответствующими уровнями:

- `LOG` - успешные операции
- `WARN` - предупреждения (пользователь не авторизован)
- `ERROR` - ошибки отправки

## Безопасность

- Все эндпоинты защищены JWT авторизацией
- Проверка принадлежности webhook пользователю
- Валидация настроек перед отправкой
