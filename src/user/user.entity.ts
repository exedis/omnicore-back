import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

  // Настройки Telegram
  @Column({ default: false })
  isTelegramEnabled: boolean; // Включена ли пересылка в Telegram

  @Column({ nullable: true })
  telegramChatId: string; // ID чата пользователя в Telegram

  @Column({ nullable: true })
  telegramUsername: string; // Username пользователя в Telegram

  @Column({ type: 'jsonb', nullable: true })
  telegramSettings: Record<string, any>; // Дополнительные настройки Telegram

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
