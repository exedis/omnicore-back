import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UserDecoratorResponse {
  uuid: string;
  iat: number;
  exp: number;
}

export const User = createParamDecorator(
  (_, ctx: ExecutionContext): UserDecoratorResponse => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // информация о пользователе из токена
  },
);
