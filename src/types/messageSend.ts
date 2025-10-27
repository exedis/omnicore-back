export type TelegramSettingsResponse = {
  isTelegramEnabled: boolean;
  telegramChatId: string;
  telegramSettings: Record<string, any>;
};

export type EmailSettingsResponse = {
  isEmailEnabled: boolean;
  emailAddresses: string[];
  emailSettings: Record<string, any>;
};
