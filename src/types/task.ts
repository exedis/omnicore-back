import { Task } from 'src/task/task.entity';

export type TaskByBoardResponsibleItem = Pick<
  Task,
  | 'id'
  | 'title'
  | 'description'
  | 'position'
  | 'createdAt'
  | 'updatedAt'
  | 'column_id'
  | 'responsible_id'
  | 'status'
  | 'priority'
>;

export type TaskByBoardResponsibleResponse = {
  tasks: TaskByBoardResponsibleItem[];
  responsible: { id: string; name: string | null };
  total: number;
};
