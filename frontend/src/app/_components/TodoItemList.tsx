"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, CheckCircle, Circle, Loader2, FileText } from "lucide-react";
import { Todo } from "@/hooks/useTodos";

interface TodoItemListProps {
  todos: Todo[] | undefined;
  isLoading: boolean;
  onToggle: (id: string, is_completed: boolean) => void;
  onDelete: (id: string) => void;
}

export function TodoItemList({ todos, isLoading, onToggle, onDelete }: TodoItemListProps) {
  const completedCount = todos?.filter((t) => t.is_completed).length ?? 0;
  const pendingCount = (todos?.length ?? 0) - completedCount;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-300" />
      </div>
    );
  }

  if (todos?.length === 0) {
    return (
      <Card className="py-20">
        <CardContent className="flex flex-col items-center justify-center text-center">
          <FileText className="w-12 h-12 text-zinc-300 mb-4" />
          <p className="text-zinc-500 dark:text-zinc-400">タスクがまだありません。上から追加しましょう！</p>
        </CardContent>
      </Card>
    );
  }

  return (
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
                    onToggle(todo.id, todo.is_completed)
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
                    onDelete(todo.id)
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
  );
}
