# Webhook Queue & Deduplication System

## Обзор

Система обработки входящих webhook'ов с использованием очередей Bull и фильтрации дубликатов.

## Возможности

### 1. Асинхронная обработка webhook'ов

- Входящие webhook'и добавляются в очередь Redis для асинхронной обработки
- Быстрый ответ клиенту без ожидания завершения обработки
- Автоматические повторные попытки при ошибках (3 попытки с экспоненциальной задержкой)

### 2. Дедупликация сообщений

- Автоматическая фильтрация дублирующихся webhook'ов
- Окно дедупликации: 60 секунд
- Хэширование на основе userId, siteName, formName и data
- Автоматическая очистка старых записей каждые 2 минуты

## Архитектура

```
Входящий webhook
    ↓
PublicWebhookController
    ↓
WebhookDeduplicationService (проверка дубликатов)
    ↓
WebhookService.addToQueue() (добавление в очередь)
    ↓
Redis Queue
    ↓
WebhookProcessor (обработка из очереди)
    ↓
- Сохранение в БД
- Обновление полей
- Отправка уведомлений (Telegram/Email)
```

## Компоненты

### WebhookProcessor (`webhook.processor.ts`)

- Обрабатывает задачи из очереди `webhooks`
- Сохраняет webhook в базу данных
- Отправляет уведомления через Telegram и Email

### WebhookDeduplicationService (`webhook-deduplication.service.ts`)

- Проверяет дубликаты на основе хэша
- Хранит записи в памяти (Map)
- Автоматическая очистка устаревших записей

### WebhookService (обновлено)

- Метод `addToQueue()` - добавляет webhook в очередь с проверкой дубликатов
- Метод `create()` - прямое создание (deprecated, для совместимости)

## Конфигурация

### Переменные окружения (.env)

```bash
# Redis для очередей
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password # опционально
```

### Параметры очереди

```typescript
// Настройки по умолчанию
{
  attempts: 3,                    // Количество попыток
  backoff: {
    type: 'exponential',
    delay: 2000                   // Начальная задержка в мс
  },
  removeOnComplete: 100,          // Хранить 100 последних выполненных
  removeOnFail: false             // Сохранять неудачные для анализа
}
```

### Параметры дедупликации

```typescript
DEDUPLICATION_WINDOW_MS = 60000; // 1 минута
CLEANUP_INTERVAL_MS = 120000; // 2 минуты
```

## API Response

### Успешное добавление в очередь

```json
{
  "status": "queued",
  "message": "Webhook queued for processing",
  "jobId": "12345"
}
```

### Дубликат обнаружен

```json
{
  "status": "rejected",
  "message": "Duplicate webhook detected within deduplication window"
}
```

## Установка и запуск

### 1. Установка зависимостей

```bash
npm install @nestjs/bull bull
```

### 2. Установка и запуск Redis

```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:alpine
```

### 3. Настройка .env

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 4. Запуск приложения

```bash
npm run start:dev
```

## Мониторинг и отладка

### Логи

Все операции логируются с использованием NestJS Logger:

- `WebhookProcessor` - обработка задач
- `WebhookDeduplicationService` - дедупликация
- `WebhookService` - управление очередью

### Просмотр очереди

Можно использовать Bull Board для визуального мониторинга:

```bash
npm install @bull-board/api @bull-board/express
```

### Статистика дедупликации

```typescript
// В WebhookDeduplicationService
getStats() {
  return {
    cacheSize: this.recentWebhooks.size,
    deduplicationWindowMs: this.DEDUPLICATION_WINDOW_MS,
    cleanupIntervalMs: this.CLEANUP_INTERVAL_MS,
  };
}
```

## Производительность

### Преимущества

- ✅ Быстрый ответ клиенту (< 50ms)
- ✅ Обработка webhook'ов в фоне
- ✅ Автоматические повторы при ошибках
- ✅ Масштабируемость через Redis
- ✅ Защита от дублирующихся запросов

### Рекомендации

- Для высоконагруженных систем используйте Redis Cluster
- Настройте мониторинг очереди
- Регулярно проверяйте неудачные задачи
- Настройте алерты на переполнение очереди

## Миграция с прямой обработки

Старый код (прямая обработка):

```typescript
const webhook = await this.webhookService.create(webhookData, userId);
```

Новый код (через очередь):

```typescript
const result = await this.webhookService.addToQueue(webhookData, userId);
```

## Troubleshooting

### Проблема: Очередь не обрабатывается

**Решение:** Проверьте соединение с Redis

```bash
redis-cli ping
# Должно вернуть: PONG
```

### Проблема: Дубликаты пропускаются неправильно

**Решение:** Очистите кеш дедупликации

```typescript
webhookDeduplicationService.clearCache();
```

### Проблема: Задачи постоянно падают

**Решение:** Проверьте логи процессора и доступность внешних сервисов (Telegram, Email)

## Дополнительная информация

- [Bull Documentation](https://github.com/OptimalBits/bull)
- [NestJS Bull Module](https://docs.nestjs.com/techniques/queues)
- [Redis Documentation](https://redis.io/documentation)
