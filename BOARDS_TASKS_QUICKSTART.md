# Быстрый старт: Система управления задачами

## Запуск системы

### 1. Установка зависимостей

```bash
npm install
```

### 2. Запуск Redis (если еще не запущен)

```bash
# MacOS (Homebrew)
brew services start redis

# Или в Docker
docker run -d -p 6379:6379 redis
```

### 3. Настройка базы данных

Убедитесь, что в `.env` файле настроены параметры PostgreSQL:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=omnicore
```

### 4. Запуск приложения

```bash
npm run start:dev
```

При первом запуске автоматически создадутся новые таблицы:

- `boards`
- `board_members`
- `tasks`
- В `api_keys` добавится поле `board_id`

---

## Быстрое тестирование API

### 1. Регистрация и авторизация

```bash
# Регистрация
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'

# Авторизация
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Сохраните полученный access_token
TOKEN="your_access_token_here"
```

### 2. Создание доски

```bash
curl -X POST http://localhost:3000/boards \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Заявки с сайта",
    "description": "Доска для входящих заявок"
  }'

# Сохраните board_id из ответа
BOARD_ID="board_uuid_here"
```

### 3. Создание API ключа с привязкой к доске

```bash
# Создать API ключ
curl -X POST http://localhost:3000/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ключ для Landing Page",
    "board_id": "'$BOARD_ID'"
  }'

# Сохраните key из ответа
API_KEY="api_key_here"
```

### 4. Отправка тестового вебхука (создаст задачу автоматически)

```bash
curl -X POST http://localhost:3000/public/webhooks \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "siteName": "example.com",
    "formName": "Форма обратной связи",
    "data": {
      "name": "Иван Иванов",
      "email": "ivan@example.com",
      "phone": "+7 999 123-45-67",
      "message": "Хочу консультацию"
    }
  }'
```

### 5. Получение задач

```bash
# Все задачи
curl http://localhost:3000/tasks \
  -H "Authorization: Bearer $TOKEN"

# Задачи конкретной доски
curl "http://localhost:3000/tasks?board_id=$BOARD_ID" \
  -H "Authorization: Bearer $TOKEN"

# Только новые задачи
curl "http://localhost:3000/tasks?status=new" \
  -H "Authorization: Bearer $TOKEN"
```

### 6. Обновление статуса задачи

```bash
# Сохраните task_id из предыдущего запроса
TASK_ID="task_uuid_here"

# Взять в работу
curl -X PUT http://localhost:3000/tasks/$TASK_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress"
  }'

# Завершить
curl -X PUT http://localhost:3000/tasks/$TASK_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed"
  }'
```

### 7. Приглашение пользователя

```bash
# Сначала зарегистрируйте второго пользователя
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "colleague@example.com",
    "password": "password123",
    "name": "Colleague"
  }'

# Пригласите его на доску
curl -X POST http://localhost:3000/boards/$BOARD_ID/members \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "colleague@example.com",
    "role": "member"
  }'
```

---

## Тестирование в Postman

### Импорт коллекции

Создайте коллекцию Postman со следующими запросами:

#### 1. Auth - Register

```
POST {{baseUrl}}/auth/register
Body (JSON):
{
  "email": "test@example.com",
  "password": "password123",
  "name": "Test User"
}
```

#### 2. Auth - Login

```
POST {{baseUrl}}/auth/login
Body (JSON):
{
  "email": "test@example.com",
  "password": "password123"
}

Tests (автосохранение токена):
pm.collectionVariables.set("token", pm.response.json().access_token);
```

#### 3. Boards - Create

```
POST {{baseUrl}}/boards
Headers:
  Authorization: Bearer {{token}}
Body (JSON):
{
  "name": "Заявки с сайта",
  "description": "Доска для заявок"
}

Tests (сохранение board_id):
pm.collectionVariables.set("board_id", pm.response.json().id);
```

#### 4. Boards - Get All

```
GET {{baseUrl}}/boards
Headers:
  Authorization: Bearer {{token}}
```

#### 5. API Keys - Create with Board

```
POST {{baseUrl}}/api-keys
Headers:
  Authorization: Bearer {{token}}
Body (JSON):
{
  "name": "Test Key",
  "board_id": "{{board_id}}"
}

Tests (сохранение api_key):
pm.collectionVariables.set("api_key", pm.response.json().key);
```

#### 6. Public Webhooks - Send

```
POST {{baseUrl}}/public/webhooks
Headers:
  X-API-Key: {{api_key}}
Body (JSON):
{
  "siteName": "example.com",
  "formName": "Contact Form",
  "data": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  }
}
```

#### 7. Tasks - Get All

```
GET {{baseUrl}}/tasks
Headers:
  Authorization: Bearer {{token}}
```

#### 8. Tasks - Get by Board

```
GET {{baseUrl}}/tasks/by-board/{{board_id}}
Headers:
  Authorization: Bearer {{token}}
```

#### 9. Tasks - Update Status

```
PUT {{baseUrl}}/tasks/{{task_id}}
Headers:
  Authorization: Bearer {{token}}
Body (JSON):
{
  "status": "in_progress"
}
```

#### 10. Boards - Invite Member

```
POST {{baseUrl}}/boards/{{board_id}}/members
Headers:
  Authorization: Bearer {{token}}
