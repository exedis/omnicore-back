# Система управления задачами (Boards & Tasks)

## Обзор

Система управления задачами позволяет организовывать входящие заявки с вебхуков в виде досок задач (подобно Trello).

### Основные возможности:

1. **Доски задач** - создание и управление досками для организации заявок
2. **Автоматическое создание задач** - каждый входящий вебхук автоматически превращается в задачу
3. **Фильтрация по источникам** - возможность фильтровать задачи по API ключам (сайтам-источникам)
4. **Совместный доступ** - возможность приглашать других пользователей для работы с доской

---

## Архитектура

### Сущности

#### Board (Доска)

- `id` - уникальный идентификатор
- `name` - название доски
- `description` - описание доски
- `owner_id` - ID владельца доски
- `createdAt` / `updatedAt` - временные метки

#### BoardMember (Участник доски)

- `id` - уникальный идентификатор
- `board_id` - ID доски
- `user_id` - ID пользователя
- `role` - роль (`owner` или `member`)
- `joinedAt` - дата присоединения

#### Task (Задача)

- `id` - уникальный идентификатор
- `title` - заголовок задачи
- `description` - описание задачи
- `status` - статус (`new`, `in_progress`, `completed`, `cancelled`)
- `priority` - приоритет (`low`, `medium`, `high`, `urgent`)
- `board_id` - ID доски
- `api_key_id` - ID API ключа (источник заявки)
- `webhook_id` - ID вебхука
- `metadata` - дополнительные данные (JSON)
- `createdAt` / `updatedAt` - временные метки

---

## API Endpoints

### Доски (Boards)

#### Создать доску

```http
POST /boards
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Заявки с сайта example.com",
  "description": "Все заявки с основного сайта"
}
```

#### Получить все доски пользователя

```http
GET /boards
Authorization: Bearer {token}
```

Возвращает все доски, где пользователь является участником или владельцем.

#### Получить доску по ID

```http
GET /boards/:id
Authorization: Bearer {token}
```

#### Обновить доску

```http
PUT /boards/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Новое название",
  "description": "Новое описание"
}
```

**Примечание:** Только владелец может обновлять доску.

#### Удалить доску

```http
DELETE /boards/:id
Authorization: Bearer {token}
```

**Примечание:** Только владелец может удалять доску. При удалении доски удаляются все связанные задачи и участники.

---

### Участники доски (Board Members)

#### Пригласить участника

```http
POST /boards/:id/members
Authorization: Bearer {token}
Content-Type: application/json

{
  "email": "user@example.com",
  "role": "member"
}
```

**Примечание:** Только владелец может приглашать участников. Роль может быть `member` или `owner`.

#### Удалить участника

```http
DELETE /boards/:id/members
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "uuid-пользователя"
}
```

**Примечание:** Только владелец может удалять участников. Нельзя удалить владельца доски.

#### Получить всех участников доски

```http
GET /boards/:id/members
Authorization: Bearer {token}
```

---

### Задачи (Tasks)

#### Создать задачу вручную

```http
POST /tasks
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Новая заявка",
  "description": "Описание заявки",
  "board_id": "uuid-доски",
  "status": "new",
  "priority": "medium",
  "metadata": {
    "customField": "value"
  }
}
```

#### Получить все задачи с фильтрацией

```http
GET /tasks?board_id={board_id}&api_key_id={api_key_id}&status={status}&priority={priority}&page=1&limit=20
Authorization: Bearer {token}
```

**Параметры запроса:**

- `board_id` (optional) - фильтр по доске
- `api_key_id` (optional) - фильтр по API ключу (источнику заявок)
- `status` (optional) - фильтр по статусу (`new`, `in_progress`, `completed`, `cancelled`)
- `priority` (optional) - фильтр по приоритету (`low`, `medium`, `high`, `urgent`)
- `page` (optional, default: 1) - номер страницы
- `limit` (optional, default: 20) - количество задач на странице

**Примеры:**

