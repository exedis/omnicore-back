import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { TaskService } from './task.service';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from './dto/task.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserId } from 'src/common/decorators/user-id.decorator';

@Controller('tasks')
@UseGuards(AuthGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createTaskDto: CreateTaskDto, @UserId() userId: string) {
    return this.taskService.create(createTaskDto, userId);
  }

  @Get()
  async findAll(@Query() query: TaskQueryDto, @UserId() userId: string) {
    return this.taskService.findAll(query, userId);
  }

  @Get('by-board/:id')
  async findByBoard(@Param('id') id: string, @UserId() userId: string) {
    //
    console.log('id findByBoard=>', id);
    return this.taskService.findByBoard(id, userId);
  }

  @Get('by-api-key/:apiKeyId')
  async findByApiKey(
    @Param('apiKeyId') apiKeyId: string,
    @UserId() userId: string,
  ) {
    return this.taskService.findByApiKey(apiKeyId, userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @UserId() userId: string) {
    return this.taskService.findOne(id, userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @UserId() userId: string,
  ) {
    return this.taskService.update(id, updateTaskDto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @UserId() userId: string) {
    await this.taskService.remove(id, userId);
  }
}
