import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { CreateApiKeyDto, UpdateApiKeyDto } from './dto/api-key.dto';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from '../common/decorators/user-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api-keys')
@UseGuards(AuthGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  async create(
    @Body() createApiKeyDto: CreateApiKeyDto,
    @UserId() userId: string,
  ) {
    return this.apiKeyService.create(createApiKeyDto, userId);
  }

  @Get()
  async findAll(@UserId() userId: string) {
    return this.apiKeyService.findAll(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @UserId() userId: string) {
    return this.apiKeyService.findOne(id, userId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateApiKeyDto: UpdateApiKeyDto,
    @UserId() userId: string,
  ) {
    return this.apiKeyService.update(id, updateApiKeyDto, userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @UserId() userId: string) {
    await this.apiKeyService.delete(id, userId);
    return { message: 'API ключ успешно удален' };
  }
}
