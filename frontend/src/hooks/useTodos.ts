import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

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
    queryFn: () => apiFetch("/todos"),
  });

  const addTodoMutation = useMutation({
    mutationFn: (title: string) =>
      apiFetch("/todos", {
        method: "POST",
        body: JSON.stringify({ title }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
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
  });

  const deleteTodoMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/todos/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });

  return {
    todosQuery,
    addTodoMutation,
    toggleTodoMutation,
    deleteTodoMutation,
  };
}
