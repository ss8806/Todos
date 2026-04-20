import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

export interface Todo {
  id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
}

export function useTodos() {
  const queryClient = useQueryClient();

  const todosQuery = useQuery<Todo[]>({
    queryKey: ["todos"],
    queryFn: () => apiFetch("/todos/"),
  });

  const addTodoMutation = useMutation({
    mutationFn: (title: string) =>
      apiFetch("/todos/", {
        method: "POST",
        body: JSON.stringify({ title }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      toast.success("TODO追加", { description: "TODOを追加しました" });
    },
    onError: (error: Error) => {
      toast.error("TODO追加失敗", { description: error.message });
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
    },
    onError: (error: Error) => {
      toast.error("TODO更新失敗", { description: error.message });
    },
  });

  const deleteTodoMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/todos/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      toast.success("TODO削除", { description: "TODOを削除しました" });
    },
    onError: (error: Error) => {
      toast.error("TODO削除失敗", { description: error.message });
    },
  });

  return {
    todosQuery,
    addTodoMutation,
    toggleTodoMutation,
    deleteTodoMutation,
  };
}
