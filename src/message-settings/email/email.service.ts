import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  /**
   * Отправляет email сообщение
   */
  async sendEmail(
    to: string,
    subject: string,
    text: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    smtpConfig?: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isSmtpEnabled?: boolean,
  ): Promise<void> {
    this.logger.log(`Отправка email на ${to} с темой: ${subject}`);

    try {
      // ====== ВРЕМЕННО: Тестирование с debugmail.io ======
      // TODO: После тестирования раскомментировать основной код ниже и удалить eslint-disable

      this.logger.log('Отправка через debugmail.io для тестирования...');

      const debugMailTransporter = nodemailer.createTransport({
        host: 'app.debugmail.io',
        port: 25,
        auth: {
          user: '3e8cc11b-0f66-4ac1-a734-8a9a25846165',
          pass: '29b9d738-6aec-48d7-969d-de2f8fed74eb',
        },
      });

      const mailOptions = {
        from: 'test@example.com',
        to,
        subject,
        text,
        html: text.replace(/\n/g, '<br>'),
      };

      const info = await debugMailTransporter.sendMail(mailOptions);
      this.logger.log(`Email успешно отправлен: ${info.messageId}`);

      // ====== ОСНОВНОЙ КОД (закомментирован на время теста) ======
      /*
      let transporter: nodemailer.Transporter;
      let fromAddress: string;

      // Определяем конфигурацию SMTP
      const user = smtpConfig?.auth?.user || process.env.SMTP_USER || '';
      const pass = smtpConfig?.auth?.pass || process.env.SMTP_PASS || '';

      // Проверяем валидность credentials (не пустые строки и не только пробелы)
      const hasValidCredentials =
        user && user.trim().length > 0 && pass && pass.trim().length > 0;

      // Проверяем, нужно ли использовать sendmail (аналог PHP mail())
      // Используем sendmail если:
      // 1. Явно указано USE_SENDMAIL=true
      // 2. isSmtpEnabled === false (пользователь отключил SMTP)
      // 3. Нет валидных credentials
      const useSendmail =
        process.env.USE_SENDMAIL === 'true' ||
        isSmtpEnabled === false ||
        !hasValidCredentials;

      if (useSendmail) {
        // Используем sendmail транспорт (аналог PHP mail())
        this.logger.log(
          'Используется sendmail транспорт (локальный MTA) для отправки email',
        );

        transporter = nodemailer.createTransport({
          sendmail: true,
          newline: 'unix',
          path: process.env.SENDMAIL_PATH || '/usr/sbin/sendmail',
        });

        fromAddress =
          process.env.SMTP_FROM ||
          process.env.DEFAULT_FROM_EMAIL ||
          'noreply@localhost';
      } else {
        // Используем SMTP транспорт
        const host =
          smtpConfig?.host || process.env.SMTP_HOST || 'smtp.gmail.com';
        const port =
          smtpConfig?.port || parseInt(process.env.SMTP_PORT || '587');
        const secure = smtpConfig?.secure || false;

        this.logger.log(`Используется SMTP транспорт: ${host}:${port}`);

        transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: {
            user,
            pass,
          },
        });

        fromAddress = process.env.SMTP_FROM || user;
      }

      // Настройки письма
      const mailOptions = {
        from: fromAddress,
        to,
        subject,
        text,
        html: text.replace(/\n/g, '<br>'), // Преобразуем переносы строк в HTML
      };

      // Отправляем письмо
      const info = await transporter.sendMail(mailOptions);
      this.logger.log(`Email успешно отправлен: ${info.messageId}`);
      */
    } catch (error) {
      this.logger.error(`Ошибка при отправке email: ${error.message}`);
      throw error;
    }
  }
}
