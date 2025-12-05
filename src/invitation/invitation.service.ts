import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invitation, InvitationStatus } from './invitation.entity';
import { CreateInvitationDto } from './dto/invitation.dto';
import { BoardService } from '../board/board.service';
import { ApiKey } from '../api-key/api-key.entity';
import { BoardMember, BoardRole } from '../board/board-member.entity';
import { randomBytes } from 'crypto';

@Injectable()
export class InvitationService {
  constructor(
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>,
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(BoardMember)
    private boardMemberRepository: Repository<BoardMember>,
    private boardService: BoardService,
  ) {}

  /**
   * Создать приглашение
   */
  async create(
    createInvitationDto: CreateInvitationDto,
    userId: string,
  ): Promise<{ invitation: Invitation; invitationUrl: string }> {
    // Получаем API ключ и проверяем права доступа
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: createInvitationDto.apiKeyId },
      relations: ['board'],
    });

    if (!apiKey) {
      throw new NotFoundException('API ключ не найден');
    }

    if (!apiKey.board_id) {
      throw new BadRequestException('API ключ не связан с доской');
    }

    // Проверяем что пользователь - владелец доски
    const board = await this.boardService.findOne(apiKey.board_id, userId);
    if (board.owner_id !== userId) {
      throw new ForbiddenException(
        'Только владелец доски может создавать приглашения',
      );
    }

    // Генерируем уникальный токен
    const token = this.generateToken();

    // Вычисляем дату истечения
    const expiresInDays = createInvitationDto.expiresInDays || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Создаем приглашение
    const invitation = this.invitationRepository.create({
      board_id: apiKey.board_id,
      api_key_id: apiKey.id,
      inviter_id: userId,
      token,
      expiresAt,
      status: InvitationStatus.PENDING,
    });

    const savedInvitation = await this.invitationRepository.save(invitation);

    // Формируем URL приглашения
    const invitationUrl = `${
      process.env.FRONTEND_URL || 'http://localhost:3000'
    }/invitations/accept/${token}`;

    return {
      invitation: savedInvitation,
      invitationUrl,
    };
  }

  /**
   * Принять приглашение
   */
  async accept(token: string, userId: string): Promise<Invitation> {
    // Находим приглашение по токену
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['board', 'apiKey'],
    });

    if (!invitation) {
      throw new NotFoundException('Приглашение не найдено');
    }

    // Проверяем статус
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        `Приглашение уже ${
          invitation.status === InvitationStatus.ACCEPTED
            ? 'принято'
            : 'отозвано'
        }`,
      );
    }

    // Проверяем срок действия
    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
      throw new BadRequestException('Срок действия приглашения истек');
    }

    // Проверяем что пользователь не пытается принять свое же приглашение
    if (invitation.inviter_id === userId) {
      throw new BadRequestException(
        'Вы не можете принять собственное приглашение',
      );
    }

    // Проверяем что пользователь еще не является участником доски
    const existingMember = await this.boardMemberRepository.findOne({
      where: {
        board_id: invitation.board_id,
        user_id: userId,
      },
    });

    if (existingMember) {
      throw new BadRequestException('Вы уже являетесь участником этой доски');
    }

    // Добавляем пользователя в участники доски
    const boardMember = this.boardMemberRepository.create({
      board_id: invitation.board_id,
      user_id: userId,
      role: BoardRole.MEMBER,
    });

    await this.boardMemberRepository.save(boardMember);

    // Обновляем статус приглашения
    invitation.status = InvitationStatus.ACCEPTED;
    invitation.invitee_id = userId;
    invitation.acceptedAt = new Date();

    return this.invitationRepository.save(invitation);
  }

  /**
   * Получить все приглашения пользователя (созданные им)
   */
  async findAll(userId: string): Promise<Invitation[]> {
    return this.invitationRepository.find({
      where: { inviter_id: userId },
      relations: ['board', 'apiKey', 'invitee'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Получить приглашения для конкретного API ключа
   */
  async findByApiKey(apiKeyId: string, userId: string): Promise<Invitation[]> {
    // Проверяем доступ к API ключу
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: apiKeyId },
    });

    if (!apiKey) {
      throw new NotFoundException('API ключ не найден');
    }

    if (apiKey.user_id !== userId) {
      throw new ForbiddenException('Нет доступа к этому API ключу');
    }

    return this.invitationRepository.find({
      where: { api_key_id: apiKeyId },
      relations: ['board', 'invitee'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Получить одно приглашение
   */
  async findOne(id: string, userId: string): Promise<Invitation> {
    const invitation = await this.invitationRepository.findOne({
      where: { id },
      relations: ['board', 'apiKey', 'invitee'],
    });

    if (!invitation) {
      throw new NotFoundException('Приглашение не найдено');
    }

    // Проверяем что пользователь - создатель приглашения
    if (invitation.inviter_id !== userId) {
      throw new ForbiddenException('Нет доступа к этому приглашению');
    }

    return invitation;
  }

  /**
   * Отозвать приглашение
   */
  async revoke(id: string, userId: string): Promise<Invitation> {
    const invitation = await this.findOne(id, userId);

    if (invitation.status === InvitationStatus.REVOKED) {
      throw new BadRequestException('Приглашение уже отозвано');
    }

    // Если приглашение было принято - удаляем пользователя из участников
    if (
      invitation.status === InvitationStatus.ACCEPTED &&
      invitation.invitee_id
    ) {
      const boardMember = await this.boardMemberRepository.findOne({
        where: {
          board_id: invitation.board_id,
          user_id: invitation.invitee_id,
        },
      });

      if (boardMember) {
        await this.boardMemberRepository.remove(boardMember);
      }
    }

    // Обновляем статус
    invitation.status = InvitationStatus.REVOKED;
    return this.invitationRepository.save(invitation);
  }

  /**
   * Удалить приглашение
   */
  async delete(id: string, userId: string): Promise<void> {
    const invitation = await this.findOne(id, userId);
    await this.invitationRepository.remove(invitation);
  }

  /**
   * Получить информацию о приглашении по токену (публичный метод)
   */
  async getInvitationInfo(token: string): Promise<{
    valid: boolean;
    invitation?: Partial<Invitation>;
    error?: string;
  }> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['board', 'apiKey', 'inviter'],
    });

    if (!invitation) {
      return { valid: false, error: 'Приглашение не найдено' };
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      return {
        valid: false,
        error: `Приглашение ${
          invitation.status === InvitationStatus.ACCEPTED
            ? 'уже принято'
            : 'было отозвано'
        }`,
      };
    }

    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      return { valid: false, error: 'Срок действия приглашения истек' };
    }

    return {
      valid: true,
      invitation: {
        id: invitation.id,
        board_id: invitation.board_id,
        board: {
          id: invitation.board.id,
          name: invitation.board.name,
          description: invitation.board.description,
        },
        apiKey: {
          id: invitation.apiKey.id,
          name: invitation.apiKey.name,
        },
        inviter: {
          id: invitation.inviter.id,
          email: invitation.inviter.email,
        },
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      } as any,
    };
  }

  /**
   * Генерация уникального токена
   */
  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }
}
