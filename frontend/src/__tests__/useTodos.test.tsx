import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTodos } from '@/hooks/useTodos';
import { apiFetch } from '@/lib/api';

// apiFetch のモック
jest.mock('@/lib/api', () => ({
  apiFetch: jest.fn(),
}));

// sonner のモック
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockedApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useTodos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches todos successfully', async () => {
    const mockTodos = [
      { id: '1', title: 'Todo 1', is_completed: false, created_at: '2024-01-01' },
      { id: '2', title: 'Todo 2', is_completed: true, created_at: '2024-01-02' },
    ];
    mockedApiFetch.mockResolvedValueOnce(mockTodos);
    mockedApiFetch.mockResolvedValueOnce({ total: 2 });

    const { result } = renderHook(() => useTodos(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.todosQuery.isSuccess).toBe(true));

    expect(result.current.todosQuery.data).toEqual(mockTodos);
    expect(result.current.countQuery.data).toEqual({ total: 2 });
  });

  it('applies filters correctly', async () => {
    mockedApiFetch.mockResolvedValueOnce([]);
    mockedApiFetch.mockResolvedValueOnce({ total: 0 });

    const filters = {
      search: 'test',
      is_completed: true,
      priority: 'high' as const,
      tags: 'work',
      sort_by: 'created_at' as const,
      sort_order: 'desc' as const,
      skip: 0,
      limit: 10,
    };

    const { result } = renderHook(() => useTodos(filters), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.todosQuery.isSuccess).toBe(true));

    expect(mockedApiFetch).toHaveBeenCalledWith(
      expect.stringContaining('/todos/')
    );
  });

  it('adds todo successfully', async () => {
    mockedApiFetch.mockResolvedValueOnce([]);
    mockedApiFetch.mockResolvedValueOnce({ total: 0 });
    mockedApiFetch.mockResolvedValueOnce({ id: '3', title: 'New Todo' });

    const { result } = renderHook(() => useTodos(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.todosQuery.isSuccess).toBe(true));

    result.current.addTodoMutation.mutate({ title: 'New Todo' });

    await waitFor(() => expect(result.current.addTodoMutation.isSuccess).toBe(true));
  });

  it('toggles todo successfully', async () => {
    mockedApiFetch.mockResolvedValueOnce([]);
    mockedApiFetch.mockResolvedValueOnce({ total: 0 });
    mockedApiFetch.mockResolvedValueOnce({ id: '1', is_completed: true });

    const { result } = renderHook(() => useTodos(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.todosQuery.isSuccess).toBe(true));

    result.current.toggleTodoMutation.mutate({ id: '1', is_completed: false });

    await waitFor(() => expect(result.current.toggleTodoMutation.isSuccess).toBe(true));
  });

  it('updates todo successfully', async () => {
    mockedApiFetch.mockResolvedValueOnce([]);
    mockedApiFetch.mockResolvedValueOnce({ total: 0 });
    mockedApiFetch.mockResolvedValueOnce({ id: '1', title: 'Updated' });

    const { result } = renderHook(() => useTodos(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.todosQuery.isSuccess).toBe(true));

    result.current.updateTodoMutation.mutate({ id: '1', title: 'Updated' });

    await waitFor(() => expect(result.current.updateTodoMutation.isSuccess).toBe(true));
  });

  it('deletes todo successfully', async () => {
    mockedApiFetch.mockResolvedValueOnce([]);
    mockedApiFetch.mockResolvedValueOnce({ total: 0 });
    mockedApiFetch.mockResolvedValueOnce({});

    const { result } = renderHook(() => useTodos(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.todosQuery.isSuccess).toBe(true));

    result.current.deleteTodoMutation.mutate('1');

    await waitFor(() => expect(result.current.deleteTodoMutation.isSuccess).toBe(true));
  });
});
