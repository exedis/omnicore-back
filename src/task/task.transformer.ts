import { Task } from './task.entity';
import { User } from '../auth/user.entity';
import { BoardColumn } from '../board/board-column.entity';

export interface TaskResponsible {
  id: string;
  name: string;
  email: string;
}

export type TaskResponse = Omit<Task, 'responsible'> & {
  responsible: TaskResponsible | null;
  responsibleId: string | null;
};

const sanitizeUser = (user?: User | null): TaskResponsible | null => {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
};

export const transformTask = (task: Task): TaskResponse => {
  const responsibleUser = task.responsible ?? null;

  const transformed: any = {
    ...(task as unknown as Record<string, unknown>),
  };

  transformed.responsible = sanitizeUser(responsibleUser);
  transformed.responsibleId = responsibleUser ? responsibleUser.id : null;

  return transformed as TaskResponse;
};

export const transformTasks = (tasks: Task[]): TaskResponse[] =>
  tasks.map((task) => transformTask(task));

const sanitizeColumn = (column?: BoardColumn | null) => {
  if (!column) {
    return null;
  }

  return {
    id: column.id,
    name: column.name,
    description: column.description,
    color: column.color,
    position: column.position,
  };
};

export interface TaskColumnGroup {
  column: ReturnType<typeof sanitizeColumn>;
  tasks: TaskResponse[];
}

export interface TaskResponsibleGroup {
  responsible: TaskResponsible | null;
  columns: TaskColumnGroup[];
}

export const transformGroupedTasks = (
  tasks: Task[],
): TaskResponsibleGroup[] => {
  const groupedByResponsible = new Map<
    string | null,
    {
      responsible: TaskResponsible | null;
      columns: Map<string | null, TaskColumnGroup>;
    }
  >();

  for (const task of tasks) {
    const transformedTask = transformTask(task);
    const responsibleKey = transformedTask.responsibleId ?? null;
    const columnKey = task.column_id ?? null;

    let responsibleGroup = groupedByResponsible.get(responsibleKey);
    if (!responsibleGroup) {
      responsibleGroup = {
        responsible: transformedTask.responsible,
        columns: new Map<string | null, TaskColumnGroup>(),
      };
      groupedByResponsible.set(responsibleKey, responsibleGroup);
    }

    let columnGroup = responsibleGroup.columns.get(columnKey);
    if (!columnGroup) {
      columnGroup = {
        column: sanitizeColumn(task.column),
        tasks: [],
      };
      responsibleGroup.columns.set(columnKey, columnGroup);
    }

    columnGroup.tasks.push(transformedTask);
  }

  const sortColumns = (columns: TaskColumnGroup[]) =>
    columns
      .map((columnGroup) => ({
        ...columnGroup,
        tasks: [...columnGroup.tasks].sort((a, b) => {
          if (a.position !== b.position) {
            return (a.position ?? 0) - (b.position ?? 0);
          }
          return a.createdAt.getTime() - b.createdAt.getTime();
        }),
      }))
      .sort((a, b) => {
        const positionA = a.column?.position ?? Number.MAX_SAFE_INTEGER;
        const positionB = b.column?.position ?? Number.MAX_SAFE_INTEGER;

        if (positionA !== positionB) {
          return positionA - positionB;
        }

        const nameA = a.column?.name ?? '';
        const nameB = b.column?.name ?? '';

        return nameA.localeCompare(nameB);
      });

  return Array.from(groupedByResponsible.values())
    .map<TaskResponsibleGroup>((group) => ({
      responsible: group.responsible,
      columns: sortColumns(Array.from(group.columns.values())),
    }))
    .sort((a, b) => {
      const isAUnassigned = a.responsible === null;
      const isBUnassigned = b.responsible === null;

      if (isAUnassigned && !isBUnassigned) {
        return 1;
      }

      if (!isAUnassigned && isBUnassigned) {
        return -1;
      }

      const nameA = a.responsible?.name ?? '';
      const nameB = b.responsible?.name ?? '';

      return nameA.localeCompare(nameB);
    });
};
