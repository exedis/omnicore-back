# Быстрый старт: Система приглашений

## Шаг 1: Создать приглашение

```javascript
const { invitationUrl } = await fetch('/invitations', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    apiKeyId: 'your-api-key-id',
    expiresInDays: 7, // Опционально, по умолчанию 7
  }),
}).then((r) => r.json());

// Получаем готовую ссылку
console.log(invitationUrl);
// http://localhost:3000/invitations/accept/abc123...

// Отправляем её другому пользователю
```

## Шаг 2: Проверить приглашение (публичный API)

```javascript
// Пользователь переходит по ссылке
const token = 'abc123...'; // из URL

const info = await fetch(`/invitations/info/${token}`).then((r) => r.json());

if (info.valid) {
  console.log('Доска:', info.invitation.board.name);
  console.log('От:', info.invitation.inviter.email);
} else {
  console.log('Ошибка:', info.error);
}
```

## Шаг 3: Принять приглашение

```javascript
await fetch(`/invitations/accept/${token}`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${userToken}` },
});

// Теперь пользователь участник доски
```

## Шаг 4: Управление приглашениями

```javascript
// Посмотреть все приглашения
const invitations = await fetch('/invitations', {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());

// Отозвать приглашение
await fetch(`/invitations/${invitationId}/revoke`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}` },
});

// Удалить приглашение
await fetch(`/invitations/${invitationId}`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${token}` },
});
```

## Полный пример для React

```tsx
import { useState } from 'react';
import { InvitationsApiClient } from './invitations-types';

const invitationsApi = new InvitationsApiClient('http://localhost:3000', () =>
  localStorage.getItem('authToken'),
);

function InviteButton({ apiKeyId }) {
  const [url, setUrl] = useState('');

  const createInvite = async () => {
    const { invitationUrl } = await invitationsApi.createInvitation({
      apiKeyId,
      expiresInDays: 7,
    });

    setUrl(invitationUrl);
    navigator.clipboard.writeText(invitationUrl);
    alert('Ссылка скопирована!');
  };

  return (
    <div>
      <button onClick={createInvite}>Создать приглашение</button>
      {url && <input value={url} readOnly />}
    </div>
  );
}

function AcceptInvitePage({ token }) {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    invitationsApi.getInvitationInfo(token).then(setInfo);
  }, [token]);

  const accept = async () => {
    await invitationsApi.acceptInvitation(token);
    window.location.href = `/boards/${info.invitation.board_id}`;
  };

  if (!info) return <div>Загрузка...</div>;

  if (!info.valid) {
    return <div>Ошибка: {info.error}</div>;
  }

  return (
    <div>
      <h2>Приглашение на доску</h2>
      <p>Доска: {info.invitation.board.name}</p>
      <p>От: {info.invitation.inviter.email}</p>
      <button onClick={accept}>Принять</button>
    </div>
  );
}
```

## Статусы приглашений

- **pending** - ожидает принятия
- **accepted** - принято
- **revoked** - отозвано
- **expired** - истекло

## Важные моменты

✅ **Только владелец доски** может создавать приглашения

✅ **Приглашение действует 7 дней** по умолчанию

✅ **Ссылка работает один раз** - после принятия статус меняется на accepted

✅ **Отзыв удаляет доступ** - если приглашение было принято, пользователь теряет доступ

✅ **Проверка валидности публичная** - не требует авторизации

❌ **Нельзя принять свое приглашение**

❌ **Нельзя принять дважды** - если уже участник доски

❌ **Нельзя принять отозванное** приглашение

❌ **Нельзя принять истекшее** приглашение

Полная документация: `INVITATIONS_README.md`
