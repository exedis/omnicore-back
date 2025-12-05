// ============================================
// ТИПЫ ДЛЯ СИСТЕМЫ ПРИГЛАШЕНИЙ
// ============================================

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

export interface Invitation {
  id: string;
  board_id: string;
  api_key_id: string;
  inviter_id: string;
  invitee_id: string | null;
  token: string;
  status: InvitationStatus;
  expiresAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations
  board?: {
    id: string;
    name: string;
    description: string | null;
  };
  apiKey?: {
    id: string;
    name: string;
    key: string;
  };
  inviter?: {
    id: string;
    email: string;
  };
  invitee?: {
    id: string;
    email: string;
  };
}

// ============================================
// DTO
// ============================================

export interface CreateInvitationDto {
  apiKeyId: string;
  expiresInDays?: number; // По умолчанию 7 дней
}

export interface InvitationResponse {
  invitation: Invitation;
  invitationUrl: string;
}

export interface InvitationInfoResponse {
  valid: boolean;
  invitation?: Partial<Invitation>;
  error?: string;
}

// ============================================
// API CLIENT
// ============================================

export class InvitationsApiClient {
  constructor(
    private baseUrl: string = 'http://localhost:3000',
    private getAuthToken: () => string | null,
  ) {}

  private getHeaders(): HeadersInit {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Создать приглашение
   */
  async createInvitation(
    dto: CreateInvitationDto,
  ): Promise<InvitationResponse> {
    const response = await fetch(`${this.baseUrl}/invitations`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(dto),
    });

    if (!response.ok) {
      throw new Error(`Failed to create invitation: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Получить все приглашения пользователя
   */
  async getInvitations(): Promise<Invitation[]> {
    const response = await fetch(`${this.baseUrl}/invitations`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch invitations: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Получить приглашения для конкретного API ключа
   */
  async getInvitationsByApiKey(apiKeyId: string): Promise<Invitation[]> {
    const response = await fetch(
      `${this.baseUrl}/invitations/by-api-key/${apiKeyId}`,
      {
        headers: this.getHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch invitations for API key: ${response.statusText}`,
      );
    }

    return response.json();
  }

  /**
   * Получить информацию о приглашении по токену (публичный метод)
   */
  async getInvitationInfo(token: string): Promise<InvitationInfoResponse> {
    const response = await fetch(`${this.baseUrl}/invitations/info/${token}`);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch invitation info: ${response.statusText}`,
      );
    }

    return response.json();
  }

  /**
   * Принять приглашение
   */
  async acceptInvitation(token: string): Promise<Invitation> {
    const response = await fetch(
      `${this.baseUrl}/invitations/accept/${token}`,
      {
        method: 'POST',
        headers: this.getHeaders(),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to accept invitation');
    }

    return response.json();
  }

  /**
   * Получить одно приглашение
   */
  async getInvitation(id: string): Promise<Invitation> {
    const response = await fetch(`${this.baseUrl}/invitations/${id}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch invitation: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Отозвать приглашение
   */
  async revokeInvitation(id: string): Promise<Invitation> {
    const response = await fetch(`${this.baseUrl}/invitations/${id}/revoke`, {
      method: 'PATCH',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to revoke invitation: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Удалить приглашение
   */
  async deleteInvitation(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/invitations/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete invitation: ${response.statusText}`);
    }
  }
}

// ============================================
// ХЕЛПЕРЫ
// ============================================

/**
 * Проверить истек ли срок приглашения
 */
export function isInvitationExpired(invitation: Invitation): boolean {
  if (!invitation.expiresAt) return false;
  return new Date(invitation.expiresAt) < new Date();
}

/**
 * Получить статус приглашения (с учетом истечения)
 */
export function getInvitationStatus(invitation: Invitation): InvitationStatus {
  if (
    invitation.status === InvitationStatus.PENDING &&
    isInvitationExpired(invitation)
  ) {
    return InvitationStatus.EXPIRED;
  }
  return invitation.status;
}

/**
 * Получить время до истечения приглашения
 */
export function getTimeUntilExpiry(invitation: Invitation): string | null {
  if (!invitation.expiresAt) return null;

  const now = new Date();
  const expiry = new Date(invitation.expiresAt);
  const diff = expiry.getTime() - now.getTime();

  if (diff <= 0) return 'Истекло';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) {
    return `Истекает через ${days} ${days === 1 ? 'день' : 'дней'}`;
  } else if (hours > 0) {
    return `Истекает через ${hours} ${hours === 1 ? 'час' : 'часов'}`;
  } else {
    return 'Истекает менее чем через час';
  }
}

/**
 * Получить текст статуса на русском
 */
export function getInvitationStatusText(status: InvitationStatus): string {
  switch (status) {
    case InvitationStatus.PENDING:
      return 'Ожидает принятия';
    case InvitationStatus.ACCEPTED:
      return 'Принято';
    case InvitationStatus.REVOKED:
      return 'Отозвано';
    case InvitationStatus.EXPIRED:
      return 'Истекло';
    default:
      return 'Неизвестно';
  }
}

/**
 * Получить цвет статуса
 */
export function getInvitationStatusColor(
  status: InvitationStatus,
): 'default' | 'success' | 'warning' | 'error' {
  switch (status) {
    case InvitationStatus.PENDING:
      return 'warning';
    case InvitationStatus.ACCEPTED:
      return 'success';
    case InvitationStatus.REVOKED:
    case InvitationStatus.EXPIRED:
      return 'error';
    default:
      return 'default';
  }
}

// ============================================
// ПРИМЕР ИСПОЛЬЗОВАНИЯ
// ============================================

/*
// Инициализация клиента
const invitationsApi = new InvitationsApiClient(
  'http://localhost:3000',
  () => localStorage.getItem('authToken')
);

// Создание приглашения
const { invitation, invitationUrl } = await invitationsApi.createInvitation({
  apiKeyId: 'api-key-uuid',
  expiresInDays: 7
});

console.log('Ссылка-приглашение:', invitationUrl);
// http://localhost:3000/invitations/accept/abc123...

// Получение всех приглашений
const invitations = await invitationsApi.getInvitations();

// Получение приглашений для конкретного API ключа
const apiKeyInvitations = await invitationsApi.getInvitationsByApiKey('api-key-uuid');

// Проверка информации о приглашении (публичный метод)
const info = await invitationsApi.getInvitationInfo(token);
if (info.valid) {
  console.log('Приглашение валидно, доска:', info.invitation?.board?.name);
}

// Принятие приглашения
const accepted = await invitationsApi.acceptInvitation(token);

// Отзыв приглашения
await invitationsApi.revokeInvitation(invitation.id);

// Удаление приглашения
await invitationsApi.deleteInvitation(invitation.id);
*/
