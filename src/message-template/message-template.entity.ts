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

export enum TemplateType {
  TELEGRAM = 'telegram',
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  SMS = 'sms',
}

@Entity('message_templates')
export class MessageTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  name: string; // Название шаблона (например, "Основной шаблон")

  @Column({
    type: 'enum',
    enum: TemplateType,
    default: TemplateType.TELEGRAM,
  })
  type: TemplateType; // Тип платформы для которой шаблон

  @Column({ type: 'text' })
  template: string; // Шаблон сообщения с переменными типа {{fieldName}}

  @Column({ default: false })
  isDefault: boolean; // Является ли шаблоном по умолчанию

  @Column({ default: true })
  isActive: boolean; // Активен ли шаблон

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // Дополнительные настройки шаблона

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
