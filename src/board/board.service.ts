import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Board } from './board.entity';
import { BoardMember, BoardRole } from './board-member.entity';
import { BoardColumn } from './board-column.entity';
import { User } from '../auth/user.entity';
import {
  CreateBoardDto,
  UpdateBoardDto,
  InviteMemberDto,
  RemoveMemberDto,
  UpdateBoardWithColumnsDto,
} from './dto/board.dto';
import {
  CreateColumnDto,
  UpdateColumnDto,
  ReorderColumnsDto,
} from './dto/column.dto';

@Injectable()
export class BoardService {
  constructor(
    @InjectRepository(Board)
    private boardRepository: Repository<Board>,
    @InjectRepository(BoardMember)
    private boardMemberRepository: Repository<BoardMember>,
    @InjectRepository(BoardColumn)
    private boardColumnRepository: Repository<BoardColumn>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  /**
   * Создать новую доску
   */
  async create(createBoardDto: CreateBoardDto, userId: string): Promise<Board> {
    const board = this.boardRepository.create({
      ...createBoardDto,
      owner_id: userId,
    });

    const savedBoard = await this.boardRepository.save(board);

    // Автоматически добавляем владельца как участника с ролью OWNER
    await this.boardMemberRepository.save({
      board_id: savedBoard.id,
      user_id: userId,
      role: BoardRole.OWNER,
    });

    // Создаем колонки по умолчанию
    await this.createDefaultColumns(savedBoard.id);

    return savedBoard;
  }

  /**
   * Создать колонки по умолчанию для новой доски
   */
  private async createDefaultColumns(boardId: string): Promise<void> {
    const defaultColumns = [
      { name: 'Backlog', color: '#6b7280', position: 0 },
      { name: 'To Do', color: '#3b82f6', position: 1 },
      { name: 'In Progress', color: '#f59e0b', position: 2 },
      { name: 'Done', color: '#10b981', position: 3 },
    ];

    for (const columnData of defaultColumns) {
      await this.boardColumnRepository.save({
        ...columnData,
        board_id: boardId,
      });
    }
  }

  /**
   * Получить все доски пользователя (где он участник)
   */
  async findAll(userId: string): Promise<Board[]> {
    return this.boardRepository
      .createQueryBuilder('board')
      .innerJoin('board.members', 'member', 'member.user_id = :userId', {
        userId,
      })
      .leftJoinAndSelect('board.columns', 'column')
      .addOrderBy('board.createdAt', 'DESC')
      .addOrderBy('column.position', 'ASC')
      .getMany();
  }

  /**
   * Получить доску по ID с проверкой доступа
   */
  async findOne(boardId: string, userId: string): Promise<Board> {
    const board = await this.boardRepository.findOne({
      where: { id: boardId },
      relations: ['owner', 'members', 'members.user'],
    });

    if (!board) {
      throw new NotFoundException('Доска не найдена');
    }

    // Проверяем, есть ли у пользователя доступ к доске
    const hasAccess = await this.checkAccess(boardId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('У вас нет доступа к этой доске');
    }

    return board;
  }

  /**
   * Обновить доску
   */
  async update(
    boardId: string,
    updateBoardDto: UpdateBoardDto,
    userId: string,
  ): Promise<Board> {
    const board = await this.findOne(boardId, userId);

    // Только владелец может обновлять доску
    if (board.owner_id !== userId) {
      throw new ForbiddenException('Только владелец может обновлять доску');
    }

    Object.assign(board, updateBoardDto);
    return this.boardRepository.save(board);
  }

  /**
   * Универсальный метод обновления доски с колонками
   * Позволяет: добавить/удалить/переименовать колонки, изменить порядок
   */
  async updateBoardWithColumns(
    boardId: string,
    updateDto: UpdateBoardWithColumnsDto,
    userId: string,
  ): Promise<Board> {
    const board = await this.findOne(boardId, userId);
    // Только владелец может обновлять доску
    if (board.owner_id !== userId) {
      throw new ForbiddenException('Только владелец может обновлять доску');
    }

    // Проверяем ограничение на количество колонок
    if (updateDto.columns.length > 14) {
      throw new BadRequestException(
        'Максимальное количество колонок — 14. Удалите лишние колонки.',
      );
    }

    // Используем транзакцию для атомарности операций
    return await this.dataSource.transaction(async (manager) => {
      // 1. Получаем все существующие колонки доски
      const existingColumns = await manager.find(BoardColumn, {
        where: { board_id: boardId },
        relations: ['tasks'],
      });

      // 2. Создаем Map существующих колонок для быстрого поиска
      const existingColumnsMap = new Map(
        existingColumns.map((col) => [col.id, col]),
      );

      // 3. Собираем ID колонок, которые реально существуют в базе и должны остаться
      const columnIdsToKeep = updateDto.columns
        .filter((col) => col.id && existingColumnsMap.has(col.id))
        .map((col) => col.id);

      // 4. Находим колонки для удаления
      const columnsToDelete = existingColumns.filter(
        (col) => !columnIdsToKeep.includes(col.id),
      );

      // 5. Проверяем, что не удаляются первая и последняя колонки
      if (existingColumns.length > 0 && columnsToDelete.length > 0) {
        const sortedColumns = [...existingColumns].sort(
          (a, b) => a.position - b.position,
        );
        const firstColumn = sortedColumns[0];
        const lastColumn = sortedColumns[sortedColumns.length - 1];

        const deletingFirstOrLast = columnsToDelete.some(
          (col) => col.id === firstColumn.id || col.id === lastColumn.id,
        );

        if (deletingFirstOrLast) {
          throw new ConflictException(
            'Невозможно удалить первую или последнюю колонку',
          );
        }
      }

      // 6. Проверяем, что удаляемые колонки пустые
      for (const column of columnsToDelete) {
        if (column.tasks && column.tasks.length > 0) {
          throw new ConflictException(
            `Невозможно удалить колонку "${column.name}": в ней есть задачи`,
          );
        }
      }

      // 7. Удаляем пустые колонки
      if (columnsToDelete.length > 0) {
        await manager.remove(BoardColumn, columnsToDelete);
      }

      // 8. Обрабатываем колонки из запроса (создание, обновление, установка позиций)
      for (let position = 0; position < updateDto.columns.length; position++) {
        const columnDto = updateDto.columns[position];

        // Проверяем, существует ли колонка в базе данных
        const existsInDb = columnDto.id && existingColumnsMap.has(columnDto.id);

        if (existsInDb) {
          // Обновляем существующую колонку
          await manager.update(
            BoardColumn,
            { id: columnDto.id, board_id: boardId },
            {
              name: columnDto.name,
              description: columnDto.description,
              color: columnDto.color,
              position,
            },
          );
        } else {
          // Создаем новую колонку (игнорируем временный id с фронта)
          const newColumn = manager.create(BoardColumn, {
            name: columnDto.name,
            description: columnDto.description,
            color: columnDto.color,
            position,
            board_id: boardId,
          });
          await manager.save(BoardColumn, newColumn);
        }
      }

      // 9. Возвращаем обновленную доску с колонками
      return await manager.findOne(Board, {
        where: { id: boardId },
        relations: ['columns', 'owner'],
      });
    });
  }

  /**
   * Удалить доску
   */
  async remove(boardId: string, userId: string): Promise<void> {
    const board = await this.findOne(boardId, userId);

    // Только владелец может удалять доску
    if (board.owner_id !== userId) {
      throw new ForbiddenException('Только владелец может удалять доску');
    }

    await this.boardRepository.remove(board);
  }

  /**
   * Пригласить участника на доску
   */
  async inviteMember(
    boardId: string,
    inviteMemberDto: InviteMemberDto,
    userId: string,
  ): Promise<BoardMember> {
    const board = await this.findOne(boardId, userId);

    // Только владелец может приглашать участников
    if (board.owner_id !== userId) {
      throw new ForbiddenException(
        'Только владелец может приглашать участников',
      );
    }

    // Находим пользователя по email
    const invitedUser = await this.userRepository.findOne({
      where: { email: inviteMemberDto.email },
    });

    if (!invitedUser) {
      throw new NotFoundException('Пользователь с таким email не найден');
    }

    // Проверяем, не является ли пользователь уже участником
    const existingMember = await this.boardMemberRepository.findOne({
      where: {
        board_id: boardId,
        user_id: invitedUser.id,
      },
    });

    if (existingMember) {
      throw new ConflictException('Пользователь уже является участником доски');
    }

    // Создаем запись участника
    const member = this.boardMemberRepository.create({
      board_id: boardId,
      user_id: invitedUser.id,
      role: inviteMemberDto.role || BoardRole.MEMBER,
    });

    return this.boardMemberRepository.save(member);
  }

  /**
   * Удалить участника из доски
   */
  async removeMember(
    boardId: string,
    removeMemberDto: RemoveMemberDto,
    userId: string,
  ): Promise<void> {
    const board = await this.findOne(boardId, userId);

    // Только владелец может удалять участников
    if (board.owner_id !== userId) {
      throw new ForbiddenException('Только владелец может удалять участников');
    }

    // Нельзя удалить владельца
    if (removeMemberDto.userId === board.owner_id) {
      throw new BadRequestException('Нельзя удалить владельца доски');
    }

    const member = await this.boardMemberRepository.findOne({
      where: {
        board_id: boardId,
        user_id: removeMemberDto.userId,
      },
    });

    if (!member) {
      throw new NotFoundException('Участник не найден на этой доске');
    }

    await this.boardMemberRepository.remove(member);
  }

  /**
   * Получить всех участников доски
   */
  // async getMembers(boardId: string, userId: string): Promise<BoardMember[]> {
  //   await this.findOne(boardId, userId); // Проверка доступа

  //   return this.boardMemberRepository.find({
  //     where: { board_id: boardId },
  //     relations: ['user'],
  //   });
  // }

  /**
   * Проверить, есть ли у пользователя доступ к доске
   */
  async checkAccess(boardId: string, userId: string): Promise<boolean> {
    // Проверяем, является ли пользователь владельцем доски
    const board = await this.boardRepository.findOne({
      where: { id: boardId },
      select: ['id', 'owner_id'],
    });

    // Если доска не найдена, доступа нет
    if (!board) {
      return false;
    }

    // Если пользователь владелец - доступ есть
    if (board.owner_id === userId) {
      return true;
    }

    // Проверяем, является ли пользователь участником доски
    const member = await this.boardMemberRepository.findOne({
      where: {
        board_id: boardId,
        user_id: userId,
      },
    });

    return !!member;
  }

  /**
   * Получить роль пользователя на доске
   */
  async getUserRole(
    boardId: string,
    userId: string,
  ): Promise<BoardRole | null> {
    const member = await this.boardMemberRepository.findOne({
      where: {
        board_id: boardId,
        user_id: userId,
      },
    });

    return member ? member.role : null;
  }

  // ===== МЕТОДЫ ДЛЯ РАБОТЫ С КОЛОНКАМИ =====

  /**
   * Создать колонку на доске
   */
  async createColumn(
    boardId: string,
    createColumnDto: CreateColumnDto,
    userId: string,
  ): Promise<BoardColumn> {
    const board = await this.findOne(boardId, userId);

    // Только владелец может создавать колонки
    if (board.owner_id !== userId) {
      throw new ForbiddenException('Только владелец может создавать колонки');
    }

    // Проверяем ограничение на количество колонок
    const currentColumnsCount = await this.boardColumnRepository.count({
      where: { board_id: boardId },
    });

    if (currentColumnsCount >= 14) {
      throw new BadRequestException(
        'Достигнуто максимальное количество колонок (14). Удалите существующие колонки перед добавлением новых.',
      );
    }

    // Если position не указана, ставим в конец
    let position = createColumnDto.position;
    if (position === undefined) {
      const maxPosition = await this.boardColumnRepository
        .createQueryBuilder('column')
        .where('column.board_id = :boardId', { boardId })
        .select('MAX(column.position)', 'max')
        .getRawOne();
      position = (maxPosition?.max ?? -1) + 1;
    }

    const column = this.boardColumnRepository.create({
      ...createColumnDto,
      board_id: boardId,
      position,
    });

    return this.boardColumnRepository.save(column);
  }

  /**
   * Получить все колонки доски
   */
  async getColumns(boardId: string, userId: string): Promise<BoardColumn[]> {
    // Проверяем доступ и получаем колонки в одном запросе
    const columns = await this.boardColumnRepository
      .createQueryBuilder('column')
      .innerJoin(
        'board_members',
        'member',
        'member.board_id = column.board_id AND member.user_id = :userId',
        { userId },
      )
      .where('column.board_id = :boardId', { boardId })
      .orderBy('column.position', 'ASC')
      .getMany();

    if (columns.length === 0) {
      // Проверяем, доска не существует или нет доступа
      const boardExists = await this.boardRepository.findOne({
        where: { id: boardId },
      });

      if (!boardExists) {
        throw new NotFoundException('Доска не найдена');
      }

      throw new ForbiddenException('У вас нет доступа к этой доске');
    }

    return columns;
  }

  /**
   * Получить колонку по ID
   */
  async getColumn(
    boardId: string,
    columnId: string,
    userId: string,
  ): Promise<BoardColumn> {
    // Проверяем доступ и получаем колонку в одном запросе
    const column = await this.boardColumnRepository
      .createQueryBuilder('column')
      .innerJoin(
        'board_members',
        'member',
        'member.board_id = column.board_id AND member.user_id = :userId',
        { userId },
      )
      .where('column.id = :columnId', { columnId })
      .andWhere('column.board_id = :boardId', { boardId })
      .getOne();

    if (!column) {
      // Проверяем, колонка не существует или нет доступа
      const columnExists = await this.boardColumnRepository.findOne({
        where: { id: columnId, board_id: boardId },
      });

      if (!columnExists) {
        throw new NotFoundException('Колонка не найдена');
      }

      throw new ForbiddenException('У вас нет доступа к этой доске');
    }

    return column;
  }

  /**
   * Обновить колонку
   */
  async updateColumn(
    boardId: string,
    columnId: string,
    updateColumnDto: UpdateColumnDto,
    userId: string,
  ): Promise<BoardColumn> {
    const board = await this.findOne(boardId, userId);

    // Только владелец может обновлять колонки
    if (board.owner_id !== userId) {
      throw new ForbiddenException('Только владелец может обновлять колонки');
    }

    const column = await this.getColumn(boardId, columnId, userId);

    Object.assign(column, updateColumnDto);
    return this.boardColumnRepository.save(column);
  }

  /**
   * Удалить колонку
   */
  async deleteColumn(
    boardId: string,
    columnId: string,
    userId: string,
  ): Promise<void> {
    const board = await this.findOne(boardId, userId);

    // Только владелец может удалять колонки
    if (board.owner_id !== userId) {
      throw new ForbiddenException('Только владелец может удалять колонки');
    }

    const column = await this.getColumn(boardId, columnId, userId);
    await this.boardColumnRepository.remove(column);
  }

  /**
   * Изменить порядок колонок
   */
  async reorderColumns(
    boardId: string,
    reorderDto: ReorderColumnsDto,
    userId: string,
  ): Promise<BoardColumn[]> {
    const board = await this.findOne(boardId, userId);

    // Только владелец может менять порядок колонок
    if (board.owner_id !== userId) {
      throw new ForbiddenException(
        'Только владелец может менять порядок колонок',
      );
    }

    // Обновляем позиции всех колонок
    for (let i = 0; i < reorderDto.columnIds.length; i++) {
      await this.boardColumnRepository.update(
        { id: reorderDto.columnIds[i], board_id: boardId },
        { position: i },
      );
    }

    // Возвращаем обновленный список
    return this.getColumns(boardId, userId);
  }
}
