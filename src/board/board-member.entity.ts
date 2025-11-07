import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../auth/user.entity';
import { Board } from './board.entity';

export enum BoardRole {
  OWNER = 'owner',
  MEMBER = 'member',
}

@Entity('board_members')
@Unique(['board_id', 'user_id'])
export class BoardMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  board_id: string;

  @Column()
  user_id: string;

  @Column({
    type: 'enum',
    enum: BoardRole,
    default: BoardRole.MEMBER,
  })
  role: BoardRole;

  @ManyToOne(() => Board, (board) => board.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'board_id' })
  board: Board;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn()
  joinedAt: Date;
}
