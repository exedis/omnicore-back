# Пример использования системы ответственных на фронтенде

## Компонент выбора ответственного

```typescript
import { useEffect, useState } from 'react';
import { BoardMember, TaskResponsible } from '@/types/board';

interface ResponsibleSelectorProps {
  boardId: string;
  currentResponsibleId?: string | null;
  onSelect: (responsibleId: string | null) => void;
}

export function ResponsibleSelector({ 
  boardId, 
  currentResponsibleId, 
  onSelect 
}: ResponsibleSelectorProps) {
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMembers() {
      try {
        const response = await fetch(`/api/boards/${boardId}/members`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        setMembers(data);
      } catch (error) {
        console.error('Failed to load board members:', error);
      } finally {
        setLoading(false);
      }
    }

    loadMembers();
  }, [boardId]);

  if (loading) {
    return <div>Загрузка...</div>;
  }

  return (
    <select 
      value={currentResponsibleId || ''} 
      onChange={(e) => onSelect(e.target.value || null)}
      className="border rounded px-3 py-2"
    >
      <option value="">Не назначен</option>
      {members.map((member) => (
        <option key={member.user.id} value={member.user.id}>
          {member.user.name} ({member.user.email})
          {member.role === 'owner' && ' - Владелец'}
        </option>
      ))}
    </select>
  );
}
```

## Использование в форме создания задачи

```typescript
import { useState } from 'react';
import { ResponsibleSelector } from './ResponsibleSelector';

export function CreateTaskForm({ boardId }: { boardId: string }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [responsibleId, setResponsibleId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title,
          description,
          boardId,
          responsibleId // Может быть null или UUID
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const task = await response.json();
      console.log('Задача создана:', task);
      
      // task.responsible будет содержать информацию об ответственном
      // или null, если не назначен
      
    } catch (error) {
      console.error('Ошибка создания задачи:', error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label>Название задачи</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div>
        <label>Описание</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <label>Ответственный</label>
        <ResponsibleSelector
          boardId={boardId}
          currentResponsibleId={responsibleId}
          onSelect={setResponsibleId}
        />
      </div>

      <button type="submit">Создать задачу</button>
    </form>
  );
}
```

## Отображение ответственного в карточке задачи

```typescript
import { Task } from '@/types/board';
import { Avatar } from '@/components/Avatar';

export function TaskCard({ task }: { task: Task }) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold">{task.title}</h3>
      
      {task.description && (
        <p className="text-gray-600 text-sm mt-2">{task.description}</p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.responsible ? (
            <>
              <Avatar 
                name={task.responsible.name} 
                size="sm"
              />
              <div className="text-sm">
                <div className="font-medium">{task.responsible.name}</div>
                <div className="text-gray-500">{task.responsible.email}</div>
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-400 italic">
              Не назначен
            </div>
          )}
        </div>

        <span className={`
          px-2 py-1 rounded text-xs font-medium
          ${task.priority === 'urgent' ? 'bg-red-100 text-red-800' : ''}
          ${task.priority === 'high' ? 'bg-orange-100 text-orange-800' : ''}
          ${task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : ''}
          ${task.priority === 'low' ? 'bg-green-100 text-green-800' : ''}
        `}>
          {task.priority}
        </span>
      </div>
    </div>
  );
}
```

## Изменение ответственного в существующей задаче

```typescript
import { useState } from 'react';
import { Task } from '@/types/board';
import { ResponsibleSelector } from './ResponsibleSelector';

export function TaskDetails({ task }: { task: Task }) {
  const [isEditing, setIsEditing] = useState(false);
  const [responsibleId, setResponsibleId] = useState(task.responsibleId);

  async function handleSaveResponsible(newResponsibleId: string | null) {
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          responsibleId: newResponsibleId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const updatedTask = await response.json();
      setResponsibleId(updatedTask.responsibleId);
      setIsEditing(false);
      
      // Обновить задачу в стейте приложения
      
    } catch (error) {
      console.error('Ошибка обновления ответственного:', error);
      alert('Не удалось изменить ответственного');
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">{task.title}</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Ответственный
        </label>
        
        {isEditing ? (
          <div className="flex gap-2">
            <ResponsibleSelector
              boardId={task.boardId}
              currentResponsibleId={responsibleId}
              onSelect={setResponsibleId}
            />
            <button 
              onClick={() => handleSaveResponsible(responsibleId)}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Сохранить
            </button>
            <button 
              onClick={() => {
                setResponsibleId(task.responsibleId);
                setIsEditing(false);
              }}
              className="px-4 py-2 bg-gray-200 rounded"
            >
              Отмена
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {task.responsible ? (
              <div>
                <div className="font-medium">{task.responsible.name}</div>
                <div className="text-sm text-gray-500">
                  {task.responsible.email}
                </div>
              </div>
            ) : (
              <div className="text-gray-400 italic">Не назначен</div>
            )}
            <button
              onClick={() => setIsEditing(true)}
              className="ml-auto px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            >
              Изменить
            </button>
          </div>
        )}
      </div>

      {/* Остальная информация о задаче */}
    </div>
  );
}
```

## Фильтрация задач по ответственному

```typescript
import { useState, useEffect } from 'react';
import { Task } from '@/types/board';

export function TasksList({ boardId }: { boardId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filterResponsible, setFilterResponsible] = useState<string>('');

  useEffect(() => {
    async function loadTasks() {
      const response = await fetch(`/api/tasks/by-board/${boardId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setTasks(data);
    }

    loadTasks();
  }, [boardId]);

  const filteredTasks = filterResponsible
    ? tasks.filter(t => t.responsibleId === filterResponsible)
    : tasks;

  return (
    <div>
      <div className="mb-4">
        <label>Фильтр по ответственному:</label>
        <select
          value={filterResponsible}
          onChange={(e) => setFilterResponsible(e.target.value)}
        >
          <option value="">Все задачи</option>
          {/* Уникальные ответственные из задач */}
          {Array.from(new Set(tasks.map(t => t.responsibleId).filter(Boolean)))
            .map(id => {
              const task = tasks.find(t => t.responsibleId === id);
              return (
                <option key={id} value={id}>
                  {task?.responsible?.name}
                </option>
              );
            })}
        </select>
      </div>

      <div className="space-y-4">
        {filteredTasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}
```

## Обработка ошибок

```typescript
async function assignResponsible(taskId: string, responsibleId: string) {
  try {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ responsibleId })
    });

    if (!response.ok) {
      const error = await response.json();
      
      if (response.status === 403) {
        // Пользователь не является участником доски
        alert('Назначить можно только участника доски');
      } else if (response.status === 404) {
        alert('Задача не найдена');
      } else {
        alert(`Ошибка: ${error.message}`);
      }
      
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Network error:', error);
    alert('Ошибка сети. Проверьте подключение.');
    return null;
  }
}
```

## TypeScript типы для использования

```typescript
// В файле types/board.ts или types/task.ts

export interface TaskResponsible {
  id: string;
  name: string;
  email: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  boardId: string;
  columnId?: string;
  position?: number;
  apiKeyId?: string;
  webhookId?: string;
  metadata?: Record<string, unknown>;
  responsibleId?: string | null;      // ID ответственного
  responsible?: TaskResponsible | null; // Полная информация об ответственном
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  boardId: string;
  columnId?: string;
  responsibleId?: string | null; // Опционально при создании
  priority?: TaskPriority;
  status?: TaskStatus;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  columnId?: string;
  responsibleId?: string | null; // Можно изменить или установить в null
  priority?: TaskPriority;
  status?: TaskStatus;
}
```






