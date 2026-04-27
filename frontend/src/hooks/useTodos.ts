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

  // クエリパラメータを決定論的な順序で構築
  const queryEntries: [string, string][] = [];
  if (filters?.search) queryEntries.push(["search", filters.search]);
  if (filters?.is_completed !== undefined) queryEntries.push(["is_completed", String(filters.is_completed)]);
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
    mutationFn: (data: { title: string; priority?: "high" | "medium" | "low"; due_date?: string; tags?: string }) =>
      apiFetch("/todos/", {
        method: "POST",
        body: JSON.stringify(data),
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

  const updateTodoMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; is_completed?: boolean; priority?: "high" | "medium" | "low"; due_date?: string; tags?: string }) =>
      apiFetch(`/todos/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      toast.success("TODO更新", { description: "TODOを更新しました" });
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
    countQuery,
    addTodoMutation,
    toggleTodoMutation,
    updateTodoMutation,
    deleteTodoMutation,
  };
}
