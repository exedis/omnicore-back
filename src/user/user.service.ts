import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

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

    return this.userRepository.save(user);
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

  async enableTelegram(id: string): Promise<void> {
    await this.userRepository.update(id, { isTelegramEnabled: true });
  }

  async disableTelegram(id: string): Promise<void> {
    await this.userRepository.update(id, { isTelegramEnabled: false });
  }

  async getUserProfile(id: string): Promise<{
    id: string;
    email: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    isTelegramEnabled: boolean;
    telegramChatId: string;
  } | null> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: [
        'id',
        'email',
        'name',
        'createdAt',
        'updatedAt',
        'isTelegramEnabled',
        'telegramChatId',
      ],
    });

    return user;
  }

  async notificationStatus(id: string): Promise<{
    isTelegramEnabled: boolean;
  }> {
    const user = await this.userRepository.findOne({ where: { id } });
    return {
      isTelegramEnabled: user?.isTelegramEnabled || false,
    };
  }
}
