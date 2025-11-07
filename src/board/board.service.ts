import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Board } from './board.entity';
import { BoardMember, BoardRole } from './board-member.entity';
import { BoardColumn } from './board-column.entity';
import { User } from '../auth/user.entity';
import {
  CreateBoardDto,
  UpdateBoardDto,
  InviteMemberDto,
  RemoveMemberDto,
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
    const memberRecords = await this.boardMemberRepository.find({
      where: { user_id: userId },
      relations: ['board', 'board.owner'],
    });

    return memberRecords.map((member) => member.board);
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
  async getMembers(boardId: string, userId: string): Promise<BoardMember[]> {
    await this.findOne(boardId, userId); // Проверка доступа

    return this.boardMemberRepository.find({
      where: { board_id: boardId },
      relations: ['user'],
    });
  }

  /**
   * Проверить, есть ли у пользователя доступ к доске
   */
  async checkAccess(boardId: string, userId: string): Promise<boolean> {
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
    await this.findOne(boardId, userId); // Проверка доступа

    return this.boardColumnRepository.find({
      where: { board_id: boardId },
      order: { position: 'ASC' },
      relations: ['tasks'],
    });
  }

  /**
   * Получить колонку по ID
   */
  async getColumn(
    boardId: string,
    columnId: string,
    userId: string,
  ): Promise<BoardColumn> {
    await this.findOne(boardId, userId); // Проверка доступа

    const column = await this.boardColumnRepository.findOne({
      where: { id: columnId, board_id: boardId },
      relations: ['tasks'],
    });

    if (!column) {
      throw new NotFoundException('Колонка не найдена');
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
