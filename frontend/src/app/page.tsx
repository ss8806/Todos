"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/api";
import { useTodos, TodoFilters } from "@/hooks/useTodos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, LogOut, CheckCircle, Circle, Loader2, FileText, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  const completedCount = todos?.filter((t) => t.is_completed).length ?? 0;
  const pendingCount = (todos?.length ?? 0) - completedCount;

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value || undefined }));
  };

  const handleStatusFilter = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      is_completed: value === "all" ? undefined : value === "completed",
    }));
  };

  const handlePriorityFilter = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      priority: value === "all" ? undefined : (value as "high" | "medium" | "low"),
    }));
  };

  const handleSortChange = (value: string) => {
    const [sort_by, sort_order] = value.split("-");
    setFilters((prev) => ({ ...prev, sort_by: sort_by as any, sort_order: sort_order as any }));
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

            {/* 検索・フィルタセクション */}
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input
                    placeholder="検索..."
                    value={filters.search || ""}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="w-4 h-4" />
                </Button>
              </div>

              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <div>
                    <label className="text-sm font-medium mb-2 block">ステータス</label>
                    <Select onValueChange={handleStatusFilter} defaultValue="all">
                      <SelectTrigger>
                        <SelectValue placeholder="すべて" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">すべて</SelectItem>
                        <SelectItem value="pending">未完了</SelectItem>
                        <SelectItem value="completed">完了</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">優先度</label>
                    <Select onValueChange={handlePriorityFilter} defaultValue="all">
                      <SelectTrigger>
                        <SelectValue placeholder="すべて" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">すべて</SelectItem>
                        <SelectItem value="high">高</SelectItem>
                        <SelectItem value="medium">中</SelectItem>
                        <SelectItem value="low">低</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">並び替え</label>
                    <Select onValueChange={handleSortChange} defaultValue="created_at-desc">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at-desc">作成日（新しい順）</SelectItem>
                        <SelectItem value="created_at-asc">作成日（古い順）</SelectItem>
                        <SelectItem value="priority-desc">優先度（高い順）</SelectItem>
                        <SelectItem value="priority-asc">優先度（低い順）</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-zinc-300" />
          </div>
        ) : todos?.length === 0 ? (
          <Card className="py-20">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <FileText className="w-12 h-12 text-zinc-300 mb-4" />
              <p className="text-zinc-500 dark:text-zinc-400">タスクがまだありません。上から追加しましょう！</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex gap-4 mb-4">
              <Badge variant="secondary">
                <Circle className="w-3 h-3 mr-1" />
                {pendingCount} 未完了
              </Badge>
              <Badge variant="default">
                <CheckCircle className="w-3 h-3 mr-1" />
                {completedCount} 完了
              </Badge>
            </div>

            <Card>
              <CardContent className="p-0">
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {todos?.map((todo) => (
                    <li
                      key={todo.id}
                      className="flex items-center gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors group"
                    >
                      <Checkbox
                        checked={todo.is_completed}
                        onCheckedChange={() =>
                          toggleTodoMutation.mutate(
                            { id: todo.id, is_completed: todo.is_completed },
                            {
                              onError: () => toast.error("タスクの更新に失敗しました"),
                            }
                          )
                        }
                      />
                      <div className="flex-1 space-y-1">
                        <span
                          className={`block transition-all ${
                            todo.is_completed
                              ? "line-through text-zinc-400"
                              : "text-zinc-900 dark:text-zinc-100"
                          }`}
                        >
                          {todo.title}
                        </span>
                        <div className="flex gap-2 items-center">
                          {todo.priority && (
                            <Badge
                              variant={
                                todo.priority === "high"
                                  ? "destructive"
                                  : todo.priority === "medium"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {todo.priority === "high" ? "高" : todo.priority === "medium" ? "中" : "低"}
                            </Badge>
                          )}
                          {todo.due_date && (
                            <span className="text-xs text-zinc-500">
                              期限: {new Date(todo.due_date).toLocaleDateString("ja-JP")}
                            </span>
                          )}
                          {todo.tags && (
                            <span className="text-xs text-zinc-500">
                              タグ: {todo.tags}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          deleteTodoMutation.mutate(todo.id, {
                            onSuccess: () => toast.success("タスクを削除しました"),
                            onError: () => toast.error("タスクの削除に失敗しました"),
                          })
                        }
                        className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
