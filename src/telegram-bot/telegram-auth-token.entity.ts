import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

@Entity('telegram_auth_tokens')
export class TelegramAuthToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ unique: true })
  token: string;

  @Column({ default: false })
  isUsed: boolean;

  @Column({ nullable: true })
  telegramChatId: string; // ID чата пользователя в Telegram

  @Column({ nullable: true })
  telegramUsername: string; // Username пользователя в Telegram

  @Column({ nullable: true })
  usedAt: Date; // Время использования токена

  @Column({
    type: 'timestamp',
    default: () => "CURRENT_TIMESTAMP + INTERVAL '1 hour'",
  })
  expiresAt: Date; // Время истечения токена (1 час)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
