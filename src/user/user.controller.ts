import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserId } from '../common/decorators/user-id.decorator';
import { UserService } from './user.service';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
// import { Throttle } from '@nestjs/throttler';

@Controller('user')
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  // @Throttle({ default: { limit: 5, ttl: 60 } })
  @Get('/disable-telegram')
  async disableTelegram(@UserId() userId: string) {
    console.log('disableTelegram', userId);
    return this.userService.disableTelegram(userId);
  }

  // @Throttle({ default: { limit: 5, ttl: 60 } })
  @Get('/enable-telegram')
  async enableTelegram(@UserId() userId: string) {
    console.log('enableTelegram', userId);
    return this.userService.enableTelegram(userId);
  }

  // @Throttle({ default: { limit: 5, ttl: 60 } })
  @Get('/notification-status')
  async notificationStatus(@UserId() userId: string) {
    return this.userService.notificationStatus(userId);
  }
}