```http
# Все задачи пользователя
GET /tasks

# Задачи конкретной доски
GET /tasks?board_id=uuid-доски

# Задачи от конкретного источника (сайта)
GET /tasks?api_key_id=uuid-api-ключа

# Новые задачи с высоким приоритетом
GET /tasks?status=new&priority=high
```

#### Получить задачи по доске

```http
GET /tasks/by-board/:boardId
Authorization: Bearer {token}
```

#### Получить задачи по API ключу

```http
GET /tasks/by-api-key/:apiKeyId
Authorization: Bearer {token}
```

Этот эндпоинт позволяет получить все задачи от конкретного сайта-источника (по API ключу).

#### Получить задачу по ID

```http
GET /tasks/:id
Authorization: Bearer {token}
```

#### Обновить задачу

```http
PUT /tasks/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "in_progress",
  "priority": "high",
  "title": "Обновленный заголовок",
  "description": "Обновленное описание"
}
```

**Примечание:** Все поля опциональны, можно обновлять только нужные.

#### Удалить задачу

```http
DELETE /tasks/:id
Authorization: Bearer {token}
```

---

## Настройка автоматического создания задач

Чтобы входящие вебхуки автоматически создавали задачи на доске, необходимо связать API ключ с доской.

### Шаг 1: Создать доску

```http
POST /boards
{
  "name": "Заявки с сайта",
  "description": "Доска для заявок"
}
```

Сохраните полученный `board_id`.

### Шаг 2: Обновить API ключ

```http
PUT /api-keys/:apiKeyId
{
  "board_id": "uuid-доски"
}
```

**Примечание:** API для обновления ключей должен поддерживать новое поле `board_id` (уже добавлено в DTO).

### Шаг 3: Готово!

Теперь все входящие вебхуки, использующие этот API ключ, будут автоматически создавать задачи на указанной доске.

---

## Примеры использования

### Создание доски и настройка автоматического создания задач

```javascript
// 1. Создаем доску
const boardResponse = await fetch('http://localhost:3000/boards', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Заявки с Landing Page',
    description: 'Все заявки с лендинга',
  }),
});
const board = await boardResponse.json();

// 2. Привязываем API ключ к доске
const apiKeyResponse = await fetch(
  `http://localhost:3000/api-keys/${apiKeyId}`,
  {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      board_id: board.id,
    }),
  },
);

// 3. Теперь все вебхуки с этим API ключом будут создавать задачи!
```

### Получение задач с фильтрацией

```javascript
// Получить все новые задачи
const newTasks = await fetch('http://localhost:3000/tasks?status=new', {
  headers: { Authorization: `Bearer ${token}` },
});

// Получить задачи от конкретного сайта
const tasksFromSite = await fetch(
  `http://localhost:3000/tasks?api_key_id=${apiKeyId}`,
  {
    headers: { Authorization: `Bearer ${token}` },
  },
);

// Получить высокоприоритетные задачи в работе
const urgentTasks = await fetch(
  'http://localhost:3000/tasks?status=in_progress&priority=high',
  {
    headers: { Authorization: `Bearer ${token}` },
  },
);
```

### Обновление статуса задачи

```javascript
// Взять задачу в работу
await fetch(`http://localhost:3000/tasks/${taskId}`, {
  method: 'PUT',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    status: 'in_progress',
  }),
});

// Завершить задачу
await fetch(`http://localhost:3000/tasks/${taskId}`, {
  method: 'PUT',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    status: 'completed',
  }),
});
```

### Приглашение пользователя на доску

```javascript
// Пригласить коллегу для совместной работы
await fetch(`http://localhost:3000/boards/${boardId}/members`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'colleague@example.com',
    role: 'member',
  }),
});
```

---

## Формат автоматически создаваемых задач

Когда вебхук создает задачу автоматически, данные формируются следующим образом:

### Заголовок задачи

Генерируется из данных вебхука в приоритете:

1. `data.name` / `data.firstName` / `data.fullName` / `data.username`
2. `data.email`
3. `data.phone` / `data.phoneNumber`
4. `siteName` из вебхука

**Примеры:**

- "Заявка от Иван Иванов"
- "Заявка от ivan@example.com"
- "Заявка с example.com"

### Описание задачи

Содержит всю информацию о заявке в структурированном виде:

```
**Сайт:** example.com
**Форма:** Форма обратной связи
**Дата:** 31.10.2025, 15:30:45

