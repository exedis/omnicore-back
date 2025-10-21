import { Injectable } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf, Context } from 'telegraf';
import { TelegramBotService } from './telegram-bot.service';

@Injectable()
export class TelegramBotController {
  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly telegramBotService: TelegramBotService,
  ) {
    this.setupHandlers();
  }

  private setupHandlers() {
    // Обработка команды /start
    this.bot.start(async (ctx) => {
      const chatId = ctx.chat.id.toString();
      const userInfo = ctx.from;
      const messageText = ctx.message.text;

      try {
        let response: string;

        if (messageText.includes(' ')) {
          // Команда /start с токеном
          const token = messageText.split(' ')[1];
          response = await this.telegramBotService.handleStartCommand(
            chatId,
            token,
            userInfo,
          );
        } else {
          // Обычная команда /start
          response =
            await this.telegramBotService.handleStartCommandWithoutToken(
              chatId,
              userInfo,
            );
        }

        await ctx.reply(response);
      } catch (error) {
        console.error('Ошибка обработки команды /start:', error);
        await ctx.reply(
          '❌ Произошла ошибка при обработке команды. Попробуйте позже.',
        );
      }
    });

    // Обработка текстовых сообщений
    this.bot.on('text', async (ctx) => {
      const chatId = ctx.chat.id.toString();
      const userInfo = ctx.from;
      const text = ctx.message.text;

      try {
        const response = await this.telegramBotService.handleTextMessage(
          chatId,
          text,
          userInfo,
        );
        await ctx.reply(response);
      } catch (error) {
        console.error('Ошибка обработки текстового сообщения:', error);
        await ctx.reply(
          '❌ Произошла ошибка при обработке сообщения. Попробуйте позже.',
        );
      }
    });

    // Обработка ошибок
    this.bot.catch((err, ctx) => {
      console.error('Ошибка в боте:', err);
      ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    });
  }

  // Метод для отправки сообщения конкретному пользователю
  async sendMessageToUser(chatId: string, message: string): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(chatId, message);
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      throw error;
    }
  }

  // Метод для получения информации о боте
  async getBotInfo(): Promise<any> {
    try {
      return await this.bot.telegram.getMe();
    } catch (error) {
      console.error('Ошибка получения информации о боте:', error);
      throw error;
    }
  }

  // Метод для запуска бота
  async launchBot(): Promise<void> {
    try {
      await this.bot.launch();
      console.log('Telegram бот запущен');
    } catch (error) {
      console.error('Ошибка запуска бота:', error);
      throw error;
    }
  }

  // Метод для остановки бота
  async stopBot(): Promise<void> {
    try {
      await this.bot.stop();
      console.log('Telegram бот остановлен');
    } catch (error) {
      console.error('Ошибка остановки бота:', error);
      throw error;
    }
  }
}
