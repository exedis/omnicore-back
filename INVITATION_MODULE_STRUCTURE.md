# Структура модуля Invitation

## Обзор

Модуль приглашений был вынесен из `board` в отдельную папку `invitation` для лучшей организации кода.

## Структура файлов

```
src/invitation/
├── dto/
│   └── invitation.dto.ts          # DTO для создания приглашений
├── invitation.entity.ts           # Entity для таблицы invitations
├── invitation.service.ts          # Бизнес-логика приглашений
├── invitation.controller.ts       # REST API endpoints
└── invitation.module.ts           # NestJS модуль
```

## Файлы модуля

### `invitation.entity.ts`

- **Entity**: `Invitation`
- **Enum**: `InvitationStatus` (PENDING, ACCEPTED, REVOKED, EXPIRED)
- **Связи**:
  - `ManyToOne` → Board
  - `ManyToOne` → ApiKey
  - `ManyToOne` → User (inviter)
  - `ManyToOne` → User (invitee)

### `invitation.service.ts`

- `create()` - создание приглашения
- `accept()` - принятие приглашения
- `findAll()` - получение всех приглашений пользователя
- `findByApiKey()` - приглашения для API ключа
- `findOne()` - получение одного приглашения
- `revoke()` - отзыв приглашения
- `delete()` - удаление приглашения
- `getInvitationInfo()` - публичная проверка валидности

### `invitation.controller.ts`

REST API endpoints:

- `POST /invitations`
- `GET /invitations`
- `GET /invitations/by-api-key/:apiKeyId`
- `GET /invitations/info/:token` (публичный)
- `POST /invitations/accept/:token`
- `GET /invitations/:id`
- `PATCH /invitations/:id/revoke`
- `DELETE /invitations/:id`

### `invitation.module.ts`

NestJS модуль, который:

- Импортирует необходимые зависимости (TypeORM, JWT, BoardModule)
- Регистрирует Entity: Invitation, ApiKey, BoardMember
- Экспортирует InvitationService для использования в других модулях

### `dto/invitation.dto.ts`

- `CreateInvitationDto` - для создания приглашения
- `AcceptInvitationDto` - для принятия приглашения

## Интеграция с другими модулями

### Board Module

- `InvitationModule` использует `BoardService` через `forwardRef`
- Доступ к `BoardMember` для добавления/удаления участников

### Api-Key Module

- Проверка владения API ключом
- Получение связанной доски через `board_id`

### Auth Module

- JWT авторизация через `AuthGuard`
- Проверка прав доступа

## App Module

Модуль добавлен в импорты:

```typescript
@Module({
  imports: [
    // ...
    BoardModule,
    TaskModule,
    InvitationModule, // ← Новый модуль
  ],
  // ...
})
export class AppModule {}
```

## Изменения в других модулях

### BoardModule

**До:**

```typescript
imports: [
  TypeOrmModule.forFeature([Board, BoardMember, BoardColumn, Invitation, ...]),
  // ...
],
controllers: [BoardController, InvitationController],
providers: [BoardService, InvitationService],
exports: [BoardService, InvitationService],
```

**После:**

```typescript
imports: [
  TypeOrmModule.forFeature([Board, BoardMember, BoardColumn, User]),
  // ...
],
controllers: [BoardController],
providers: [BoardService],
exports: [BoardService],
```

## Преимущества новой структуры

✅ **Модульность**: Invitation - это логически отдельная функциональность

✅ **Независимость**: Модуль может быть легко переиспользован

✅ **Чистота кода**: Board модуль теперь отвечает только за доски

✅ **Легкость тестирования**: Каждый модуль тестируется отдельно

✅ **Масштабируемость**: Проще добавлять новые функции

## Импорты после реорганизации

Теперь для использования Invitation:

```typescript
// До
import { Invitation } from './board/invitation.entity';

// После
import { Invitation } from './invitation/invitation.entity';
```

## Миграция

При обновлении кодовой базы убедитесь, что:

1. ✅ Все импорты обновлены с `board/invitation.*` на `invitation/*`
2. ✅ `InvitationModule` добавлен в `AppModule`
3. ✅ `BoardModule` больше не содержит invitation компоненты
4. ✅ Проект успешно компилируется

## Связанная документация

- `INVITATIONS_README.md` - полная документация API
- `INVITATIONS_QUICKSTART.md` - быстрый старт
- `invitations-types.ts` - TypeScript типы для фронтенда
