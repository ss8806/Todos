import { render, screen, waitFor } from '@testing-library/react';
import Home from '@/app/page';

// next-themes のモック
jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: jest.fn(),
  }),
}));

// useTodos のモック
jest.mock('@/hooks/useTodos', () => ({
  useTodos: jest.fn(() => ({
    todosQuery: { data: [], isLoading: false, isError: false, error: null },
    countQuery: { data: { total: 0 } },
    addTodoMutation: { mutate: jest.fn(), isPending: false },
    toggleTodoMutation: { mutate: jest.fn() },
    updateTodoMutation: { mutate: jest.fn(), isPending: false },
    deleteTodoMutation: { mutate: jest.fn() },
  })),
}));

// sonner のモック
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Home Page', () => {
  it('renders todo app', async () => {
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('タスク')).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText('やることを入力...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /追加/ })).toBeInTheDocument();
  });
});
