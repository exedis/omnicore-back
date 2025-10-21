# Omnicore Backend - Система авторизации

## Описание

Backend приложение на NestJS с системой авторизации и регистрации пользователей, интегрированное с фронтендом.

## Функциональность

- ✅ Регистрация пользователей
- ✅ Авторизация пользователей
- ✅ JWT токены для аутентификации
- ✅ Получение информации о пользователе
- ✅ Валидация данных
- ✅ CORS настройки для интеграции с фронтендом

## API Endpoints

### Авторизация

- `POST /auth/register` - Регистрация нового пользователя
- `POST /auth/login` - Вход в систему
- `GET /auth/me` - Получение информации о текущем пользователе

## Установка и запуск

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка базы данных

Создайте PostgreSQL базу данных:

```sql
CREATE DATABASE omnicore;
```

### 3. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=omnicore

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Environment
NODE_ENV=development
```

### 4. Запуск приложения

```bash
# Разработка
npm run start:dev

# Продакшн
npm run build
npm run start:prod
```

Приложение будет доступно по адресу: `http://localhost:3001`

## Структура проекта

```
src/
├── auth/                 # Модуль авторизации
│   ├── dto/             # Data Transfer Objects
│   ├── guards/          # Guards для защиты роутов
│   ├── strategies/      # Passport стратегии
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── user/                # Модуль пользователей
│   ├── user.entity.ts
│   ├── user.service.ts
│   └── user.module.ts
├── app.module.ts        # Главный модуль
└── main.ts             # Точка входа
```

## Интеграция с фронтендом

Фронтенд настроен для работы с бэкендом по адресу `http://localhost:3001`.

### Примеры использования API

#### Регистрация

```javascript
const response = await fetch('http://localhost:3001/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    name: 'John Doe',
  }),
});
```

#### Авторизация

```javascript
const response = await fetch('http://localhost:3001/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
  }),
});
```

#### Получение информации о пользователе

```javascript
const response = await fetch('http://localhost:3001/auth/me', {
  headers: {
    Authorization: 'Bearer YOUR_JWT_TOKEN',
  },
});
```

## Безопасность

- Пароли хешируются с помощью bcryptjs
- JWT токены имеют срок действия 24 часа
- Валидация всех входящих данных
- CORS настроен для работы с фронтендом

## Технологии

- NestJS
- TypeORM
- PostgreSQL
- JWT
- Passport
- bcryptjs
- class-validator
- class-transformer
