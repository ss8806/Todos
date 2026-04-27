"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/api";
import { useTodos, TodoFilters } from "@/hooks/useTodos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { TodoFilterPanel } from "./_components/TodoFilterPanel";
import { TodoItemList } from "./_components/TodoItemList";

export default function Home() {
  const [newTodo, setNewTodo] = useState("");
  const [filters, setFilters] = useState<TodoFilters>({
    sort_by: "created_at",
    sort_order: "desc",
  });
  const [showFilters, setShowFilters] = useState(false);
  const router = useRouter();
  const { todosQuery, addTodoMutation, toggleTodoMutation, deleteTodoMutation } = useTodos(filters);

  const { data: todos, isLoading, isError } = todosQuery;

  // エラー時にリダイレクト（useEffect内で呼び出す）
  useEffect(() => {
    if (isError) {
      router.push("/login");
    }
  }, [isError, router]);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    addTodoMutation.mutate(newTodo, {
      onSuccess: () => {
        setNewTodo("");
        toast.success("タスクを追加しました");
      },
      onError: () => {
        toast.error("タスクの追加に失敗しました");
      },
    });
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value || undefined }));
  };

  const handleStatusFilter = (value: string | null) => {
    setFilters((prev) => ({
      ...prev,
      is_completed: value === "all" || value === null ? undefined : value === "completed",
    }));
  };

  const handlePriorityFilter = (value: string | null) => {
    setFilters((prev) => ({
      ...prev,
      priority: value === "all" || value === null ? undefined : (value as "high" | "medium" | "low"),
    }));
  };

  const handleSortChange = (value: string | null) => {
    if (!value) return;
    const [sort_by, sort_order] = value.split("-");
    setFilters((prev) => ({
      ...prev,
      sort_by: sort_by as TodoFilters["sort_by"],
      sort_order: sort_order as TodoFilters["sort_order"],
    }));
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
            <form onSubmit={handleAddTodo} className="flex gap-3 mb-4">
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
        />
      </div>
    </div>
  );
}
