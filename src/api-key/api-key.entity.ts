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
import { Board } from '../board/board.entity';

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

  @Column({ nullable: true })
  board_id: string; // Доска для автоматического создания задач

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Board, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'board_id' })
  board: Board;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
