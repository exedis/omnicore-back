import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUser => {
    const request = ctx.switchToHttp().getRequest();

    // Проверяем, есть ли уже извлеченный пользователь из Guard
    if (request.user) {
      return {
        id: request.user.id,
        email: request.user.email,
        name: request.user.name,
      };
    }

    // Если пользователь не извлечен Guard'ом, извлекаем из токена вручную
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Токен авторизации не предоставлен');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Неверный формат токена');
    }

    try {
      const jwtService = new JwtService({
        secret: process.env.JWT_SECRET,
      });

      const decoded = jwtService.verify(token);
      return {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name || 'Unknown',
      };
    } catch (error) {
      throw new UnauthorizedException('Недействительный токен');
    }
  },
);
