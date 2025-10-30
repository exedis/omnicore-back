# Настройка Redis для Webhook Queue

## Быстрый старт

### 1. Установка Redis

#### macOS (через Homebrew)

```bash
brew install redis
brew services start redis
```

#### Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

#### Docker

```bash
docker run -d --name redis -p 6379:6379 redis:alpine
```

### 2. Проверка работы Redis

```bash
redis-cli ping
# Должно вернуть: PONG
```

### 3. Добавление переменных в .env

Добавьте следующие переменные в ваш файл `.env`:

```bash
# Redis для очередей
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # оставьте пустым для локальной разработки
```

### 4. Запуск приложения

```bash
npm run start:dev
```

## Проверка работы

### Отправка тестового webhook

```bash
curl -X POST http://localhost:3000/public/webhooks \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "siteName": "test-site",
    "formName": "contact-form",
    "data": {
      "name": "Test User",
      "email": "test@example.com"
    }
  }'
```

### Ожидаемый ответ

```json
{
  "status": "queued",
  "message": "Webhook queued for processing",
  "jobId": "1"
}
```

### Проверка дедупликации

Отправьте тот же запрос еще раз в течение 60 секунд:

```json
{
  "status": "rejected",
  "message": "Duplicate webhook detected within deduplication window"
}
```

## Мониторинг Redis

### Просмотр всех ключей

```bash
redis-cli
> KEYS *
```

### Просмотр очередей Bull

```bash
redis-cli
> KEYS bull:webhooks:*
```

### Статистика памяти

```bash
redis-cli INFO memory
```

## Production конфигурация

Для production рекомендуется:

1. **Использовать пароль для Redis**

```bash
# В redis.conf
requirepass your_strong_password

# В .env
REDIS_PASSWORD=your_strong_password
```

2. **Настроить persistence**

```bash
# В redis.conf
save 900 1
save 300 10
save 60 10000
```

3. **Ограничить максимальную память**

```bash
# В redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
```

## Полезные команды

### Очистка всех очередей

```bash
redis-cli FLUSHALL
```

### Просмотр количества задач в очереди

```bash
redis-cli
> LLEN bull:webhooks:wait
```

### Остановка Redis

```bash
# macOS
brew services stop redis

# Linux
sudo systemctl stop redis

# Docker
docker stop redis
```

## Troubleshooting

### Redis не запускается

```bash
# Проверьте логи
tail -f /usr/local/var/log/redis.log  # macOS
tail -f /var/log/redis/redis-server.log  # Linux

# Проверьте, не занят ли порт
lsof -i :6379
```

### Приложение не может подключиться к Redis

```bash
# Проверьте, что Redis слушает на правильном порту
redis-cli INFO server | grep tcp_port

# Проверьте настройки файрвола
sudo ufw status  # Linux
```
