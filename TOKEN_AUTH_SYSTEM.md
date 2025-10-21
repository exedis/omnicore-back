# Система токенов авторизации для Telegram бота

## Как работает система токенов

### 1. Создание токена

Когда пользователь создает токен авторизации через API:

```javascript
POST /telegram-bot/auth-token
Authorization: Bearer <JWT_TOKEN>
```

**Что происходит:**

1. Генерируется случайный токен длиной 64 символа (32 байта в hex)
2. Токен сохраняется в базе данных в таблице `telegram_auth_tokens`
3. Устанавливается время истечения (1 час)
4. Возвращается ссылка вида `t.me/omnicore_sender_bot?start=TOKEN`

### 2. Структура токена в базе данных

```sql
CREATE TABLE telegram_auth_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  token VARCHAR(64) UNIQUE NOT NULL,
  isUsed BOOLEAN DEFAULT FALSE,
  telegramChatId VARCHAR(255),
  telegramUsername VARCHAR(255),
  telegramFirstName VARCHAR(255),
  telegramLastName VARCHAR(255),
  usedAt TIMESTAMP,
  expiresAt TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 hour'),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Проверка токена при авторизации

Когда пользователь переходит по ссылке и отправляет `/start TOKEN` боту:

**Алгоритм проверки:**

1. **Поиск токена** - ищем токен в базе данных
2. **Проверка существования** - если токен не найден → "Неверный токен"
3. **Проверка срока действия** - если токен истек → "Токен истек"
4. **Проверка использования** - если токен уже использован → "Токен уже использован"
5. **Проверка дублирования** - если пользователь уже авторизован → "Пользователь уже авторизован"
6. **Авторизация** - если все проверки пройдены → успешная авторизация

### 4. Процесс авторизации

```typescript
async handleStartCommand(chatId: string, token: string, userInfo: any) {
  // 1. Поиск токена в БД
  const authToken = await this.telegramAuthTokenRepository.findOne({
    where: { token },
    relations: ['user'],
  });

  // 2. Проверки
  if (!authToken) return '❌ Неверный токен';
  if (authToken.expiresAt < new Date()) return '⏰ Токен истек';
  if (authToken.isUsed) return '⚠️ Токен уже использован';

  // 3. Обновление токена
  authToken.isUsed = true;
  authToken.telegramChatId = chatId;
  authToken.telegramUsername = userInfo.username;
  authToken.telegramFirstName = userInfo.first_name;
  authToken.telegramLastName = userInfo.last_name;
  authToken.usedAt = new Date();

  // 4. Сохранение в БД
  await this.telegramAuthTokenRepository.save(authToken);

  // 5. Создание настроек социальной сети
  const newSettings = this.socialSettingsRepository.create({
    user_id: authToken.user_id,
    platform: SocialPlatform.TELEGRAM,
    chatId: chatId,
    isEnabled: true,
  });
  await this.socialSettingsRepository.save(newSettings);

  return '✅ Авторизация успешна!';
}
```

## API для управления токенами

### Создание токена

```javascript
const response = await fetch('/telegram-bot/auth-token', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer ' + jwtToken,
    'Content-Type': 'application/json',
  },
});

const { token, authLink } = await response.json();
// token: "abc123def456..."
// authLink: "https://t.me/omnicore_sender_bot?start=abc123def456..."
```

### Получение активных токенов

```javascript
const response = await fetch('/telegram-bot/auth-tokens', {
  headers: { Authorization: 'Bearer ' + jwtToken },
});

const tokens = await response.json();
// [
//   {
//     id: "uuid",
//     token: "abc123def456...",
//     authLink: "https://t.me/omnicore_sender_bot?start=abc123def456...",
//     createdAt: "2023-12-15T10:00:00Z",
//     expiresAt: "2023-12-15T11:00:00Z"
//   }
// ]
```

### Отзыв токена

```javascript
await fetch('/telegram-bot/revoke-token', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer ' + jwtToken,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ tokenId: 'uuid' }),
});
```

### Проверка статуса авторизации

```javascript
const response = await fetch('/telegram-bot/auth-status', {
  headers: { Authorization: 'Bearer ' + jwtToken },
});

const status = await response.json();
// {
//   isAuthorized: true,
//   chatId: "-1001234567890",
//   message: "Пользователь авторизован в Telegram"
// }
```

## Безопасность

### Защита токенов

- **Уникальность** - каждый токен уникален (64 символа)
- **Ограниченное время жизни** - токены истекают через 1 час
- **Одноразовое использование** - токен можно использовать только один раз
- **Связь с пользователем** - токен привязан к конкретному пользователю

### Проверки безопасности

1. **Валидация токена** - проверка существования в БД
2. **Проверка срока действия** - токен не может быть использован после истечения
3. **Проверка использования** - предотвращение повторного использования
4. **Проверка дублирования** - один пользователь = одна авторизация

## Примеры использования

### Создание токена для пользователя

```javascript
// В админ панели или API
const createAuthToken = async (userId) => {
  const response = await fetch('/telegram-bot/auth-token', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + adminJwtToken,
      'Content-Type': 'application/json',
    },
  });

  const { authLink } = await response.json();

  // Отправляем ссылку пользователю
  await sendEmailToUser(userId, {
    subject: 'Авторизация в Telegram боте',
    body: `Для авторизации перейдите по ссылке: ${authLink}`,
  });
};
```

### Проверка авторизации перед отправкой сообщения

```javascript
const sendNotification = async (userId, message) => {
  // Проверяем статус авторизации
  const status = await fetch('/telegram-bot/auth-status', {
    headers: { Authorization: 'Bearer ' + jwtToken },
  }).then((r) => r.json());

  if (status.isAuthorized) {
    // Отправляем сообщение
    await fetch('/telegram-bot/send-message', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + jwtToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });
  } else {
    // Создаем новый токен для авторизации
    const { authLink } = await fetch('/telegram-bot/auth-token', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + jwtToken },
    }).then((r) => r.json());

    console.log('Пользователь не авторизован. Отправьте ссылку:', authLink);
  }
};
```

## Мониторинг и отладка

### Логирование

Все операции с токенами логируются:

- Создание токена
- Попытки авторизации
- Ошибки валидации
- Успешные авторизации

### Отладка токенов

```javascript
// Получение всех токенов пользователя
const tokens = await fetch('/telegram-bot/auth-tokens', {
  headers: { Authorization: 'Bearer ' + jwtToken },
}).then((r) => r.json());

console.log('Активные токены:', tokens);
```

### Очистка истекших токенов

Можно добавить cron задачу для очистки истекших токенов:

```sql
DELETE FROM telegram_auth_tokens
WHERE expiresAt < NOW() AND isUsed = false;
```

## Преимущества системы

1. **Безопасность** - токены не содержат чувствительной информации
2. **Простота** - пользователю нужно только перейти по ссылке
3. **Контроль** - можно отслеживать и управлять токенами
4. **Гибкость** - легко добавить дополнительные проверки
5. **Масштабируемость** - система работает с любым количеством пользователей
