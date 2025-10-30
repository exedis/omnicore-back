import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { CreateWebhookDto } from './dto/webhook.dto';

interface DuplicateCheckResult {
  isDuplicate: boolean;
  hash: string;
}

@Injectable()
export class WebhookDeduplicationService {
  private readonly logger = new Logger(WebhookDeduplicationService.name);
  private readonly recentWebhooks = new Map<string, number>();
  private readonly DEDUPLICATION_WINDOW_MS = 60000; // 1 минута
  private readonly CLEANUP_INTERVAL_MS = 120000; // 2 минуты

  constructor() {
    // Периодическая очистка старых записей
    setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Проверяет, является ли webhook дубликатом
   * @param webhookDto - данные webhook
   * @param userId - ID пользователя
   * @returns объект с результатом проверки и хэшем
   */
  checkDuplicate(
    webhookDto: CreateWebhookDto,
    userId: string,
  ): DuplicateCheckResult {
    const hash = this.generateHash(webhookDto, userId);
    const now = Date.now();
    const lastSeen = this.recentWebhooks.get(hash);

    if (lastSeen) {
      const timeDiff = now - lastSeen;
      if (timeDiff < this.DEDUPLICATION_WINDOW_MS) {
        this.logger.warn(
          `Duplicate webhook detected for user ${userId}. Hash: ${hash.substring(
            0,
            10,
          )}..., time diff: ${timeDiff}ms`,
        );
        return { isDuplicate: true, hash };
      }
    }

    // Сохраняем или обновляем время последнего получения
    this.recentWebhooks.set(hash, now);
    return { isDuplicate: false, hash };
  }

  /**
   * Генерирует хэш на основе данных webhook
   * @param webhookDto - данные webhook
   * @param userId - ID пользователя
   * @returns хэш строка
   */
  private generateHash(webhookDto: CreateWebhookDto, userId: string): string {
    // Создаем уникальный идентификатор на основе важных полей
    const hashData = {
      userId,
      siteName: webhookDto.siteName,
      formName: webhookDto.formName,
      data: webhookDto.data,
      // Не включаем metadata, так как там есть timestamp и другие изменяющиеся данные
    };

    const dataString = JSON.stringify(hashData, Object.keys(hashData).sort());
    return createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Очищает старые записи из кеша
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [hash, timestamp] of this.recentWebhooks.entries()) {
      if (now - timestamp > this.DEDUPLICATION_WINDOW_MS) {
        this.recentWebhooks.delete(hash);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(
        `Cleaned up ${cleanedCount} old webhook hashes. Current cache size: ${this.recentWebhooks.size}`,
      );
    }
  }

  /**
   * Получает статистику дедупликации
   */
  getStats() {
    return {
      cacheSize: this.recentWebhooks.size,
      deduplicationWindowMs: this.DEDUPLICATION_WINDOW_MS,
      cleanupIntervalMs: this.CLEANUP_INTERVAL_MS,
    };
  }

  /**
   * Очищает весь кеш (для тестирования или административных целей)
   */
  clearCache(): void {
    const previousSize = this.recentWebhooks.size;
    this.recentWebhooks.clear();
    this.logger.log(`Cache cleared. Removed ${previousSize} entries.`);
  }
}
