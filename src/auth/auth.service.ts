import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcryptjs';
import { TelegramSettings } from '../message-settings/telegram/telegram-settings.entity';
import { EmailSettings } from '../message-settings/email/email-settings.entity';
import { MessageTemplate } from '../message-template/message-template.entity';
import { TemplateType } from '../types/settings';

const defaultTemplate = `Заявка,\nИмя: {{name}};\nТелефон: {{phone}};\nEmail: {{email}};\nСообщение: {{message}}`;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(TelegramSettings)
    private telegramSettingsRepository: Repository<TelegramSettings>,
    @InjectRepository(EmailSettings)
    private emailSettingsRepository: Repository<EmailSettings>,
    @InjectRepository(MessageTemplate)
    private messageTemplateRepository: Repository<MessageTemplate>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const user = await this.create(registerDto);
    const payload = { email: user.email, sub: user.id };
    const token = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
      message: 'Пользователь успешно зарегистрирован',
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Неверные учетные данные');
    }

    const payload = { email: user.email, sub: user.id };
    const token = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
      message: 'Успешный вход в систему',
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.findByEmail(email);
    if (user && (await this.validatePassword(password, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async getUserProfile(userId: string) {
    const user = await this.getUserProfileById(userId);
    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }
    return user;
  }

  // Методы для работы с пользователями
  async create(registerDto: {
    email: string;
    password: string;
    name: string;
  }): Promise<User> {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);

    // Создаем настройки интеграций и шаблоны для нового пользователя
    await this.initializeUserSettings(savedUser.id);

    return savedUser;
  }

  /**
   * Инициализация настроек и шаблонов для нового пользователя
   */
  private async initializeUserSettings(userId: string): Promise<void> {
    // Создаем настройки Telegram (по умолчанию выключены)
    const telegramSettings = this.telegramSettingsRepository.create({
      user_id: userId,
      isEnabled: false,
    });
    await this.telegramSettingsRepository.save(telegramSettings);

    // Создаем настройки Email (по умолчанию выключены)
    const emailSettings = this.emailSettingsRepository.create({
      user_id: userId,
      isEnabled: false,
    });
    await this.emailSettingsRepository.save(emailSettings);

    // Создаем шаблон для Telegram
    const telegramTemplate = this.messageTemplateRepository.create({
      user_id: userId,
      type: TemplateType.TELEGRAM,
      messageTemplate: defaultTemplate,
    });
    await this.messageTemplateRepository.save(telegramTemplate);

    // Создаем шаблон для Email
    const emailTemplate = this.messageTemplateRepository.create({
      user_id: userId,
      type: TemplateType.EMAIL,
      messageTemplate: defaultTemplate,
    });
    await this.messageTemplateRepository.save(emailTemplate);

    // Создаем шаблон для Task
    const taskTemplate = this.messageTemplateRepository.create({
      user_id: userId,
      type: TemplateType.TASK,
      messageTemplate: defaultTemplate,
    });
    await this.messageTemplateRepository.save(taskTemplate);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async validatePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async getUserProfileById(id: string): Promise<{
    id: string;
    email: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'email', 'name', 'createdAt', 'updatedAt'],
    });

    return user;
  }
}
