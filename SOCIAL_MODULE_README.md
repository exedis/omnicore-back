# Модуль социальных сетей

Этот модуль позволяет автоматически отправлять сообщения в различные социальные сети при получении вебхуков.

## Функциональность

### 1. Управление настройками социальных сетей

- Создание настроек для различных платформ (Telegram, WhatsApp, Viber, Instagram, Facebook)
- Включение/отключение отправки сообщений для каждой платформы
- Хранение токенов доступа, номеров телефонов, имен пользователей и других параметров

### 2. Автоматическая отправка сообщений

- При получении вебхука автоматически формируется сообщение
- Сообщение отправляется во все активные социальные сети пользователя
- Сохраняется история всех отправленных сообщений

### 3. Поддерживаемые платформы

- **Telegram**: Полная поддержка через Bot API
- **WhatsApp**: Заготовка для интеграции с WhatsApp Business API
- **Viber**: Заготовка для интеграции с Viber API
- **Instagram**: Заготовка для интеграции с Instagram API
- **Facebook**: Заготовка для интеграции с Facebook API

## API Endpoints

### Настройки социальных сетей

#### Создать настройки

```
POST /social/settings
```

Тело запроса:

```json
{
  "platform": "telegram",
  "isEnabled": true,
  "botToken": "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz",
  "chatId": "-1001234567890"
}
```

#### Получить все настройки

```
GET /social/settings
```

#### Обновить настройки

```
PUT /social/settings/:id
```

#### Удалить настройки

```
DELETE /social/settings/:id
```

#### Получить настройки для конкретной платформы

```
GET /social/settings/platform/:platform
```

### История сообщений

#### Получить историю сообщений

```
GET /social/messages?platform=telegram&limit=50
```

## Настройка Telegram

1. Создайте бота через [@BotFather](https://t.me/botfather)
2. Получите токен бота
3. Добавьте бота в группу или получите chat_id пользователя
4. Создайте настройки через API:

```json
{
  "platform": "telegram",
  "isEnabled": true,
  "botToken": "YOUR_BOT_TOKEN",
  "chatId": "YOUR_CHAT_ID"
}
```

## Структура базы данных

### Таблица social_settings

- `id` - UUID первичный ключ
- `user_id` - ID пользователя
- `platform` - Платформа (telegram, whatsapp, viber, instagram, facebook)
- `isEnabled` - Включена ли отправка
- `botToken` - Токен бота (для Telegram)
- `chatId` - ID чата (для Telegram)
- `phoneNumber` - Номер телефона (для WhatsApp, Viber)
- `username` - Имя пользователя (для Instagram, Facebook)
- `accessToken` - Токен доступа (для Instagram, Facebook)
- `webhookUrl` - URL для получения уведомлений
- `additionalSettings` - Дополнительные настройки в JSON

### Таблица social_messages

- `id` - UUID первичный ключ
- `user_id` - ID пользователя
- `webhook_id` - ID вебхука (связь с таблицей webhooks)
- `platform` - Платформа отправки
- `status` - Статус сообщения (pending, sent, failed, delivered)
- `content` - Содержимое сообщения
- `metadata` - Дополнительные данные в JSON
- `externalMessageId` - ID сообщения во внешней системе
- `errorMessage` - Сообщение об ошибке
- `sentAt` - Время отправки
- `deliveredAt` - Время доставки

## Автоматическая обработка

При получении вебхука через `/public/webhooks`:

1. Вебхук сохраняется в базе данных
2. Автоматически вызывается `SocialService.processWebhookMessage()`
3. Формируется сообщение на основе данных вебхука
4. Сообщение отправляется во все активные социальные сети пользователя
5. Результаты отправки сохраняются в таблице `social_messages`

## Формат автоматически генерируемых сообщений

```
📨 Новое сообщение с сайта: example.com
📋 Форма: Contact Form

• Имя: Иван Иванов
• Email: ivan@example.com
• Телефон: +7 999 123 45 67
• Сообщение: Привет!

📊 Рекламные параметры:
• utm_source: google
• utm_campaign: summer_sale

⏰ Время: 15.12.2023, 14:30:25
```

## Расширение функциональности

Для добавления поддержки новых платформ:

1. Добавьте новую платформу в enum `SocialPlatform`
2. Реализуйте метод отправки в `SocialService`
3. Обновите валидацию в DTO

Пример для новой платформы:

```typescript
// В social-settings.entity.ts
export enum SocialPlatform {
  // ... существующие платформы
  DISCORD = 'discord',
}

// В social.service.ts
private async sendToDiscord(
  settings: SocialSettings,
  content: string,
): Promise<{ messageId: string }> {
  // Реализация отправки в Discord
}
```
