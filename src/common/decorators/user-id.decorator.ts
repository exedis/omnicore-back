import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();

    // Проверяем, есть ли уже извлеченный пользователь из Guard
    if (request.user && request.user.id) {
      return request.user.id;
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
      return decoded.sub;
    } catch (error) {
      throw new UnauthorizedException('Недействительный токен');
    }
  },
);
