import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { InvitationService } from './invitation.service';
import { CreateInvitationDto } from './dto/invitation.dto';
import { UserId } from '../common/decorators/user-id.decorator';

@Controller('invitations')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  /**
   * Создать приглашение
   */
  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createInvitationDto: CreateInvitationDto,
    @UserId() userId: string,
  ) {
    return this.invitationService.create(createInvitationDto, userId);
  }

  /**
   * Получить все приглашения пользователя
   */
  @Get()
  @UseGuards(AuthGuard)
  async findAll(@UserId() userId: string) {
    return this.invitationService.findAll(userId);
  }

  /**
   * Получить приглашения для конкретного API ключа
   */
  @Get('by-api-key/:apiKeyId')
  @UseGuards(AuthGuard)
  async findByApiKey(
    @Param('apiKeyId') apiKeyId: string,
    @UserId() userId: string,
  ) {
    return this.invitationService.findByApiKey(apiKeyId, userId);
  }

  /**
   * Получить информацию о приглашении по токену (публичный метод)
   */
  @Get('info/:token')
  async getInvitationInfo(@Param('token') token: string) {
    return this.invitationService.getInvitationInfo(token);
  }

  /**
   * Принять приглашение
   */
  @Post('accept/:token')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async accept(@Param('token') token: string, @UserId() userId: string) {
    return this.invitationService.accept(token, userId);
  }

  /**
   * Получить одно приглашение
   */
  @Get(':id')
  @UseGuards(AuthGuard)
  async findOne(@Param('id') id: string, @UserId() userId: string) {
    return this.invitationService.findOne(id, userId);
  }

  /**
   * Отозвать приглашение
   */
  @Patch(':id/revoke')
  @UseGuards(AuthGuard)
  async revoke(@Param('id') id: string, @UserId() userId: string) {
    return this.invitationService.revoke(id, userId);
  }

  /**
   * Удалить приглашение
   */
  @Delete(':id')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @UserId() userId: string) {
    await this.invitationService.delete(id, userId);
  }
}