**Данные заявки:**
- **name:** Иван Иванов
- **email:** ivan@example.com
- **phone:** +7 999 123-45-67
- **message:** Интересует консультация
```

### Метаданные (metadata)

Содержит полные данные вебхука:

```json
{
  "siteName": "example.com",
  "formName": "Форма обратной связи",
  "webhookData": {
    "name": "Иван Иванов",
    "email": "ivan@example.com",
    "phone": "+7 999 123-45-67",
    "message": "Интересует консультация"
  }
}
```

---

## Права доступа

### Владелец доски (owner)

- Создавать, читать, обновлять и удалять доску
- Приглашать и удалять участников
- Создавать, читать, обновлять и удалять задачи

### Участник доски (member)

- Читать доску и её задачи
- Создавать задачи на доске
- Обновлять и удалять задачи
- **Не может:** управлять участниками, удалять доску

---

## База данных

При первом запуске с `synchronize: true` автоматически создадутся следующие таблицы:

- `boards` - доски
- `board_members` - участники досок
- `tasks` - задачи

**Примечание:** В `api_keys` добавится новое поле `board_id` для связи ключа с доской.

---

## Интеграция с фронтендом

### Рекомендуемая структура компонентов

```
components/
├── boards/
│   ├── BoardList.tsx          # Список досок
│   ├── BoardCard.tsx          # Карточка доски
│   ├── BoardView.tsx          # Просмотр доски с задачами
│   ├── CreateBoardModal.tsx   # Модальное окно создания доски
│   └── BoardSettings.tsx      # Настройки доски (участники)
└── tasks/
    ├── TaskList.tsx           # Список задач (колонки по статусам)
    ├── TaskCard.tsx           # Карточка задачи
    ├── TaskDetail.tsx         # Детальный просмотр задачи
    └── TaskFilters.tsx        # Фильтры задач
```

### WebSocket / SSE для real-time обновлений

Используйте существующий эндпоинт SSE для получения уведомлений о новых вебхуках:

```javascript
const eventSource = new EventSource(
  `http://localhost:3000/public/webhooks/events`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'new_webhook') {
    // Обновить список задач
    refreshTasks();
  }
};
```

---

## Миграция данных

Если у вас уже есть существующие вебхуки, и вы хотите создать задачи для них:

```typescript
// Пример скрипта миграции
async function migrateWebhooksToTasks(boardId: string) {
  const webhooks = await webhookRepository.find();

  for (const webhook of webhooks) {
    await taskService.createFromWebhook(webhook, boardId);
  }
}
```

---

## Troubleshooting

### Задачи не создаются автоматически

1. Проверьте, что у API ключа установлен `board_id`:

```sql
SELECT id, name, board_id FROM api_keys;
```

2. Проверьте, что вебхук содержит `apiKeyId` в метаданных

3. Проверьте логи процессора вебхуков

### Пользователь не может получить доступ к доске

1. Проверьте, что пользователь добавлен как участник:

```sql
SELECT * FROM board_members WHERE user_id = 'user-uuid';
```

2. Проверьте, что приглашение отправлено на правильный email

### Задачи дублируются

Система дедупликации вебхуков работает независимо от задач. Если вебхук не был дедуплицирован, будет создана новая задача.

---

## Следующие шаги

Рекомендуемые улучшения:

1. **Добавить назначение задач на участников** - поле `assignee_id` в Task
2. **Комментарии к задачам** - отдельная таблица `task_comments`
3. **Теги/метки для задач** - для дополнительной категоризации
4. **Уведомления в реальном времени** - WebSocket для обновлений статусов
5. **История изменений задач** - audit log
6. **Шаблоны досок** - предустановленные колонки и настройки
