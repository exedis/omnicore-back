import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './task.entity';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from './dto/task.dto';
import { BoardService } from '../board/board.service';
import { BoardColumn } from '../board/board-column.entity';
import { Webhook } from '../webhook/webhook.entity';
import { MessageTemplateService } from '../message-template/message-template.service';
import { TemplateType } from '../types/settings';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(BoardColumn)
    private boardColumnRepository: Repository<BoardColumn>,
    private boardService: BoardService,
    private messageTemplateService: MessageTemplateService,
  ) {}

  /**
   * Создать задачу
   */
  async create(createTaskDto: CreateTaskDto, userId: string): Promise<Task> {
    // Проверяем доступ к доске
    await this.boardService.findOne(createTaskDto.boardId, userId);

    const task = this.taskRepository.create({
      ...createTaskDto,
      board_id: createTaskDto.boardId,
      api_key_id: createTaskDto.apiKeyId,
    });
    return this.taskRepository.save(task);
  }

  /**
   * Создать задачу из вебхука
   */
  async createFromWebhook(webhook: Webhook, boardId: string): Promise<Task> {
    // Получаем шаблон для задач
    const template = await this.messageTemplateService.getTemplateByType(
      webhook.user_id,
      TemplateType.TASK,
    );

    // Формируем заголовок и описание из данных вебхука
    const title = template
      ? this.formatTaskField(template.messageTemplate, webhook, 'title')
      : this.generateTaskTitle(webhook);

    const description = template
      ? this.formatTaskField(template.messageTemplate, webhook, 'description')
      : this.generateTaskDescription(webhook);

    // Находим первую колонку доски (Backlog или другую)
    const firstColumn = await this.boardColumnRepository.findOne({
      where: { board_id: boardId },
      order: { position: 'ASC' },
    });

    const task = this.taskRepository.create({
      title,
      description,
      board_id: boardId,
      column_id: firstColumn?.id,
      webhook_id: webhook.id,
      metadata: {
        siteName: webhook.siteName,
        formName: webhook.formName,
        webhookData: webhook.data,
      },
    });

    return this.taskRepository.save(task);
  }

  /**
   * Получить все задачи с фильтрацией
   */
  async findAll(query: TaskQueryDto, userId: string) {
    const {
      boardId,
      apiKeyId,
      status,
      priority,
      page = '1',
      limit = '20',
    } = query;

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.board', 'board')
      .leftJoinAndSelect('task.apiKey', 'apiKey')
      .leftJoinAndSelect('task.webhook', 'webhook')
      .leftJoin('board.members', 'member')
      .where('member.user_id = :userId', { userId });

    if (boardId) {
      queryBuilder.andWhere('task.board_id = :board_id', { boardId });
    }

    if (apiKeyId) {
      queryBuilder.andWhere('task.api_key_id = :api_key_id', { apiKeyId });
    }

    if (status) {
      queryBuilder.andWhere('task.status = :status', { status });
    }

    if (priority) {
      queryBuilder.andWhere('task.priority = :priority', { priority });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    queryBuilder.orderBy('task.createdAt', 'DESC').skip(offset).take(limitNum);

    const [tasks, total] = await queryBuilder.getManyAndCount();

    return {
      tasks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Получить задачу по ID
   */
  async findOne(taskId: string, userId: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['board', 'apiKey', 'webhook'],
    });

    if (!task) {
      throw new NotFoundException('Задача не найдена');
    }

    // Проверяем доступ к доске задачи
    const hasAccess = await this.boardService.checkAccess(
      task.board_id,
      userId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('У вас нет доступа к этой задаче');
    }

    return task;
  }

  /**
   * Обновить задачу
   */
  async update(
    taskId: string,
    updateTaskDto: UpdateTaskDto,
    userId: string,
  ): Promise<Task> {
    const task = await this.findOne(taskId, userId);

    return this.taskRepository.save({
      ...task,
      ...updateTaskDto,
      column_id: updateTaskDto.columnId,
      priority: updateTaskDto.priority,
      status: updateTaskDto.status,
      title: updateTaskDto.title,
      description: updateTaskDto.description,
      metadata: updateTaskDto.metadata,
    });
  }

  /**
   * Удалить задачу
   */
  async remove(taskId: string, userId: string): Promise<void> {
    const task = await this.findOne(taskId, userId);
    await this.taskRepository.remove(task);
  }

  /**
   * Получить задачи по доске
   */
  async findByBoard(boardId: string, userId: string): Promise<Task[]> {
    // Проверяем доступ к доске
    await this.boardService.findOne(boardId, userId);

    return this.taskRepository.find({
      where: { board_id: boardId },
      relations: ['apiKey', 'webhook'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Получить задачи по API ключу
   */
  async findByApiKey(apiKeyId: string, userId: string): Promise<Task[]> {
    const tasks = await this.taskRepository.find({
      where: { api_key_id: apiKeyId },
      relations: ['board', 'apiKey', 'webhook'],
    });

    // Фильтруем задачи, к которым у пользователя есть доступ
    const accessibleTasks = [];
    for (const task of tasks) {
      const hasAccess = await this.boardService.checkAccess(
        task.board_id,
        userId,
      );
      if (hasAccess) {
        accessibleTasks.push(task);
      }
    }

    return accessibleTasks;
  }

  /**
   * Форматирует поле задачи через шаблон
   */
  private formatTaskField(
    template: string,
    webhook: Webhook,
    field: 'title' | 'description',
  ): string {
    // Проверяем есть ли в шаблоне секции [TITLE] и [DESCRIPTION]
    const titleMatch = template.match(
      /\[TITLE\]([\s\S]*?)(?=\[DESCRIPTION\]|$)/,
    );
    const descMatch = template.match(/\[DESCRIPTION\]([\s\S]*?)$/);

    let templateText = '';

    if (titleMatch && descMatch) {
      // Шаблон с секциями
      templateText =
        field === 'title' ? titleMatch[1].trim() : descMatch[1].trim();
    } else {
      // Простой шаблон без секций
      if (field === 'title') {
        // Для title генерируем автоматически
        return this.generateTaskTitle(webhook);
      }
      // Для description используем весь шаблон
      templateText = template;
    }

    // Заменяем переменные в шаблоне
    return this.replaceTemplateVariables(templateText, webhook);
  }

  /**
   * Заменяет переменные {{key}} в шаблоне значениями из вебхука
   */
  private replaceTemplateVariables(template: string, webhook: Webhook): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const cleanKey = key.trim();
      const keys = cleanKey.split('.');

      let value: any = webhook;
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return match; // Возвращаем оригинальный placeholder если ключ не найден
        }
      }

      // Если значение null, undefined или объект - возвращаем пустую строку
      if (
        value === null ||
        value === undefined ||
        (typeof value === 'object' && !Array.isArray(value))
      ) {
        return '';
      }

      return String(value);
    });
  }

  /**
   * Генерация заголовка задачи из вебхука
   */
  private generateTaskTitle(webhook: Webhook): string {
    const data = webhook.data;

    // Пытаемся найти имя или email в данных
    const name = data.name || data.firstName || data.fullName || data.username;
    const email = data.email;
    const phone = data.phone || data.phoneNumber;

    if (name) {
      return `Заявка от ${name}`;
    } else if (email) {
      return `Заявка от ${email}`;
    } else if (phone) {
      return `Заявка от ${phone}`;
    }

    return `Заявка с ${webhook.siteName}`;
  }

  /**
   * Генерация описания задачи из вебхука
   */
  private generateTaskDescription(webhook: Webhook): string {
    const lines: string[] = [];

    lines.push(`**Сайт:** ${webhook.siteName}`);
    lines.push(`**Форма:** ${webhook.formName}`);
    lines.push(
      `**Дата:** ${new Date(webhook.createdAt).toLocaleString('ru-RU')}`,
    );
    lines.push('');
    lines.push('**Данные заявки:**');

    Object.entries(webhook.data).forEach(([key, value]) => {
      lines.push(`- **${key}:** ${value}`);
    });

    return lines.join('\n');
  }
}
