// ==================== Типы для фронтенда ====================

export type TemplateType = 'telegram' | 'email';

// ==================== Telegram ====================

export interface UpdateTelegramSettingsRequest {
  enabled?: boolean;
  chatId?: string;
  username?: string;
  additionalSettings?: Record<string, any>;
}

// ==================== Email ====================

export interface EmailSettingsResponse {
  isEmailEnabled: boolean;
  emailAddresses: string[];
  emailSettings: Record<string, any>;
}

export interface UpdateEmailSettingsRequest {
  enabled?: boolean;
  emailAddresses?: string[];
  isSmtpEnabled?: boolean;
  smtpHost?: string;
  smtpPort?: string;
  smtpUsername?: string;
  smtpPassword?: string;
}

// ==================== Шаблоны ====================

export interface MessageTemplate {
  id: string;
  type: TemplateType;
  messageTemplate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplatesResponse {
  userTemplates: MessageTemplate[];
  variablesFromMessages: string[];
}

export interface UpdateTemplateRequest {
  messageTemplate: string;
}

// ==================== API Response ====================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ==================== HTTP методы ====================

export interface ApiError {
  status: number;
  message: string;
  error?: string;
}

// ==================== Константы ====================

export const API_ENDPOINTS = {
  MESSAGE_SEND: {
    TELEGRAM: {
      ENABLE: '/api/message-settings/telegram/enable',
      DISABLE: '/api/message-settings/telegram/disable',
      SETTINGS: '/api/message-settings/telegram/update',
    },
    EMAIL: {
      ENABLE: '/api/message-settings/email/enable',
      DISABLE: '/api/message-settings/email/disable',
      SETTINGS: '/api/message-settings/email/update',
    },
  },
  MESSAGE_TEMPLATES: {
    LIST: '/api/message-templates',
    UPDATE: (type: TemplateType) => `/api/message-templates/${type}`,
  },
} as const;

export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const;

// ==================== Примеры использования ====================

/*
// В React компоненте
import { 
  TelegramSettingsResponse, 
  UpdateTelegramSettingsRequest,
  ApiError 
} from './types';

const [telegramSettings, setTelegramSettings] = useState<TelegramSettingsResponse | null>(null);

const updateTelegramSettings = async (settings: UpdateTelegramSettingsRequest) => {
  try {
    const response = await fetch('/api/message-settings/telegram', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(settings),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Ошибка обновления настроек:', error);
  }
};
*/
