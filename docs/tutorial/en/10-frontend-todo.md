# 10. Todo Management UI Implementation

This chapter covers implementing Todo list display, add, edit, filtering, and pagination.

## 1. useTodos Hook

First, create a custom Hook using TanStack Query.

```typescript
// frontend/src/hooks/useTodos.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

export interface Todo {
  id: string;
  title: string;
  is_completed: boolean;
  priority?: "high" | "medium" | "low";
  due_date?: string;
  tags?: string;
  created_at: string;
}

export interface TodoFilters {
  search?: string;
  is_completed?: boolean;
  priority?: "high" | "medium" | "low";
  tags?: string;
  sort_by?: "created_at" | "priority" | "due_date";
  sort_order?: "asc" | "desc";
  skip?: number;
  limit?: number;
}

export function useTodos(filters?: TodoFilters) {
  const queryClient = useQueryClient();

  // Build query parameters
  const queryEntries: [string, string][] = [];
  if (filters?.search) queryEntries.push(["search", filters.search]);
  if (filters?.is_completed !== undefined)
    queryEntries.push(["is_completed", String(filters.is_completed)]);
  if (filters?.priority) queryEntries.push(["priority", filters.priority]);
  if (filters?.tags) queryEntries.push(["tags", filters.tags]);
  if (filters?.sort_by) queryEntries.push(["sort_by", filters.sort_by]);
  if (filters?.sort_order) queryEntries.push(["sort_order", filters.sort_order]);
  if (filters?.skip !== undefined) queryEntries.push(["skip", String(filters.skip)]);
  if (filters?.limit !== undefined) queryEntries.push(["limit", String(filters.limit)]);

  const queryString = new URLSearchParams(queryEntries).toString();

  const todosQuery = useQuery<Todo[]>({
    queryKey: ["todos", queryEntries],
    queryFn: () => apiFetch(`/todos/${queryString ? `?${queryString}` : ""}`),
  });

  const countQuery = useQuery<{ total: number }>({
    queryKey: ["todos", "count", queryEntries],
    queryFn: () => apiFetch(`/todos/count/${queryString ? `?${queryString}` : ""}`),
  });

  const addTodoMutation = useMutation({
    mutationFn: (data: {
      title: string;
      priority?: "high" | "medium" | "low";
      due_date?: string;
      tags?: string;
    }) =>
      apiFetch("/todos/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      toast.success("TODO added", { description: "TODO has been added" });
    },
    onError: (error: Error) => {
      toast.error("Failed to add TODO", { description: error.message });
    },
  });

  const toggleTodoMutation = useMutation({
    mutationFn: ({ id, is_completed }: { id: string; is_completed: boolean }) =>
      apiFetch(`/todos/${id}`, {
        method: "PUT",
        body: JSON.stringify({ is_completed: !is_completed }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      toast.success("TODO updated", { description: "Status changed" });
    },
    onError: (error: Error) => {
      toast.error("Failed to update TODO", { description: error.message });
    },
  });

  const updateTodoMutation = useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      title?: string;
      is_completed?: boolean;
      priority?: "high" | "medium" | "low";
      due_date?: string;
      tags?: string;
    }) =>
      apiFetch(`/todos/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      toast.success("TODO updated", { description: "TODO has been updated" });
    },
    onError: (error: Error) => {
      toast.error("Failed to update TODO", { description: error.message });
    },
  });

  const deleteTodoMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/todos/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      toast.success("TODO deleted", { description: "TODO has been deleted" });
    },
    onError: (error: Error) => {
      toast.error("Failed to delete TODO", { description: error.message });
    },
  });

  return {
    todosQuery,
    countQuery,
    addTodoMutation,
    toggleTodoMutation,
    updateTodoMutation,
    deleteTodoMutation,
  };
}
```

## 2. Todo Filter Panel

```tsx
// frontend/src/app/_components/TodoFilterPanel.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TodoFilters } from "@/hooks/useTodos";

interface TodoFilterPanelProps {
  filters: TodoFilters;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  onSearch: (value: string) => void;
  onStatusFilter: (value: string | null) => void;
  onPriorityFilter: (value: string | null) => void;
  onSortChange: (value: string | null) => void;
}

