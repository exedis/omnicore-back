# Система приглашений

## Обзор

Система приглашений позволяет владельцам досок задач приглашать других пользователей для совместной работы. Приглашение представляет собой уникальную ссылку с ограниченным сроком действия.

## Архитектура

### Entity: Invitation

```typescript
{
  id: string; // UUID приглашения
  board_id: string; // Доска, к которой приглашают
  api_key_id: string; // API ключ, связанный с доской
  inviter_id: string; // Кто создал приглашение
  invitee_id: string | null; // Кто принял приглашение (после принятия)
  token: string; // Уникальный токен для ссылки
  status: InvitationStatus; // pending | accepted | revoked | expired
  expiresAt: Date; // Когда истекает
  acceptedAt: Date | null; // Когда было принято
  createdAt: Date;
  updatedAt: Date;
}
```

### Статусы приглашения

- **PENDING** - ожидает принятия
- **ACCEPTED** - принято пользователем
- **REVOKED** - отозвано владельцем
- **EXPIRED** - истек срок действия

## API Endpoints

### 1. Создание приглашения

**POST** `/invitations`

Создает новое приглашение для доски, связанной с API ключом.

**Требования:**

- Только владелец доски может создавать приглашения
- API ключ должен быть связан с доской

**Request:**

```typescript
{
  apiKeyId: string;          // UUID API ключа
  expiresInDays?: number;    // Срок действия в днях (по умолчанию 7)
}
```

**Response:**

```typescript
{
  invitation: Invitation;
  invitationUrl: string; // Готовая ссылка для отправки
}
```

**Пример:**

```javascript
const response = await fetch('/invitations', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    apiKeyId: 'abc-123-def-456',
    expiresInDays: 7,
  }),
});

const { invitation, invitationUrl } = await response.json();
console.log('Ссылка:', invitationUrl);
// http://localhost:3000/invitations/accept/xyz789...
```

---

### 2. Получение всех приглашений

**GET** `/invitations`

Получает все приглашения, созданные текущим пользователем.

**Response:**

```typescript
Invitation[]
```

**Пример:**

```javascript
const response = await fetch('/invitations', {
  headers: { Authorization: `Bearer ${token}` },
});

const invitations = await response.json();
invitations.forEach((inv) => {
  console.log(`${inv.board.name}: ${inv.status}`);
});
```

---

### 3. Получение приглашений для API ключа

**GET** `/invitations/by-api-key/:apiKeyId`

Получает все приглашения для конкретного API ключа.

**Response:**

```typescript
Invitation[]
```

**Пример:**

```javascript
const apiKeyId = 'abc-123-def-456';
const response = await fetch(`/invitations/by-api-key/${apiKeyId}`, {
  headers: { Authorization: `Bearer ${token}` },
});

const invitations = await response.json();
```

---

### 4. Получение информации о приглашении (публичный)

**GET** `/invitations/info/:token`

Получает информацию о приглашении по токену. **Не требует авторизации.**

**Response:**

```typescript
{
  valid: boolean;
  invitation?: Partial<Invitation>;
  error?: string;
}
```

**Пример:**

```javascript
const token = 'xyz789abc123...';
const response = await fetch(`/invitations/info/${token}`);

const info = await response.json();
if (info.valid) {
  console.log('Приглашение на доску:', info.invitation.board.name);
  console.log('От пользователя:', info.invitation.inviter.email);
} else {
  console.log('Ошибка:', info.error);
}
```

---

### 5. Принятие приглашения

**POST** `/invitations/accept/:token`

Принимает приглашение и добавляет пользователя в участники доски.

**Требования:**

- Пользователь должен быть авторизован
- Приглашение должно быть в статусе PENDING
- Срок действия не должен истечь
- Пользователь не должен быть владельцем приглашения

**Response:**

```typescript
Invitation; // С обновленным статусом ACCEPTED
```

**Пример:**

```javascript
const token = 'xyz789abc123...';
const response = await fetch(`/invitations/accept/${token}`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
});

const invitation = await response.json();
console.log('Приглашение принято!');
console.log('Теперь вы участник доски:', invitation.board.name);
```

---

### 6. Получение одного приглашения

**GET** `/invitations/:id`

Получает информацию об одном приглашении.

**Response:**

```typescript
Invitation;
```

---

### 7. Отзыв приглашения

**PATCH** `/invitations/:id/revoke`

Отзывает приглашение. Если оно было принято - удаляет пользователя из участников доски.

**Требования:**

- Только создатель приглашения может его отозвать

**Response:**

```typescript
Invitation; // С обновленным статусом REVOKED
```

**Пример:**

```javascript
const invitationId = 'inv-123-456';
const response = await fetch(`/invitations/${invitationId}/revoke`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}` },
});

