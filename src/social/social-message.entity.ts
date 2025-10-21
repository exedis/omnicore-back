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
import { Webhook } from '../webhook/webhook.entity';

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  DELIVERED = 'delivered',
  TELEGRAM_DELIVERED = 'telegram_delivered', // Специальный статус для доставки в Telegram
}

@Entity('social_messages')
export class SocialMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  webhook_id: string;

  @ManyToOne(() => Webhook, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'webhook_id' })
  webhook: Webhook;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.PENDING,
  })
  status: MessageStatus;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // Дополнительные данные сообщения

  @Column({ nullable: true })
  externalMessageId: string; // ID сообщения в внешней системе (Telegram)

  @Column({ nullable: true })
  errorMessage: string; // Сообщение об ошибке, если отправка не удалась

  @Column({ nullable: true })
  sentAt: Date; // Время отправки

  @Column({ nullable: true })
  deliveredAt: Date; // Время доставки

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
