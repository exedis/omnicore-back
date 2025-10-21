import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from './api-key.entity';
import { CreateApiKeyDto, UpdateApiKeyDto } from './dto/api-key.dto';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyService {
  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
  ) {}

  async create(
    createApiKeyDto: CreateApiKeyDto,
    userId: string,
  ): Promise<ApiKey> {
    // Генерируем уникальный API ключ
    const key = `ak_${crypto.randomBytes(32).toString('hex')}`;

    const apiKey = this.apiKeyRepository.create({
      ...createApiKeyDto,
      key,
      user_id: userId,
    });

    return this.apiKeyRepository.save(apiKey);
  }

  async findAll(userId: string): Promise<ApiKey[]> {
    return this.apiKeyRepository.find({
      where: { user_id: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<ApiKey> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id, user_id: userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API ключ не найден');
    }

    return apiKey;
  }

  async findByKey(key: string): Promise<ApiKey | null> {
    return this.apiKeyRepository.findOne({
      where: { key, isActive: true },
      relations: ['user'],
    });
  }

  async update(
    id: string,
    updateApiKeyDto: UpdateApiKeyDto,
    userId: string,
  ): Promise<ApiKey> {
    const apiKey = await this.findOne(id, userId);

    Object.assign(apiKey, updateApiKeyDto);

    return this.apiKeyRepository.save(apiKey);
  }

  async delete(id: string, userId: string): Promise<void> {
    const result = await this.apiKeyRepository.delete({
      id,
      user_id: userId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('API ключ не найден');
    }
  }

  async incrementUsage(key: string): Promise<void> {
    await this.apiKeyRepository.update(
      { key },
      {
        usageCount: () => 'usage_count + 1',
        lastUsedAt: new Date(),
      },
    );
  }

  async validateApiKey(
    key: string,
  ): Promise<{ user_id: string; apiKey: ApiKey } | null> {
    const apiKey = await this.findByKey(key);

    if (!apiKey) {
      return null;
    }

    // Обновляем статистику использования
    await this.incrementUsage(key);

    return {
      user_id: apiKey.user_id,
      apiKey,
    };
  }
}
