import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TodoEditDialog } from '@/app/_components/TodoEditDialog';

// requestAnimationFrame を同期的に実行
beforeAll(() => {
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
});

afterAll(() => {
  (window.requestAnimationFrame as jest.Mock).mockRestore();
  (window.cancelAnimationFrame as jest.Mock).mockRestore();
});

describe('TodoEditDialog', () => {
  const mockTodo = {
    id: '1',
    title: 'Test Todo',
    is_completed: false,
    priority: 'high' as const,
    due_date: '2024-12-31T00:00:00Z',
    tags: 'work',
    created_at: '2024-01-01',
  };

  const defaultProps = {
    todo: null,
    open: false,
    onOpenChange: jest.fn(),
    onSave: jest.fn(),
    isPending: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open with todo', async () => {
    render(<TodoEditDialog {...defaultProps} open={true} todo={mockTodo} />);

    await waitFor(() => {
      expect(screen.getByText('タスクを編集')).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('Test Todo')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const { container } = render(<TodoEditDialog {...defaultProps} todo={mockTodo} />);
    expect(container.querySelector('[data-slot="dialog-content"]')).not.toBeInTheDocument();
  });

  it('calls onSave when save button clicked', async () => {
    const onSave = jest.fn();
    render(<TodoEditDialog {...defaultProps} open={true} todo={mockTodo} onSave={onSave} />);

    await waitFor(() => {
      expect(screen.getByText('保存')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('保存'));
    expect(onSave).toHaveBeenCalled();
  });

  it('calls onOpenChange when cancel clicked', async () => {
    const onOpenChange = jest.fn();
    render(<TodoEditDialog {...defaultProps} open={true} todo={mockTodo} onOpenChange={onOpenChange} />);

    await waitFor(() => {
      expect(screen.getByText('キャンセル')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('キャンセル'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables save button when title is empty', async () => {
    render(<TodoEditDialog {...defaultProps} open={true} todo={{ ...mockTodo, title: '' }} />);

    await waitFor(() => {
      const saveButton = screen.getByText('保存');
      expect(saveButton.closest('button')).toBeDisabled();
    });
  });

  it('shows loading state when pending', async () => {
    render(<TodoEditDialog {...defaultProps} open={true} todo={mockTodo} isPending={true} />);

    await waitFor(() => {
      expect(screen.getByText('保存').closest('button')).toBeDisabled();
    });
  });
});
