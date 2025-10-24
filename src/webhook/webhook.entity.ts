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

@Entity('webhooks')
export class Webhook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  siteName: string; // Имя сайта отправителя

  @Column()
  formName: string; // Имя формы откуда пришло сообщение

  @Column({ type: 'jsonb' })
  data: Record<string, any>; // Гибкие данные сообщения

  @Column({ type: 'jsonb', nullable: true })
  advertisingParams: Record<string, any>; // Рекламные гет параметры

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // Дополнительные метаданные

  @Column()
  user_id: string; // Связь с пользователем

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
