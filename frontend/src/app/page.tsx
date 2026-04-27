"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logout, ApiError } from "@/lib/api";
import { useTodos, TodoFilters } from "@/hooks/useTodos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, LogOut, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TodoFilterPanel } from "./_components/TodoFilterPanel";
import { TodoItemList } from "./_components/TodoItemList";
import { TodoEditDialog } from "./_components/TodoEditDialog";
import { Pagination } from "./_components/Pagination";
import { Todo } from "@/hooks/useTodos";

export default function Home() {
  const [newTodo, setNewTodo] = useState("");
  const [newPriority, setNewPriority] = useState<string>("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newTags, setNewTags] = useState("");
  const [showCreateDetails, setShowCreateDetails] = useState(false);
  const [filters, setFilters] = useState<TodoFilters>({
    sort_by: "created_at",
    sort_order: "desc",
    limit: 10,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const router = useRouter();
  const { todosQuery, countQuery, addTodoMutation, toggleTodoMutation, updateTodoMutation, deleteTodoMutation } = useTodos(filters);

  const { data: todos, isLoading, isError } = todosQuery;
  const totalItems = countQuery.data?.total ?? 0;
  const currentPage = Math.floor((filters.skip ?? 0) / (filters.limit ?? 10)) + 1;
  const pageSize = filters.limit ?? 10;

  // 認証エラー（401）時のみログインページにリダイレクト
  useEffect(() => {
    if (isError && todosQuery.error instanceof ApiError && todosQuery.error.status === 401) {
      router.push("/login");
    }
  }, [isError, todosQuery.error, router]);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    addTodoMutation.mutate(
      {
        title: newTodo.trim(),
        ...(newPriority ? { priority: newPriority as "high" | "medium" | "low" } : {}),
        ...(newDueDate ? { due_date: new Date(newDueDate).toISOString() } : {}),
        ...(newTags.trim() ? { tags: newTags.trim() } : {}),
      },
      {
        onSuccess: () => {
          setNewTodo("");
          setNewPriority("");
          setNewDueDate("");
          setNewTags("");
          setShowCreateDetails(false);
          toast.success("タスクを追加しました");
        },
        onError: () => {
          toast.error("タスクの追加に失敗しました");
        },
      }
    );
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value || undefined, skip: 0 }));
  };

  const handleStatusFilter = (value: string | null) => {
    setFilters((prev) => ({
      ...prev,
      is_completed: value === "all" || value === null ? undefined : value === "completed",
      skip: 0,
    }));
  };

  const handlePriorityFilter = (value: string | null) => {
    setFilters((prev) => ({
      ...prev,
      priority: value === "all" || value === null ? undefined : (value as "high" | "medium" | "low"),
      skip: 0,
    }));
  };

  const handleSortChange = (value: string | null) => {
    if (!value) return;
    const [sort_by, sort_order] = value.split("-");
    setFilters((prev) => ({
      ...prev,
      sort_by: sort_by as TodoFilters["sort_by"],
      sort_order: sort_order as TodoFilters["sort_order"],
      skip: 0,
    }));
  };

  const handleTagClick = (tag: string) => {
    setFilters((prev) => ({ ...prev, tags: tag, skip: 0 }));
    setShowFilters(true);
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, skip: (page - 1) * (prev.limit ?? 10) }));
  };

  const handleToggle = (id: string, is_completed: boolean) => {
    toggleTodoMutation.mutate(
      { id, is_completed },
      { onError: () => toast.error("タスクの更新に失敗しました") }
    );
  };

  const handleDelete = (id: string) => {
    deleteTodoMutation.mutate(id, {
      onSuccess: () => toast.success("タスクを削除しました"),
      onError: () => toast.error("タスクの削除に失敗しました"),
    });
  };

  const handleEdit = (todo: Todo) => {
    setEditingTodo(todo);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = (data: { title?: string; is_completed?: boolean; priority?: "high" | "medium" | "low"; due_date?: string; tags?: string }) => {
    if (!editingTodo) return;
    updateTodoMutation.mutate(
      { id: editingTodo.id, ...data },
      { onSuccess: () => setEditDialogOpen(false) }
    );
  };

  // ローディング中はローディング表示
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-300" />
      </div>
    );
  }

  // エラー時は何も表示しない（リダイレクト実行中）
  if (isError) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">タスク</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">タスクを管理しましょう。</p>
          </div>
          <div className="flex gap-3">
            <ThemeToggle />
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              ログアウト
            </Button>
          </div>
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <form onSubmit={handleAddTodo} className="space-y-4">
              <div className="flex gap-3">
                <Input
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  placeholder="やることを入力..."
                  className="flex-1"
                />
                <Button type="submit" disabled={addTodoMutation.isPending}>
                  {addTodoMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      追加
                    </>
                  )}
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateDetails(!showCreateDetails)}
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                {showCreateDetails ? (
                  <ChevronUp className="w-4 h-4 mr-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 mr-1" />
                )}
                詳細設定
              </Button>

              {showCreateDetails && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="create-priority">優先度</Label>
                    <Select value={newPriority} onValueChange={(v) => setNewPriority(v || "")}>
                      <SelectTrigger id="create-priority">
                        <SelectValue placeholder="未設定" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">高</SelectItem>
                        <SelectItem value="medium">中</SelectItem>
                        <SelectItem value="low">低</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-due-date">期限</Label>
                    <Input
                      id="create-due-date"
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-tags">タグ</Label>
                    <Input
                      id="create-tags"
                      value={newTags}
                      onChange={(e) => setNewTags(e.target.value)}
                      placeholder="カンマ区切り"
                    />
                  </div>
                </div>
              )}
            </form>

            <TodoFilterPanel
              filters={filters}
              showFilters={showFilters}
              setShowFilters={setShowFilters}
              onSearch={handleSearch}
              onStatusFilter={handleStatusFilter}
              onPriorityFilter={handlePriorityFilter}
              onSortChange={handleSortChange}
            />
          </CardContent>
        </Card>

        <TodoItemList
          todos={todos}
          isLoading={isLoading}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onTagClick={handleTagClick}
        />

        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={handlePageChange}
        />

        <TodoEditDialog
          todo={editingTodo}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={handleSaveEdit}
          isPending={updateTodoMutation.isPending}
        />
      </div>
    </div>
  );
}
