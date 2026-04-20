"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/api";
import { useTodos } from "@/hooks/useTodos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, LogOut, CheckCircle, Circle, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

export default function Home() {
  const [newTodo, setNewTodo] = useState("");
  const router = useRouter();
  const { todosQuery, addTodoMutation, toggleTodoMutation, deleteTodoMutation } = useTodos();

  const { data: todos, isLoading, isError } = todosQuery;

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    addTodoMutation.mutate(newTodo, {
      onSuccess: () => {
        setNewTodo("");
        toast.success("Task added!");
      },
      onError: () => {
        toast.error("Failed to add task");
      },
    });
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (isError) {
    router.push("/login");
    return null;
  }

  const completedCount = todos?.filter((t) => t.is_completed).length ?? 0;
  const pendingCount = (todos?.length ?? 0) - completedCount;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">Tasks</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage your tasks with ease.</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <form onSubmit={handleAddTodo} className="flex gap-3">
              <Input
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                placeholder="What needs to be done?"
                className="flex-1"
              />
              <Button type="submit" disabled={addTodoMutation.isPending}>
                {addTodoMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </>
                )}
              </Button>
            </form>
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
              <p className="text-zinc-500 dark:text-zinc-400">No tasks yet. Add one above!</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex gap-4 mb-4">
              <Badge variant="secondary">
                <Circle className="w-3 h-3 mr-1" />
                {pendingCount} pending
              </Badge>
              <Badge variant="default">
                <CheckCircle className="w-3 h-3 mr-1" />
                {completedCount} completed
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
                              onError: () => toast.error("Failed to update task"),
                            }
                          )
                        }
                      />
                      <span
                        className={`flex-1 transition-all ${
                          todo.is_completed
                            ? "line-through text-zinc-400"
                            : "text-zinc-900 dark:text-zinc-100"
                        }`}
                      >
                        {todo.title}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          deleteTodoMutation.mutate(todo.id, {
                            onSuccess: () => toast.success("Task deleted"),
                            onError: () => toast.error("Failed to delete task"),
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
