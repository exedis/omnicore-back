import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserId } from '../common/decorators/user-id.decorator';
import { FieldGroupService } from './field-group.service';
import { AssociatedField } from '@type/fieldGroup';

@Controller('field-group')
@UseGuards(AuthGuard)
export class FieldGroupController {
  constructor(private readonly fieldGroupService: FieldGroupService) {}

  /**
   * Создает новую группу
   */
  @Post('create')
  async createTemplate(
    @UserId() userId: string,
    @Body()
    body: {
      field: AssociatedField;
    },
  ) {
    return this.fieldGroupService.createFieldGroup(userId, body.field);
  }

  /**
   * Создает новую группу
   */
  @Get('all')
  async getAllTemplates(@UserId() userId: string) {
    return this.fieldGroupService.getAllTemplates(userId);
  }
}
