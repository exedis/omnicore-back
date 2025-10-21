import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeyService } from '../api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('API ключ не предоставлен');
    }

    const validation = await this.apiKeyService.validateApiKey(apiKey);

    if (!validation) {
      throw new UnauthorizedException('Неверный или неактивный API ключ');
    }

    // Добавляем информацию о пользователе в request
    request.user = {
      id: validation.user_id,
      apiKey: validation.apiKey,
    };

    return true;
  }
}
