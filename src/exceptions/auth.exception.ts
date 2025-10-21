import { UnauthorizedException } from "@nestjs/common";

export class AuthTokenException extends UnauthorizedException {
  constructor() {
    super("Недействительный токен авторизации");
  }
}
