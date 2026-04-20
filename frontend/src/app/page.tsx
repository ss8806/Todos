"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, logout } from "@/lib/api";

interface Todo {
  id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
}

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchTodos = async () => {
      try {
        const data = await apiFetch("/todos");
        setTodos(data);
      } catch (err) {
        console.error("Failed to fetch todos", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchTodos();
  }, [router]);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    try {
      const addedTodo = await apiFetch("/todos", {
        method: "POST",
        body: JSON.stringify({ title: newTodo }),
      });
      setTodos([...todos, addedTodo]);
      setNewTodo("");
    } catch (err) {
      console.error("Failed to add todo", err);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-8 bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Todo List</h1>
          <button
            onClick={handleLogout}
            className="text-sm bg-zinc-200 dark:bg-zinc-800 px-4 py-2 rounded hover:opacity-80"
          >
            Logout
          </button>
        </div>

        <form onSubmit={handleAddTodo} className="flex gap-2 mb-8">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="What needs to be done?"
            className="flex-1 p-2 border rounded dark:bg-zinc-900 dark:border-zinc-700"
          />
          <button
            type="submit"
            className="bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-950 px-6 py-2 rounded font-medium"
          >
            Add
          </button>
        </form>

        <ul className="space-y-3">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className="flex items-center gap-3 p-4 bg-white dark:bg-zinc-900 rounded shadow-sm"
            >
              <input
                type="checkbox"
                checked={todo.is_completed}
                readOnly
                className="w-5 h-5 rounded border-zinc-300"
              />
              <span className={todo.is_completed ? "line-through text-zinc-400" : ""}>
                {todo.title}
              </span>
            </li>
          ))}
          {todos.length === 0 && (
            <p className="text-center text-zinc-500 py-8">No todos yet. Add one above!</p>
          )}
        </ul>
      </div>
    </div>
  );
}
