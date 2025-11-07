# Интеграция API ключей и досок

## Концепция

Доски задач теперь создаются и удаляются автоматически вместе с API ключами. Каждый API ключ имеет свою собственную доску для организации входящих заявок.

## Как это работает

### 1. Создание API ключа → Создание доски

При создании API ключа:

```typescript
POST /api-keys
{
  "name": "Заявки с Landing Page"
}
```

Автоматически создается:

- API ключ с уникальным `key`
- Доска с названием "Заявки с Landing Page"
- 4 колонки по умолчанию: Backlog, To Do, In Progress, Done
- Связь между ключом и доской через `board_id`

### 2. Удаление API ключа → Удаление доски

При удалении API ключа:

```typescript
DELETE /api-keys/:id
```

Автоматически удаляются:

- API ключ
- Связанная доска
- Все колонки доски (CASCADE)
- Все задачи на доске (CASCADE)

### 3. Входящий вебхук → Новая задача

При получении вебхука через API ключ:

```typescript
POST /public/webhooks
Headers: X-API-Key: ak_...

{
  "siteName": "example.com",
  "formName": "Contact Form",
  "data": { ... }
}
```

Автоматически создается:

- Запись вебхука
- Задача на доске ключа
- Задача помещается в первую колонку (Backlog)

---

## Изменения в API

### ✅ Работает как прежде

- `GET /api-keys` - получить все ключи (теперь с информацией о досках)
- `GET /api-keys/:id` - получить ключ (теперь с доской)
- `PUT /api-keys/:id` - обновить ключ (имя, статус)
- `GET /boards` - получить все доски пользователя
- `GET /boards/:id` - получить доску
- `POST /boards/:id/columns` - управление колонками
- `GET /tasks` - получить задачи с фильтрацией

### ❌ Отключено

- `POST /boards` - создание досок (теперь через API ключи)
- `PUT /boards/:id` - обновление досок
- `DELETE /boards/:id` - удаление досок (теперь через API ключи)

---

## Примеры использования

### Создать новый источник заявок

```javascript
// 1. Создаем API ключ (автоматически создается доска)
const apiKey = await fetch('http://localhost:3000/api-keys', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Заявки с сайта example.com',
  }),
});

const { key, board, board_id } = await apiKey.json();

console.log('API ключ:', key);
console.log('Доска создана:', board.name);
console.log('ID доски:', board_id);

// 2. Используем ключ на сайте
// <script>
//   const API_KEY = '${key}';
//   // отправка заявок...
// </script>
```

### Получить все источники с досками

```javascript
const response = await fetch('http://localhost:3000/api-keys', {
  headers: { Authorization: `Bearer ${token}` },
});

const apiKeys = await response.json();

apiKeys.forEach((key) => {
  console.log(`
    Ключ: ${key.name}
    Доска: ${key.board.name}
    Задач на доске: ${key.board.tasks?.length || 0}
  `);
});
```

### Просмотреть задачи с конкретного источника

```javascript
// Получить все задачи от API ключа
const tasks = await fetch(
  `http://localhost:3000/tasks/by-api-key/${apiKeyId}`,
  { headers: { Authorization: `Bearer ${token}` } },
);