Body (JSON):
{
  "email": "colleague@example.com",
  "role": "member"
}
```

### Переменные коллекции

```
baseUrl: http://localhost:3000
token: (автозаполняется)
board_id: (автозаполняется)
api_key: (автозаполняется)
task_id: (заполните вручную после получения задачи)
```

---

## Проверка базы данных

### Через psql

```bash
psql -U postgres -d omnicore
```

```sql
-- Проверить созданные таблицы
\dt

-- Посмотреть доски
SELECT * FROM boards;

-- Посмотреть участников досок
SELECT * FROM board_members;

-- Посмотреть задачи
SELECT * FROM tasks;

-- Посмотреть задачи с информацией о доске
SELECT t.*, b.name as board_name
FROM tasks t
LEFT JOIN boards b ON t.board_id = b.id;

-- Посмотреть API ключи с привязанными досками
SELECT ak.*, b.name as board_name
FROM api_keys ak
LEFT JOIN boards b ON ak.board_id = b.id;
```

---

## Проверка работы системы

### Сценарий 1: Базовый flow

1. ✅ Создать пользователя
2. ✅ Создать доску
3. ✅ Создать API ключ с привязкой к доске
4. ✅ Отправить вебхук через API ключ
5. ✅ Проверить, что задача создалась автоматически
6. ✅ Обновить статус задачи

### Сценарий 2: Совместная работа

1. ✅ Создать двух пользователей
2. ✅ Первый пользователь создает доску
3. ✅ Первый пользователь приглашает второго
4. ✅ Второй пользователь видит доску в своем списке
5. ✅ Оба пользователя видят одинаковые задачи
6. ✅ Оба могут обновлять статусы задач

### Сценарий 3: Фильтрация задач

1. ✅ Создать несколько досок
2. ✅ Создать несколько API ключей для разных досок
3. ✅ Отправить вебхуки через разные ключи
4. ✅ Фильтровать задачи по доске
5. ✅ Фильтровать задачи по API ключу (источнику)
6. ✅ Фильтровать по статусам и приоритетам

---

## Мониторинг и отладка

### Логи приложения

```bash
# В режиме разработки логи выводятся в консоль
npm run start:dev

# Проверить логи процессора вебхуков
# Должны быть строки типа:
# [WebhookProcessor] Processing webhook for user ...
# [WebhookProcessor] Created task for webhook ... on board ...
```

### Redis (очереди)

```bash
# Подключиться к Redis
redis-cli

# Посмотреть ключи очереди
KEYS bull:webhooks:*

# Посмотреть задачи в очереди
LRANGE bull:webhooks:wait 0 -1

# Посмотреть активные задачи
LRANGE bull:webhooks:active 0 -1

# Посмотреть завершенные задачи
ZRANGE bull:webhooks:completed 0 -1 WITHSCORES
```

### Проверка SSE (Server-Sent Events)

```bash
# Открыть поток событий (в новом терминале)
curl -N -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/public/webhooks/events

# В другом терминале отправить вебхук
curl -X POST http://localhost:3000/public/webhooks \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{...}'

# В первом терминале должно прийти событие о новом вебхуке
```

---

## Частые проблемы

### Задачи не создаются автоматически

**Проблема:** Отправил вебхук, но задача не создалась.

**Решение:**

1. Проверьте, что у API ключа установлен `board_id`:

```sql
SELECT id, name, board_id FROM api_keys WHERE key = 'your_key';
```

2. Проверьте логи процессора:

```bash
# Должна быть строка:
# [WebhookProcessor] Created task for webhook ...
```

3. Проверьте, что очередь Redis работает:

```bash
redis-cli
PING  # Должен вернуть PONG
```

### Пользователь не видит доску

**Проблема:** Приглашенный пользователь не видит доску.

**Решение:**

1. Проверьте, что пользователь добавлен:

```sql
SELECT * FROM board_members WHERE user_id = 'user_uuid';
```

2. Проверьте email при приглашении (должен совпадать с зарегистрированным)

### 403 Forbidden при доступе к доске

**Проблема:** Получаю ошибку "У вас нет доступа к этой доске".

**Решение:**

1. Убедитесь, что используете правильный токен
2. Проверьте, что вы добавлены как участник доски
3. Убедитесь, что доска существует

---

## Что дальше?

После успешного тестирования базового функционала:

1. **Интеграция с фронтендом**

   - Используйте файл `boards-tasks-types.ts` для типизации
   - Реализуйте Kanban-доску с колонками по статусам
   - Добавьте drag-and-drop для перемещения задач

2. **Real-time обновления**

   - Используйте SSE эндпоинт для получения уведомлений о новых задачах
   - Обновляйте UI автоматически при появлении новых заявок

3. **Расширенная функциональность**

   - Добавьте назначение задач на участников
   - Реализуйте комментарии к задачам
   - Добавьте теги/метки для категоризации
   - Создайте дашборд с аналитикой по задачам

4. **Уведомления**
   - Настройте email/telegram уведомления о новых задачах
   - Добавьте уведомления при изменении статуса
   - Реализуйте упоминания (@mentions) в комментариях

---

## Полезные ссылки

- [Полная документация API](./BOARDS_AND_TASKS_README.md)
- [TypeScript типы для фронтенда](./boards-tasks-types.ts)
- [Документация по вебхукам](./WEBHOOK_QUEUE_README.md)
- [Документация по Redis](./SETUP_REDIS.md)