export function TodoFilterPanel({
  filters,
  showFilters,
  setShowFilters,
  onSearch,
  onStatusFilter,
  onPriorityFilter,
  onSortChange,
}: TodoFilterPanelProps) {
  return (
    <div className="mt-4 space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Search..."
          defaultValue={filters.search || ""}
          onChange={(e) => {
            if (e.target.value === "" || e.key === "Enter") {
              onSearch(e.target.value);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSearch((e.target as HTMLInputElement).value);
            }
          }}
          className="flex-1"
        />
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select
              value={filters.is_completed === undefined ? "all" : String(filters.is_completed)}
              onValueChange={onStatusFilter}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Completed</SelectItem>
                <SelectItem value="false">Incomplete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Priority</Label>
            <Select
              value={filters.priority || "all"}
              onValueChange={onPriorityFilter}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Sort</Label>
            <Select
              value={`${filters.sort_by}-${filters.sort_order}`}
              onValueChange={onSortChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">Created (Newest)</SelectItem>
                <SelectItem value="created_at-asc">Created (Oldest)</SelectItem>
                <SelectItem value="priority-desc">Priority (High)</SelectItem>
                <SelectItem value="due_date-asc">Due date (Nearest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowFilters(!showFilters)}
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        {showFilters ? "Hide filters" : "Show filters"}
      </button>
    </div>
  );
}
```

## 3. Todo List Component

```tsx
// frontend/src/app/_components/TodoItemList.tsx
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Todo } from "@/hooks/useTodos";
import { Pencil, Trash2 } from "lucide-react";

interface TodoItemListProps {
  todos?: Todo[];
  isLoading: boolean;
  onToggle: (id: string, is_completed: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (todo: Todo) => void;
  onTagClick: (tag: string) => void;
}

const priorityColors = {
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

const priorityLabels = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function TodoItemList({
  todos,
  isLoading,
  onToggle,
  onDelete,
  onEdit,
  onTagClick,
}: TodoItemListProps) {
  if (isLoading) {
    return (
      <div className="text-center py-8 text-zinc-400">Loading...</div>
    );
  }

  if (!todos || todos.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-400">
        No tasks. Add a new task.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {todos.map((todo) => (
        <div
          key={todo.id}
          className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800"
        >
          <Checkbox
            checked={todo.is_completed}
            onCheckedChange={() => onToggle(todo.id, todo.is_completed)}
          />
          <div className="flex-1 min-w-0">
            <p
              className={`font-medium ${
                todo.is_completed ? "line-through text-zinc-400" : ""
              }`}
            >
              {todo.title}
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              {todo.priority && (
                <Badge
                  variant="secondary"
                  className={priorityColors[todo.priority]}
                >
                  {priorityLabels[todo.priority]}
                </Badge>
              )}
              {todo.due_date && (
                <Badge variant="outline">
                  {new Date(todo.due_date).toLocaleDateString("en-US")}
                </Badge>
              )}
              {todo.tags?.split(",").map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  onClick={() => onTagClick(tag.trim())}
                >
                  {tag.trim()}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(todo)}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(todo.id)}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

## 4. Todo Edit Dialog

```tsx
// frontend/src/app/_components/TodoEditDialog.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Todo } from "@/hooks/useTodos";
import { Loader2 } from "lucide-react";

interface TodoEditDialogProps {
  todo: Todo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    title?: string;
    is_completed?: boolean;
    priority?: "high" | "medium" | "low";
    due_date?: string;
    tags?: string;
  }) => void;
  isPending: boolean;
}

export function TodoEditDialog({
  todo,
  open,
  onOpenChange,
  onSave,
  isPending,
}: TodoEditDialogProps) {
  const [title, setTitle] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [priority, setPriority] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (todo) {
      setTitle(todo.title);
      setIsCompleted(todo.is_completed);
      setPriority(todo.priority || "");
      setDueDate(todo.due_date ? todo.due_date.split("T")[0] : "");
      setTags(todo.tags || "");
    }
  }, [todo]);

  const handleSave = () => {
    onSave({
      title: title || undefined,
      is_completed: isCompleted,
      ...(priority ? { priority: priority as "high" | "medium" | "low" } : {}),
      ...(dueDate ? { due_date: new Date(dueDate).toISOString() } : {}),
      ...(tags ? { tags } : {}),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="edit-completed"
              checked={isCompleted}
              onCheckedChange={(checked) => setIsCompleted(checked as boolean)}
            />
            <Label htmlFor="edit-completed">Completed</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-priority">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="edit-priority">
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-due-date">Due date</Label>
            <Input
              id="edit-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-tags">Tags</Label>
            <Input
              id="edit-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Comma separated"
            />
          </div>

          <Button onClick={handleSave} disabled={isPending} className="w-full">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

## 5. Pagination Component

```tsx
// frontend/src/app/_components/Pagination.tsx
"use client";

import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center gap-2 mt-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        Previous
      </Button>
      <span className="text-sm text-zinc-600 dark:text-zinc-400">
        {currentPage} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        Next
      </Button>
    </div>
  );
}
```

## 6. Main Page (page.tsx)

Integrate the components created so far to complete the main Todo management screen. Refer to `frontend/src/app/page.tsx` confirmed in [Chapter 08](08-frontend-setup.md).

## Next Steps

Once frontend implementation is ready, let's implement various tests in [Chapter 11: Testing](11-testing.md).
