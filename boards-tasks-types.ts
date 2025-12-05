/**
 * TypeScript типы для системы досок и задач
 * Используйте эти типы на фронтенде для типобезопасной работы с API
 */

// ===== ENUMS =====

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

export enum BoardRole {
  OWNER = 'owner',
  MEMBER = 'member',
}

// ===== ENTITIES =====

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  owner?: User;
  tasks?: Task[];
  members?: BoardMember[];
  columns?: BoardColumn[];
  createdAt: string;
  updatedAt: string;
}

export interface BoardMember {
  id: string;
  board_id: string;
  user_id: string;
  role: BoardRole;
  board?: Board;
  user?: User;
  joinedAt: string;
}

export interface BoardColumn {
  id: string;
  name: string;
  description?: string;
  color?: string;
  position: number;
  board_id: string;
  board?: Board;
  tasks?: Task[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskResponsible {
  id: string;
  name: string;
  email: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  board_id: string;
  column_id?: string;
  api_key_id?: string;
  webhook_id?: string;
  responsible_id?: string | null;
  position: number;
  metadata?: Record<string, any>;
  board?: Board;
  column?: BoardColumn;
  apiKey?: ApiKey;
  webhook?: Webhook;
  responsible?: TaskResponsible | null;
  responsibleId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  isActive: boolean;
  lastUsedAt?: string;
  usageCount: number;
  user_id: string;
  board_id?: string;
  board?: Board;
  createdAt: string;
  updatedAt: string;
}

export interface Webhook {
  id: string;
  siteName: string;
  formName: string;
  data: Record<string, any>;
  advertisingParams?: Record<string, any>;
  metadata?: Record<string, any>;
  user_id: string;
  createdAt: string;
}

// ===== DTOs =====

export interface CreateBoardDto {
  name: string;
  description?: string;
}

export interface UpdateBoardDto {
  name?: string;
  description?: string;
}

export interface InviteMemberDto {
  email: string;
  role?: BoardRole;
}

export interface RemoveMemberDto {
  userId: string;
}

export interface CreateColumnDto {
  name: string;
  description?: string;
  color?: string;
  position?: number;
}

export interface UpdateColumnDto {
  name?: string;
  description?: string;
  color?: string;
  position?: number;
}

export interface ReorderColumnsDto {
  columnIds: string[];
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  board_id: string;
  column_id?: string;
  api_key_id?: string;
  responsible_id?: string | null;
  position?: number;
  metadata?: Record<string, any>;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  column_id?: string;
  responsible_id?: string | null;
  position?: number;
  metadata?: Record<string, any>;
}

export interface MoveTaskDto {
  column_id: string;
  position?: number;
}

export interface TaskQueryDto {
  board_id?: string;
  api_key_id?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  page?: string;
  limit?: string;
}

// ===== API RESPONSES =====

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface TasksResponse {
  tasks: Task[];
  pagination: PaginationMeta;
}

export interface BoardsListResponse {
  boards: Board[];
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}

// ===== API CLIENT HELPERS =====

/**
 * Базовый класс для работы с API досок и задач
 */
export class BoardsTasksApiClient {
  constructor(private baseUrl: string, private getAuthToken: () => string) {}

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getAuthToken()}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error: ApiErrorResponse = await response.json();
      throw new Error(error.message as string);
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  // ===== BOARDS =====

  async createBoard(data: CreateBoardDto): Promise<Board> {
    return this.request<Board>('/boards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getBoards(): Promise<Board[]> {
    return this.request<Board[]>('/boards');
  }

  async getBoard(id: string): Promise<Board> {
    return this.request<Board>(`/boards/${id}`);
  }

  async updateBoard(id: string, data: UpdateBoardDto): Promise<Board> {
    return this.request<Board>(`/boards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBoard(id: string): Promise<void> {
    return this.request<void>(`/boards/${id}`, {
      method: 'DELETE',
    });
  }

  // ===== BOARD MEMBERS =====

  async inviteMember(
    boardId: string,
    data: InviteMemberDto,
  ): Promise<BoardMember> {
    return this.request<BoardMember>(`/boards/${boardId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeMember(boardId: string, data: RemoveMemberDto): Promise<void> {
    return this.request<void>(`/boards/${boardId}/members`, {
      method: 'DELETE',
      body: JSON.stringify(data),
    });
  }

  async getBoardMembers(boardId: string): Promise<BoardMember[]> {
    return this.request<BoardMember[]>(`/boards/${boardId}/members`);
  }

  // ===== BOARD COLUMNS =====

  async createColumn(
    boardId: string,
    data: CreateColumnDto,
  ): Promise<BoardColumn> {
    return this.request<BoardColumn>(`/boards/${boardId}/columns`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getColumns(boardId: string): Promise<BoardColumn[]> {
    return this.request<BoardColumn[]>(`/boards/${boardId}/columns`);
  }

  async getColumn(boardId: string, columnId: string): Promise<BoardColumn> {
    return this.request<BoardColumn>(`/boards/${boardId}/columns/${columnId}`);
  }

  async updateColumn(
    boardId: string,
    columnId: string,
    data: UpdateColumnDto,
  ): Promise<BoardColumn> {
    return this.request<BoardColumn>(`/boards/${boardId}/columns/${columnId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteColumn(boardId: string, columnId: string): Promise<void> {
    return this.request<void>(`/boards/${boardId}/columns/${columnId}`, {
      method: 'DELETE',
    });
  }

  async reorderColumns(
    boardId: string,
    data: ReorderColumnsDto,
  ): Promise<BoardColumn[]> {
    return this.request<BoardColumn[]>(`/boards/${boardId}/columns/reorder`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ===== TASKS =====

  async createTask(data: CreateTaskDto): Promise<Task> {
    return this.request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTasks(query?: TaskQueryDto): Promise<TasksResponse> {
    const params = new URLSearchParams(
      query as Record<string, string>,
    ).toString();
    return this.request<TasksResponse>(`/tasks?${params}`);
  }

  async getTasksByBoard(boardId: string): Promise<Task[]> {
    return this.request<Task[]>(`/tasks/by-board/${boardId}`);
  }

  async getTasksByApiKey(apiKeyId: string): Promise<Task[]> {
    return this.request<Task[]>(`/tasks/by-api-key/${apiKeyId}`);
  }

  async getTask(id: string): Promise<Task> {
    return this.request<Task>(`/tasks/${id}`);
  }

  async updateTask(id: string, data: UpdateTaskDto): Promise<Task> {
    return this.request<Task>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id: string): Promise<void> {
    return this.request<void>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  async moveTask(id: string, data: MoveTaskDto): Promise<Task> {
    return this.request<Task>(`/tasks/${id}/move`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

// ===== HOOKS FOR REACT (EXAMPLE) =====

/**
 * Пример хука для React приложения
 * Использует React Query / TanStack Query
 */
/*
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useBoardsApi(apiClient: BoardsTasksApiClient) {
  const queryClient = useQueryClient();

  const useBoards = () => {
    return useQuery({
      queryKey: ['boards'],
      queryFn: () => apiClient.getBoards(),
    });
  };

  const useBoard = (id: string) => {
    return useQuery({
      queryKey: ['boards', id],
      queryFn: () => apiClient.getBoard(id),
      enabled: !!id,
    });
  };

  const useCreateBoard = () => {
    return useMutation({
      mutationFn: (data: CreateBoardDto) => apiClient.createBoard(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['boards'] });
      },
    });
  };

  const useUpdateBoard = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: string; data: UpdateBoardDto }) =>
        apiClient.updateBoard(id, data),
      onSuccess: (_, { id }) => {
        queryClient.invalidateQueries({ queryKey: ['boards'] });
        queryClient.invalidateQueries({ queryKey: ['boards', id] });
      },
    });
  };

  const useDeleteBoard = () => {
    return useMutation({
      mutationFn: (id: string) => apiClient.deleteBoard(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['boards'] });
      },
    });
  };

  return {
    useBoards,
    useBoard,
    useCreateBoard,
    useUpdateBoard,
    useDeleteBoard,
  };
}

export function useTasksApi(apiClient: BoardsTasksApiClient) {
  const queryClient = useQueryClient();

  const useTasks = (query?: TaskQueryDto) => {
    return useQuery({
      queryKey: ['tasks', query],
      queryFn: () => apiClient.getTasks(query),
    });
  };

  const useTask = (id: string) => {
    return useQuery({
      queryKey: ['tasks', id],
      queryFn: () => apiClient.getTask(id),
      enabled: !!id,
    });
  };

  const useTasksByBoard = (boardId: string) => {
    return useQuery({
      queryKey: ['tasks', 'board', boardId],
      queryFn: () => apiClient.getTasksByBoard(boardId),
      enabled: !!boardId,
    });
  };

  const useCreateTask = () => {
    return useMutation({
      mutationFn: (data: CreateTaskDto) => apiClient.createTask(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      },
    });
  };

  const useUpdateTask = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: string; data: UpdateTaskDto }) =>
        apiClient.updateTask(id, data),
      onSuccess: (_, { id, data }) => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['tasks', id] });
        if (data.status) {
          // Обновить список задач для доски
          queryClient.invalidateQueries({ queryKey: ['tasks', 'board'] });
        }
      },
    });
  };

  const useDeleteTask = () => {
    return useMutation({
      mutationFn: (id: string) => apiClient.deleteTask(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      },
    });
  };

  return {
    useTasks,
    useTask,
    useTasksByBoard,
    useCreateTask,
    useUpdateTask,
    useDeleteTask,
  };
}
*/

// ===== UTILITY FUNCTIONS =====

/**
 * Получить цвет для статуса задачи
 */
export function getTaskStatusColor(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.NEW:
      return '#3b82f6'; // blue
    case TaskStatus.IN_PROGRESS:
      return '#f59e0b'; // amber
    case TaskStatus.COMPLETED:
      return '#10b981'; // green
    case TaskStatus.CANCELLED:
      return '#6b7280'; // gray
    default:
      return '#6b7280';
  }
}

/**
 * Получить цвет для приоритета задачи
 */
export function getTaskPriorityColor(priority: TaskPriority): string {
  switch (priority) {
    case TaskPriority.LOW:
      return '#10b981'; // green
    case TaskPriority.MEDIUM:
      return '#3b82f6'; // blue
    case TaskPriority.HIGH:
      return '#f59e0b'; // amber
    case TaskPriority.URGENT:
      return '#ef4444'; // red
    default:
      return '#6b7280';
  }
}

/**
 * Получить читаемое название статуса
 */
export function getTaskStatusLabel(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.NEW:
      return 'Новая';
    case TaskStatus.IN_PROGRESS:
      return 'В работе';
    case TaskStatus.COMPLETED:
      return 'Завершена';
    case TaskStatus.CANCELLED:
      return 'Отменена';
    default:
      return status;
  }
}

/**
 * Получить читаемое название приоритета
 */
export function getTaskPriorityLabel(priority: TaskPriority): string {
  switch (priority) {
    case TaskPriority.LOW:
      return 'Низкий';
    case TaskPriority.MEDIUM:
      return 'Средний';
    case TaskPriority.HIGH:
      return 'Высокий';
    case TaskPriority.URGENT:
      return 'Срочный';
    default:
      return priority;
  }
}

/**
 * Сгруппировать задачи по статусам (для Kanban доски)
 */
export function groupTasksByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  return tasks.reduce(
    (acc, task) => {
      if (!acc[task.status]) {
        acc[task.status] = [];
      }
      acc[task.status].push(task);
      return acc;
    },
    {
      [TaskStatus.NEW]: [],
      [TaskStatus.IN_PROGRESS]: [],
      [TaskStatus.COMPLETED]: [],
      [TaskStatus.CANCELLED]: [],
    } as Record<TaskStatus, Task[]>,
  );
}

/**
 * Сгруппировать задачи по приоритетам
 */
export function groupTasksByPriority(
  tasks: Task[],
): Record<TaskPriority, Task[]> {
  return tasks.reduce(
    (acc, task) => {
      if (!acc[task.priority]) {
        acc[task.priority] = [];
      }
      acc[task.priority].push(task);
      return acc;
    },
    {
      [TaskPriority.LOW]: [],
      [TaskPriority.MEDIUM]: [],
      [TaskPriority.HIGH]: [],
      [TaskPriority.URGENT]: [],
    } as Record<TaskPriority, Task[]>,
  );
}

/**
 * Отсортировать задачи по приоритету (от срочных к низким)
 */
export function sortTasksByPriority(tasks: Task[]): Task[] {
  const priorityOrder = {
    [TaskPriority.URGENT]: 0,
    [TaskPriority.HIGH]: 1,
    [TaskPriority.MEDIUM]: 2,
    [TaskPriority.LOW]: 3,
  };

  return [...tasks].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
  );
}

/**
 * Сгруппировать задачи по колонкам (для Kanban доски)
 */
export function groupTasksByColumn(
  tasks: Task[],
  columns: BoardColumn[],
): Record<string, Task[]> {
  const grouped: Record<string, Task[]> = {};

  // Инициализируем группы для всех колонок
  columns.forEach((column) => {
    grouped[column.id] = [];
  });

  // Группируем задачи
  tasks.forEach((task) => {
    if (task.column_id && grouped[task.column_id]) {
      grouped[task.column_id].push(task);
    }
  });

  // Сортируем задачи внутри каждой колонки по позиции
  Object.keys(grouped).forEach((columnId) => {
    grouped[columnId].sort((a, b) => a.position - b.position);
  });

  return grouped;
}

/**
 * Подготовить данные для Kanban доски
 */
export interface KanbanColumn {
  column: BoardColumn;
  tasks: Task[];
}

export function prepareKanbanData(
  columns: BoardColumn[],
  tasks: Task[],
): KanbanColumn[] {
  const tasksByColumn = groupTasksByColumn(tasks, columns);

  return columns
    .sort((a, b) => a.position - b.position)
    .map((column) => ({
      column,
      tasks: tasksByColumn[column.id] || [],
    }));
}
