import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { BoardService } from './board.service';
import { InviteMemberDto, RemoveMemberDto } from './dto/board.dto';
import {
  CreateColumnDto,
  UpdateColumnDto,
  ReorderColumnsDto,
} from './dto/column.dto';
import { UserId } from 'src/common/decorators/user-id.decorator';

@Controller('boards')
@UseGuards(AuthGuard)
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  // Доски создаются автоматически при создании API ключа
  // Прямое создание досок отключено

  @Get()
  async findAll(@UserId() userId: string) {
    return this.boardService.findAll(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @UserId() userId: string) {
    return this.boardService.findOne(id, userId);
  }

  // Обновление и удаление досок происходит через API ключи

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  async inviteMember(
    @Param('id') id: string,
    @Body() inviteMemberDto: InviteMemberDto,
    @UserId() userId: string,
  ) {
    return this.boardService.inviteMember(id, inviteMemberDto, userId);
  }

  @Delete(':id/members')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('id') id: string,
    @Body() removeMemberDto: RemoveMemberDto,
    @UserId() userId: string,
  ) {
    await this.boardService.removeMember(id, removeMemberDto, userId);
  }

  @Get(':id/members')
  async getMembers(@Param('id') id: string, @UserId() userId: string) {
    return this.boardService.getMembers(id, userId);
  }

  // ===== ENDPOINTS ДЛЯ КОЛОНОК =====

  @Post(':id/columns')
  @HttpCode(HttpStatus.CREATED)
  async createColumn(
    @Param('id') boardId: string,
    @Body() createColumnDto: CreateColumnDto,
    @UserId() userId: string,
  ) {
    return this.boardService.createColumn(boardId, createColumnDto, userId);
  }

  @Get(':id/columns')
  async getColumns(@Param('id') boardId: string, @UserId() userId: string) {
    return this.boardService.getColumns(boardId, userId);
  }

  @Get(':id/columns/:columnId')
  async getColumn(
    @Param('id') boardId: string,
    @Param('columnId') columnId: string,
    @UserId() userId: string,
  ) {
    return this.boardService.getColumn(boardId, columnId, userId);
  }

  @Put(':id/columns/:columnId')
  async updateColumn(
    @Param('id') boardId: string,
    @Param('columnId') columnId: string,
    @Body() updateColumnDto: UpdateColumnDto,
    @UserId() userId: string,
  ) {
    return this.boardService.updateColumn(
      boardId,
      columnId,
      updateColumnDto,
      userId,
    );
  }

  @Delete(':id/columns/:columnId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteColumn(
    @Param('id') boardId: string,
    @Param('columnId') columnId: string,
    @UserId() userId: string,
  ) {
    await this.boardService.deleteColumn(boardId, columnId, userId);
  }

  @Put(':id/columns/reorder')
  async reorderColumns(
    @Param('id') boardId: string,
    @Body() reorderDto: ReorderColumnsDto,
    @UserId() userId: string,
  ) {
    return this.boardService.reorderColumns(boardId, reorderDto, userId);
  }
}
