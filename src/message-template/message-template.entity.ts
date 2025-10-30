import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../auth/user.entity';
import { TemplateType } from '@type/settings';

const defaultTemplate = `Заявка,\nИмя: {{name}};\nТелефон: {{phone}};\nEmail: {{email}};\nСообщение: {{message}}`;

@Entity('message_templates')
export class MessageTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: TemplateType,
    default: TemplateType.TELEGRAM,
  })
  type: TemplateType;

  @Column({ type: 'text', default: defaultTemplate })
  messageTemplate: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
