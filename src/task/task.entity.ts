import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Board } from '../board/board.entity';
import { BoardColumn } from '../board/board-column.entity';
import { ApiKey } from '../api-key/api-key.entity';
import { Webhook } from '../webhook/webhook.entity';

export enum TaskStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.NEW,
  })
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Column()
  board_id: string;

  @Column({ nullable: true })
  column_id: string;

  @Column({ nullable: true })
  api_key_id: string;

  @Column({ nullable: true })
  webhook_id: string;

  @Column({ type: 'int', default: 0 })
  position: number; // Позиция задачи внутри колонки

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => Board, (board) => board.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'board_id' })
  board: Board;

  @ManyToOne(() => BoardColumn, (column) => column.tasks, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'column_id' })
  column: BoardColumn;

  @ManyToOne(() => ApiKey, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'api_key_id' })
  apiKey: ApiKey;

  @OneToOne(() => Webhook, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'webhook_id' })
  webhook: Webhook;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