const invitation = await response.json();
console.log('Приглашение отозвано');
```

---

### 8. Удаление приглашения

**DELETE** `/invitations/:id`

Полностью удаляет приглашение из базы данных.

**Требования:**

- Только создатель приглашения может его удалить

**Response:**

```
204 No Content
```

**Пример:**

```javascript
await fetch(`/invitations/${invitationId}`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## Полный цикл работы

### 1. Создание приглашения

```javascript
// Владелец доски создает приглашение
const { invitation, invitationUrl } = await invitationsApi.createInvitation({
  apiKeyId: 'my-api-key-id',
  expiresInDays: 7,
});

// Отправляет ссылку другому пользователю (email, мессенджер и т.д.)
sendEmail(friendEmail, `Приглашение на доску: ${invitationUrl}`);
```

### 2. Проверка приглашения

```javascript
// Пользователь переходит по ссылке
// Фронтенд извлекает token из URL и проверяет приглашение

const token = getTokenFromUrl(); // из /invitations/accept/:token
const info = await invitationsApi.getInvitationInfo(token);

if (!info.valid) {
  showError(info.error); // "Приглашение отозвано" / "Срок истек"
  return;
}

// Показываем информацию о приглашении
showInvitationPreview({
  boardName: info.invitation.board.name,
  inviterEmail: info.invitation.inviter.email,
  expiresAt: info.invitation.expiresAt,
});
```

### 3. Принятие приглашения

```javascript
// Пользователь нажимает "Принять приглашение"
try {
  const accepted = await invitationsApi.acceptInvitation(token);

  // Перенаправляем на доску
  router.push(`/boards/${accepted.board_id}`);

  showSuccess('Вы успешно присоединились к доске!');
} catch (error) {
  showError(error.message);
}
```

### 4. Управление приглашениями

```javascript
// Владелец видит все свои приглашения
const invitations = await invitationsApi.getInvitations();

invitations.forEach((inv) => {
  console.log(`
    Доска: ${inv.board.name}
    Статус: ${getInvitationStatusText(inv.status)}
    ${inv.invitee ? `Принято: ${inv.invitee.email}` : 'Ожидает'}
    Истекает: ${getTimeUntilExpiry(inv)}
  `);
});
```

### 5. Отзыв доступа

```javascript
// Владелец отзывает приглашение
await invitationsApi.revokeInvitation(invitation.id);

// Пользователь, принявший приглашение, теряет доступ к доске
// Ссылка-приглашение больше не работает
```

---

## Примеры использования

### Пример 1: Страница управления доской

```tsx
function BoardSettingsPage({ boardId }) {
  const [invitations, setInvitations] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Загружаем API ключи доски
    const keys = await apiKeysApi.getAll();
    setApiKeys(keys);

    // Загружаем приглашения
    const invs = await invitationsApi.getInvitations();
    setInvitations(invs.filter((inv) => inv.board_id === boardId));
  };

  const createInvitation = async (apiKeyId) => {
    const { invitationUrl } = await invitationsApi.createInvitation({
      apiKeyId,
      expiresInDays: 7,
    });

    // Копируем ссылку в буфер обмена
    navigator.clipboard.writeText(invitationUrl);
    toast.success('Ссылка скопирована!');

    loadData();
  };

  const revokeInvitation = async (invitationId) => {
    await invitationsApi.revokeInvitation(invitationId);
    toast.success('Приглашение отозвано');
    loadData();
  };

  return (
    <div>
      <h2>Приглашения</h2>

      {/* Создание нового приглашения */}
      <select onChange={(e) => createInvitation(e.target.value)}>
        <option>Выберите API ключ</option>
        {apiKeys.map((key) => (
          <option key={key.id} value={key.id}>
            {key.name}
          </option>
        ))}
      </select>

      {/* Список приглашений */}
      <table>
        <thead>
          <tr>
            <th>API ключ</th>
            <th>Статус</th>
            <th>Приглашенный</th>
            <th>Истекает</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {invitations.map((inv) => (
            <tr key={inv.id}>
              <td>{inv.apiKey.name}</td>
              <td>
                <Badge color={getInvitationStatusColor(inv.status)}>
                  {getInvitationStatusText(inv.status)}
                </Badge>
              </td>
              <td>{inv.invitee?.email || '—'}</td>
              <td>{getTimeUntilExpiry(inv)}</td>
              <td>
                {inv.status === 'pending' && (
                  <button onClick={() => revokeInvitation(inv.id)}>
                    Отозвать
                  </button>
                )}
                {inv.status === 'accepted' && (
                  <button onClick={() => revokeInvitation(inv.id)}>
                    Удалить доступ
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Пример 2: Страница принятия приглашения

```tsx
function AcceptInvitationPage() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkInvitation();
  }, [token]);

  const checkInvitation = async () => {
    try {
      const data = await invitationsApi.getInvitationInfo(token);
      setInfo(data);
    } catch (error) {
      setInfo({ valid: false, error: 'Ошибка загрузки' });
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async () => {
    try {
      setLoading(true);
      const accepted = await invitationsApi.acceptInvitation(token);

      toast.success('Вы присоединились к доске!');
      navigate(`/boards/${accepted.board_id}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spinner />;

  if (!info.valid) {
    return (
      <div>
        <h2>Приглашение недействительно</h2>
        <p>{info.error}</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Приглашение на доску</h2>
      <p>Вас приглашает: {info.invitation.inviter.email}</p>
      <h3>{info.invitation.board.name}</h3>
      <p>{info.invitation.board.description}</p>
      <p>API ключ: {info.invitation.apiKey.name}</p>
      <p>Истекает: {getTimeUntilExpiry(info.invitation)}</p>

      <button onClick={acceptInvitation} disabled={loading}>
        Принять приглашение
      </button>
    </div>
  );
}
```

### Пример 3: Быстрое создание и копирование ссылки

```tsx
function QuickInviteButton({ apiKeyId }) {
  const [copied, setCopied] = useState(false);

  const createAndCopyInvite = async () => {
    try {
      const { invitationUrl } = await invitationsApi.createInvitation({
        apiKeyId,
        expiresInDays: 7,
      });

      await navigator.clipboard.writeText(invitationUrl);
      setCopied(true);

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Ошибка создания приглашения');
    }
  };

  return (
    <button onClick={createAndCopyInvite}>
      {copied ? '✓ Ссылка скопирована' : 'Пригласить'}
    </button>
  );
}
```

---

## Безопасность

### Проверки при создании приглашения

1. Только владелец доски может создавать приглашения
2. API ключ должен быть связан с доской
3. API ключ должен принадлежать пользователю

### Проверки при принятии приглашения

1. Приглашение должно существовать
2. Статус должен быть PENDING
3. Срок действия не должен истечь
4. Пользователь не может принять свое же приглашение
5. Пользователь еще не должен быть участником доски

### Проверки при отзыве приглашения

1. Только создатель может отозвать приглашение
2. При отзыве принятого приглашения пользователь удаляется из участников

---

## Ограничения и особенности

### Срок действия

- По умолчанию приглашение действует 7 дней
- Можно указать от 1 до 365 дней
- После истечения срока приглашение автоматически становится EXPIRED

### Токены

- Каждое приглашение имеет уникальный токен (64 символа)
- Токен генерируется криптографически безопасным способом
- Токен передается в URL и не требует дополнительной авторизации для просмотра

### Удаление

- При удалении доски удаляются все её приглашения (CASCADE)
- При удалении API ключа удаляются связанные приглашения (CASCADE)
- При удалении пользователя удаляются созданные им приглашения (CASCADE)

### Роли

- Приглашенные пользователи получают роль **MEMBER**
- Владелец доски всегда имеет роль **OWNER**
- Только владелец может создавать/отзывать приглашения

---

## FAQ

**Q: Можно ли пригласить конкретного пользователя по email?**

A: Нет, приглашение работает через ссылку. Вы создаете ссылку и отправляете её нужному человеку любым способом (email, мессенджер и т.д.).

**Q: Что будет если срок приглашения истек?**

A: Приглашение получит статус EXPIRED и его нельзя будет принять.

**Q: Можно ли продлить приглашение?**

A: Нет, но можно создать новое приглашение.

**Q: Что будет если отозвать уже принятое приглашение?**

A: Пользователь будет удален из участников доски и потеряет доступ ко всем задачам.

**Q: Может ли один пользователь принять несколько приглашений на одну доску?**

A: Нет, если пользователь уже является участником доски, он не сможет принять приглашение.

**Q: Можно ли создать неограниченное количество приглашений?**

A: Да, ограничений на количество приглашений нет.

---

## Миграция данных

Если у вас уже есть пользователи и доски, приглашения создаются автоматически при первом запуске (TypeORM синхронизация).

Существующие участники досок (BoardMember) сохраняются и продолжают работать как обычно.

---

## Frontend интеграция

### React Router

```tsx
// routes.tsx
{
  path: '/invitations/accept/:token',
  element: <AcceptInvitationPage />
}
```

### URL структура

```
/invitations/accept/abc123def456...
```

### Рекомендации

1. Показывайте предпросмотр приглашения перед принятием
2. Обрабатывайте ошибки (истекло, отозвано и т.д.)
3. Копируйте ссылку в буфер обмена одной кнопкой
4. Показывайте время до истечения приглашения
5. Давайте возможность отозвать приглашение из UI

---

## Типы для TypeScript

См. файл `invitations-types.ts` для полного набора типов и API клиента.
