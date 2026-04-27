"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, CheckCircle, Circle, Loader2, FileText, Pencil, AlertTriangle, Clock } from "lucide-react";
import { Todo } from "@/hooks/useTodos";

interface TodoItemListProps {
  todos: Todo[] | undefined;
  isLoading: boolean;
  onToggle: (id: string, is_completed: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (todo: Todo) => void;
  onTagClick?: (tag: string) => void;
}

function getDueStatus(dueDate: string): { status: "overdue" | "soon" | "ok"; label: string } {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 0) {
    return { status: "overdue", label: "期限切れ" };
  }
  if (diffHours <= 24) {
    return { status: "soon", label: "まもなく期限" };
  }
  return { status: "ok", label: `期限: ${due.toLocaleDateString("ja-JP")}` };
}

export function TodoItemList({ todos, isLoading, onToggle, onDelete, onEdit, onTagClick }: TodoItemListProps) {
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
                    {todo.due_date && !todo.is_completed && (
                      (() => {
                        const due = getDueStatus(todo.due_date);
                        if (due.status === "overdue") {
                          return (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {due.label}
                            </Badge>
                          );
                        }
                        if (due.status === "soon") {
                          return (
                            <Badge variant="default" className="text-xs bg-amber-500 hover:bg-amber-600">
                              <Clock className="w-3 h-3 mr-1" />
                              {due.label}
                            </Badge>
                          );
                        }
                        return (
                          <span className="text-xs text-zinc-500">
                            {due.label}
                          </span>
                        );
                      })()
                    )}
                    {todo.tags && (
                      <div className="flex gap-1 flex-wrap">
                        {todo.tags.split(",").map((tag) => {
                          const trimmed = tag.trim();
                          if (!trimmed) return null;
                          return (
                            <button
                              key={trimmed}
                              onClick={(e) => {
                                e.stopPropagation();
                                onTagClick?.(trimmed);
                              }}
                              className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                            >
                              {trimmed}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(todo)}
                    className="text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(todo.id)}
                    className="text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
