# Кастомные колонки для досок

## Обзор

Система кастомных колонок позволяет каждой доске иметь свои уникальные колонки для организации задач (как в Trello). Задачи можно перетаскивать между колонками с помощью drag-and-drop.

### Возможности:

- ✅ Создание, редактирование и удаление колонок
- ✅ Изменение порядка колонок
- ✅ Настройка цвета для каждой колонки
- ✅ Автоматическое создание колонок по умолчанию при создании доски
- ✅ Перемещение задач между колонками
- ✅ Позиционирование задач внутри колонки

---

## Колонки по умолчанию

При создании новой доски автоматически создаются 4 колонки:

1. **Backlog** - Серый (#6b7280)
2. **To Do** - Синий (#3b82f6)
3. **In Progress** - Оранжевый (#f59e0b)
4. **Done** - Зеленый (#10b981)

---

## API Endpoints

### Создать колонку

```http
POST /boards/:boardId/columns
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Review",
  "description": "Задачи на проверке",
  "color": "#9333ea",
  "position": 2
}
```

**Примечание:** Только владелец доски может создавать колонки.

### Получить все колонки доски

```http
GET /boards/:boardId/columns
Authorization: Bearer {token}
```

Возвращает колонки отсортированные по `position` с задачами внутри.

### Получить колонку по ID

```http
GET /boards/:boardId/columns/:columnId
Authorization: Bearer {token}
```

### Обновить колонку

```http
PUT /boards/:boardId/columns/:columnId
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Code Review",
  "color": "#8b5cf6"
}
```

### Удалить колонку

```http
DELETE /boards/:boardId/columns/:columnId
Authorization: Bearer {token}
```

**Внимание:** При удалении колонки, задачи в ней НЕ удаляются, а их `column_id` становится `null`.

### Изменить порядок колонок

```http
PUT /boards/:boardId/columns/reorder
Authorization: Bearer {token}
Content-Type: application/json

{
  "columnIds": [
    "uuid-колонки-1",
    "uuid-колонки-2",
    "uuid-колонки-3",
    "uuid-колонки-4"
  ]
}
```

Массив должен содержать ID всех колонок в нужном порядке.

---

## Работа с задачами в колонках

### Создать задачу в колонке

```http
POST /tasks
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Новая задача",
  "board_id": "uuid-доски",
  "column_id": "uuid-колонки",
  "position": 0
}
```

### Переместить задачу в другую колонку

```http
PUT /tasks/:taskId
Authorization: Bearer {token}
Content-Type: application/json

{
  "column_id": "uuid-новой-колонки",
  "position": 2
}
```

При drag-and-drop на фронте просто обновляйте `column_id` и `position`.

---

## Примеры использования

### 1. Создать Kanban доску

```javascript
// 1. Создаем доску (колонки создадутся автоматически)
const board = await apiClient.createBoard({
  name: 'Проект X',
  description: 'Разработка нового функционала',
});

// 2. Получаем колонки
const columns = await apiClient.getColumns(board.id);
console.log(columns);
// [
//   { id: '...', name: 'Backlog', position: 0, color: '#6b7280' },
//   { id: '...', name: 'To Do', position: 1, color: '#3b82f6' },
//   { id: '...', name: 'In Progress', position: 2, color: '#f59e0b' },
//   { id: '...', name: 'Done', position: 3, color: '#10b981' }
// ]
```

### 2. Добавить кастомную колонку

```javascript
// Добавляем колонку "Testing" перед "Done"
await apiClient.createColumn(boardId, {
  name: 'Testing',
  description: 'Тестирование функционала',
  color: '#ec4899',
  position: 3,
});

// Перестраиваем порядок
const columns = await apiClient.getColumns(boardId);
const columnIds = columns.map((c) => c.id);

await apiClient.reorderColumns(boardId, {
  columnIds: [
    backlogId,
    todoId,
    inProgressId,
    testingId, // Новая колонка
    doneId,
  ],
});
```

### 3. Переместить задачу drag-and-drop

```javascript
// При drop задачи в другую колонку
const onTaskDrop = async (taskId, newColumnId, newPosition) => {
  await apiClient.updateTask(taskId, {
    column_id: newColumnId,
    position: newPosition,
  });

  // Обновляем UI
  refetchTasks();
};
```

### 4. Отобразить Kanban доску

```typescript
import { prepareKanbanData, KanbanColumn } from './boards-tasks-types';

// Получаем данные
const columns = await apiClient.getColumns(boardId);
const tasks = await apiClient.getTasksByBoard(boardId);

// Подготавливаем данные для отображения
const kanbanData = prepareKanbanData(columns, tasks);

// Рендерим
kanbanData.forEach(({ column, tasks }) => {
  console.log(`
    Колонка: ${column.name} (${tasks.length} задач)
    Цвет: ${column.color}
    Задачи:
  `);

  tasks.forEach((task) => {
    console.log(`  - ${task.title}`);
  });
});
```

---

## TypeScript типы для фронтенда

### BoardColumn

```typescript
interface BoardColumn {
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
```

### DTOs

```typescript
interface CreateColumnDto {
  name: string;
  description?: string;
  color?: string;
  position?: number;
}

interface UpdateColumnDto {
  name?: string;
  description?: string;
  color?: string;
  position?: number;
}

interface ReorderColumnsDto {
  columnIds: string[];
}
```

### Helper функции

```typescript
// Группировка задач по колонкам
const tasksByColumn = groupTasksByColumn(tasks, columns);

// Подготовка данных для Kanban
const kanbanData = prepareKanbanData(columns, tasks);
// Возвращает: KanbanColumn[]
```

---

## Компонент React (пример)

```tsx
import { useState, useEffect } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

function KanbanBoard({ boardId }) {
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    loadData();
  }, [boardId]);

  const loadData = async () => {
    const [cols, tsks] = await Promise.all([
      apiClient.getColumns(boardId),
      apiClient.getTasksByBoard(boardId),
    ]);
    setColumns(cols);
    setTasks(tsks);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id;
    const newColumnId = over.id;

    await apiClient.updateTask(taskId, {
      column_id: newColumnId,
      position: 0,
    });

    loadData();
  };

  const kanbanData = prepareKanbanData(columns, tasks);

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto">
        {kanbanData.map(({ column, tasks }) => (
          <div
            key={column.id}
            className="flex-shrink-0 w-80 bg-gray-100 rounded-lg p-4"
            style={{ borderTop: `4px solid ${column.color}` }}
          >
            <h3 className="font-bold mb-4">
              {column.name} ({tasks.length})
            </h3>

            <SortableContext
              items={tasks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </SortableContext>
          </div>
        ))}
      </div>
    </DndContext>
  );
}
```

---

## Миграция со статусов на колонки

Если ранее вы использовали только `status`, вот как мигрировать:

### Вариант 1: Использовать оба подхода

Можно использовать и `status` и `column_id` одновременно:

- `column_id` - для визуальной организации (колонки)
- `status` - для бизнес-логики (фильтрация, аналитика)

### Вариант 2: Перейти только на колонки

Удалите использование поля `status` в пользу `column_id`:

```javascript
// Было
const newTasks = tasks.filter((t) => t.status === 'new');

// Стало
const backlogColumn = columns.find((c) => c.name === 'Backlog');
const backlogTasks = tasks.filter((t) => t.column_id === backlogColumn.id);
```

---

## FAQ

### Сколько колонок можно создать?

Технически — неограниченно. Рекомендуется 4-7 колонок для оптимального UX.

### Что происходит с задачами при удалении колонки?

Задачи остаются, но их `column_id` становится `null`. Они не отображаются ни в одной колонке до переназначения.

### Можно ли иметь разные колонки на разных досках?

Да! Каждая доска имеет свой набор колонок независимо от других досок.

### Как автоматически помещать новые вебхуки в определенную колонку?

При создании задачи из вебхука она автоматически помещается в первую колонку (с наименьшим `position`). Обычно это "Backlog".

### Можно ли изменить колонки по умолчанию?

Да, отредактируйте метод `createDefaultColumns` в `board.service.ts`:

```typescript
private async createDefaultColumns(boardId: string): Promise<void> {
  const defaultColumns = [
    { name: 'Новые', color: '#3b82f6', position: 0 },
    { name: 'В работе', color: '#f59e0b', position: 1 },
    { name: 'Готово', color: '#10b981', position: 2 },
  ];
  // ...
}
```

---

## Troubleshooting

### Задачи не отображаются в колонках

1. Проверьте, что у задачи установлен `column_id`
2. Убедитесь, что колонка существует
3. Проверьте, что используете правильный `boardId`

### Порядок колонок не сохраняется

Убедитесь, что передаете все ID колонок в `reorderColumns`:

```javascript
// Получите все колонки
const columns = await apiClient.getColumns(boardId);

// Измените порядок и сохраните
const reordered = [...columns].sort(/* ваша логика */);
await apiClient.reorderColumns(boardId, {
  columnIds: reordered.map((c) => c.id),
});
```

### Задача "потерялась" после перемещения

Проверьте, что обновляете и `column_id` и `position` одновременно:

```javascript
await apiClient.updateTask(taskId, {
  column_id: newColumnId,
  position: newPosition, // Обязательно!
});
```

---

## Следующие шаги

1. **WIP лимиты** - ограничение количества задач в колонке
2. **Автоматические действия** - автоматическое перемещение при смене статуса
3. **Шаблоны досок** - сохранение набора колонок как шаблон
4. **Swimlanes** - горизонтальные группировки внутри колонок
5. **Цветные метки** - дополнительная визуальная категоризация задач
