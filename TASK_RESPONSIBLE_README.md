# Система назначения ответственных за задачи

## Описание

В системе реализована возможность назначения ответственного пользователя за задачу. Ответственным может быть только участник доски (Board Member).

## Логика работы

### 1. Создание задачи

При создании задачи ответственный определяется следующим образом:

**Через API (ручное создание):**

- Если `responsibleId` указан явно → проверяется, что этот пользователь является участником доски, затем назначается
- Если `responsibleId` не указан, но есть `apiKeyId` → автоматически назначается владелец API ключа
- Если ни то, ни другое не указано → ответственный остается `null`

**Через вебхук (автоматическое создание):**

- Ответственный не назначается автоматически (`null`)
- Владелец доски может вручную назначить ответственного после создания задачи

### 2. Обновление задачи

При обновлении задачи можно изменить ответственного:

- Новый `responsibleId` должен быть ID пользователя, который является участником доски
- Можно установить `responsibleId: null`, чтобы снять ответственного
- При попытке назначить пользователя, не являющегося участником доски, вернется ошибка `403 Forbidden`

### 3. Приглашение участников

Участники добавляются на доску через систему приглашений:

1. Владелец доски создает приглашение (POST `/invitations`)
2. Приглашенный пользователь принимает приглашение по токену (POST `/invitations/accept/:token`)
3. После принятия пользователь становится участником доски с ролью `MEMBER`
4. Теперь этого пользователя можно назначить ответственным за задачу

## API Endpoints

### Получить участников доски

```http
GET /boards/:id/members
Authorization: Bearer <token>
```

Возвращает список всех участников доски с их данными (id, email, name, role).

### Создать задачу с ответственным

```http
POST /tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Новая задача",
  "boardId": "uuid",
  "responsibleId": "uuid",  // опционально
  "apiKeyId": "uuid"        // опционально
}
```

### Изменить ответственного

```http
PATCH /tasks/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "responsibleId": "uuid"  // или null, чтобы снять ответственного
}
```

## Ответ API

При получении задачи в ответе всегда присутствуют поля:

```json
{
  "id": "task-uuid",
  "title": "Заголовок задачи",
  "responsible": {
    "id": "user-uuid",
    "name": "Имя пользователя",
    "email": "user@example.com"
  },
  "responsibleId": "user-uuid",
  "apiKey": {
    "id": "key-uuid",
    "name": "Название ключа",
    "user": {
      "id": "owner-uuid",
      "name": "Владелец ключа",
      "email": "owner@example.com"
    }
  }
}
```

Где:

- `responsible` — объект ответственного пользователя (или `null`)
- `responsibleId` — ID ответственного (или `null`)
- `apiKey.user` — владелец API ключа (если задача создана через вебхук)

## Логика определения ответственного

В трансформере задач (`task.transformer.ts`) ответственный определяется по приоритету:

1. Если явно назначен `task.responsible` → используется он
2. Если нет, но есть `task.apiKey.user` → используется владелец API ключа
3. Если ничего нет → `null`

Это позволяет автоматически показывать владельца ключа как ответственного по умолчанию даже для старых задач.

## Валидация

- ✅ Нельзя назначить пользователя, не являющегося участником доски
- ✅ Можно установить `null` (задача без ответственного)
- ✅ При получении задачи всегда возвращается информация об ответственном
- ✅ Владелец API ключа показывается как ответственный по умолчанию

## Миграция базы данных

В таблице `tasks` добавлен новый столбец:

```sql
ALTER TABLE tasks ADD COLUMN responsible_id UUID NULL;
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_responsible
  FOREIGN KEY (responsible_id) REFERENCES users(id) ON DELETE SET NULL;
```

В dev-среде с `synchronize: true` это произойдет автоматически.

## Пример использования

### 1. Получить список участников доски для выбора ответственного

```javascript
const response = await fetch('/boards/board-id/members', {
  headers: { Authorization: `Bearer ${token}` },
});
const members = await response.json();
// [{ id: "uuid", user: { id: "uuid", email: "...", name: "..." }, role: "member" }]
```

### 2. Создать задачу и назначить ответственного

```javascript
const response = await fetch('/tasks', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'Обработать заявку',
    boardId: 'board-uuid',
    responsibleId: 'member-uuid',
  }),
});
```

### 3. Изменить ответственного у существующей задачи

```javascript
const response = await fetch('/tasks/task-id', {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    responsibleId: 'another-member-uuid',
  }),
});
```

### 4. Снять ответственного

```javascript
const response = await fetch('/tasks/task-id', {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    responsibleId: null,
  }),
});
```
