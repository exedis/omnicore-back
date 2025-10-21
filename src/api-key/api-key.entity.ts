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

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string; // API ключ

  @Column()
  name: string; // Название ключа для пользователя

  @Column({ default: true })
  isActive: boolean; // Активен ли ключ

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date; // Последнее использование

  @Column({ default: 0, name: 'usage_count' })
  usageCount: number; // Количество использований

  @Column()
  user_id: string; // Связь с пользователем

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