// Или получить задачи доски
const boardTasks = await fetch(
  `http://localhost:3000/tasks/by-board/${boardId}`,
  { headers: { Authorization: `Bearer ${token}` } },
);
```

### Удалить источник заявок

```javascript
// Удаление ключа автоматически удалит доску и все задачи
await fetch(`http://localhost:3000/api-keys/${apiKeyId}`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${token}` },
});

console.log('Удалены: API ключ, доска, колонки, задачи');
```

---

## Структура связей

```
User (Пользователь)
  │
  ├─► ApiKey (API ключ)
  │     │
  │     ├─► Board (Доска)
  │     │     │
  │     │     ├─► BoardColumn (Колонки)
  │     │     │     └─► Task (Задачи)
  │     │     │
  │     │     └─► BoardMember (Участники)
  │     │
  │     └─► Webhook (Вебхуки) ──► Task
  │
  └─► Board (через BoardMember)
```

### Каскадное удаление

```
DELETE ApiKey
  ├─► DELETE Board
  │     ├─► DELETE BoardColumn (CASCADE)
  │     ├─► DELETE BoardMember (CASCADE)
  │     └─► DELETE Task (CASCADE)
  │
  └─► Task.api_key_id = NULL (SET NULL)
```

---

## Миграция данных

Если у вас уже есть API ключи без досок:

```typescript
// Скрипт миграции
import { ApiKeyService } from './api-key/api-key.service';
import { BoardService } from './board/board.service';

async function migrateApiKeys() {
  const apiKeys = await apiKeyRepository.find({
    where: { board_id: null },
  });

  for (const apiKey of apiKeys) {
    // Создать доску для ключа
    const board = await boardService.create(
      {
        name: apiKey.name,
        description: `Доска для ключа "${apiKey.name}"`,
      },
      apiKey.user_id,
    );

    // Обновить ключ
    await apiKeyRepository.update(apiKey.id, {
      board_id: board.id,
    });

    console.log(`Мигрирован ключ ${apiKey.name}`);
  }
}
```

---

## FAQ

### Можно ли создать доску без API ключа?

Нет, доски создаются только через API ключи. Это обеспечивает чёткую связь между источником заявок и доской для их организации.

### Что если я хочу несколько досок для одного сайта?

Создайте несколько API ключей для разных форм или страниц:

- `Ключ: "example.com - Главная страница"`
- `Ключ: "example.com - Форма заказа"`
- `Ключ: "example.com - Подписка на рассылку"`

### Можно ли объединить задачи с разных досок?

Да, используйте фильтрацию:

```javascript
// Все задачи пользователя со всех досок
const allTasks = await fetch('/tasks', {
  headers: { Authorization: `Bearer ${token}` },
});

// Задачи с определённым статусом со всех досок
const newTasks = await fetch('/tasks?status=new', {
  headers: { Authorization: `Bearer ${token}` },
});
```

### Что происходит при удалении доски вручную (через базу)?

Если удалить доску напрямую в БД, API ключ останется, но его `board_id` станет `null`. Лучше всегда удалять через DELETE `/api-keys/:id`.

### Можно ли переименовать доску?

Да, но только через обновление имени API ключа или напрямую в базе данных. Endpoint `PUT /boards/:id` отключен.

---

## Преимущества новой архитектуры

✅ **Чёткая связь** - каждая доска привязана к источнику заявок
✅ **Автоматизация** - не нужно создавать доски вручную
✅ **Безопасность** - невозможно случайно удалить доску без ключа
✅ **Простота** - меньше шагов для настройки нового источника
✅ **Организация** - легко понять откуда пришли заявки

---

## Техническая реализация

### ApiKeyService

```typescript
async create(dto: CreateApiKeyDto, userId: string) {
  // 1. Создаем доску
  const board = await this.boardService.create({
    name: dto.name,
    description: `Доска для заявок с ключа "${dto.name}"`
  }, userId);

  // 2. Создаем ключ со связью
  const apiKey = this.apiKeyRepository.create({
    ...dto,
    key: generateKey(),
    user_id: userId,
    board_id: board.id
  });

  return this.apiKeyRepository.save(apiKey);
}

async delete(id: string, userId: string) {
  const apiKey = await this.findOne(id, userId);

  // 1. Удаляем доску (CASCADE удалит задачи)
  if (apiKey.board_id) {
    await this.boardService.remove(apiKey.board_id, userId);
  }

  // 2. Удаляем ключ
  await this.apiKeyRepository.delete({ id, user_id: userId });
}
```

### WebhookProcessor

```typescript
async handleWebhook(job: WebhookJobData) {
  const webhook = await this.webhookRepository.save(...);

  // Создаем задачу если есть доска
  if (apiKey?.board_id) {
    await this.taskService.createFromWebhook(
      webhook,
      apiKey.board_id
    );
  }

  // Отправляем уведомления...
}
```
