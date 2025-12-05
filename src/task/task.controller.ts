import {
  Controller,
  Get,
  Post,
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
import { UserId } from 'src/common/decorators/user-id.decorator';
import { transformTask, transformTasks } from './task.transformer';

@Controller('tasks')
@UseGuards(AuthGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createTaskDto: CreateTaskDto, @UserId() userId: string) {
    const task = await this.taskService.create(createTaskDto, userId);
    return transformTask(task);
  }

  @Get()
  async findAll(@Query() query: TaskQueryDto, @UserId() userId: string) {
    const result = await this.taskService.findAll(query, userId);
    return {
      ...result,
      tasks: transformTasks(result.tasks),
    };
  }

  @Get('by-board/:id')
  async findByBoard(@Param('id') id: string, @UserId() userId: string) {
    return this.taskService.findByBoard(id, userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @UserId() userId: string) {
    const task = await this.taskService.findOne(id, userId);
    return transformTask(task);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @UserId() userId: string,
  ) {
    const task = await this.taskService.update(id, updateTaskDto, userId);
    return transformTask(task);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @UserId() userId: string) {
    await this.taskService.remove(id, userId);
  }
}
