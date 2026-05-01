import { render, screen, fireEvent } from '@testing-library/react';
import { TodoItemList } from '@/app/_components/TodoItemList';
import { Todo } from '@/hooks/useTodos';

// PointerEvent polyfill for @base-ui/react
beforeAll(() => {
  global.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type: string, init?: PointerEventInit) {
      super(type, init);
    }
  } as typeof global.PointerEvent;
});

const mockTodos: Todo[] = [
  {
    id: '1',
    title: 'Test Todo 1',
    is_completed: false,
    priority: 'high',
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
    tags: 'work, urgent',
    created_at: '2024-01-01',
  },
  {
    id: '2',
    title: 'Test Todo 2',
    is_completed: true,
    priority: 'low',
    created_at: '2024-01-02',
  },
  {
    id: '3',
    title: 'Overdue Todo',
    is_completed: false,
    due_date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    created_at: '2024-01-03',
  },
];

describe('TodoItemList', () => {
  const defaultProps = {
    todos: mockTodos,
    isLoading: false,
    onToggle: jest.fn(),
    onDelete: jest.fn(),
    onEdit: jest.fn(),
    onTagClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    render(<TodoItemList {...defaultProps} isLoading={true} />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(<TodoItemList {...defaultProps} todos={[]} />);
    expect(screen.getByText(/タスクがまだありません/)).toBeInTheDocument();
  });

  it('renders todo items', () => {
    render(<TodoItemList {...defaultProps} />);
    expect(screen.getByText('Test Todo 1')).toBeInTheDocument();
    expect(screen.getByText('Test Todo 2')).toBeInTheDocument();
  });

  it('shows completed and pending counts', () => {
    render(<TodoItemList {...defaultProps} />);
    expect(screen.getByText('2 未完了')).toBeInTheDocument();
    expect(screen.getByText('1 完了')).toBeInTheDocument();
  });

  it('shows priority badges', () => {
    render(<TodoItemList {...defaultProps} />);
    expect(screen.getByText('高')).toBeInTheDocument();
    expect(screen.getByText('低')).toBeInTheDocument();
  });

  it('shows overdue status', () => {
    render(<TodoItemList {...defaultProps} />);
    expect(screen.getByText('期限切れ')).toBeInTheDocument();
  });

  it('calls onTagClick when tag clicked', () => {
    const onTagClick = jest.fn();
    render(<TodoItemList {...defaultProps} onTagClick={onTagClick} />);

    const tagButton = screen.getByText('work');
    fireEvent.click(tagButton);

    expect(onTagClick).toHaveBeenCalledWith('work');
  });

  it('handles undefined todos gracefully', () => {
    render(<TodoItemList {...defaultProps} todos={undefined} />);
    expect(screen.getByText('0 未完了')).toBeInTheDocument();
  });

  it('renders todo with medium priority', () => {
    const todosWithMedium: Todo[] = [
      { id: '4', title: 'Medium Todo', is_completed: false, priority: 'medium', created_at: '2024-01-04' },
    ];
    render(<TodoItemList {...defaultProps} todos={todosWithMedium} />);
    expect(screen.getByText('中')).toBeInTheDocument();
  });

  it('renders todo without priority', () => {
    const todosNoPriority: Todo[] = [
      { id: '5', title: 'No Priority', is_completed: false, created_at: '2024-01-05' },
    ];
    render(<TodoItemList {...defaultProps} todos={todosNoPriority} />);
    expect(screen.getByText('No Priority')).toBeInTheDocument();
  });

  it('renders todo with ok due status', () => {
    const todosOkDue: Todo[] = [
      { id: '6', title: 'Future Todo', is_completed: false, due_date: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(), created_at: '2024-01-06' },
    ];
    render(<TodoItemList {...defaultProps} todos={todosOkDue} />);
    expect(screen.getByText('Future Todo')).toBeInTheDocument();
  });

  it('renders completed todo without due date display', () => {
    const todosCompletedWithDue: Todo[] = [
      { id: '7', title: 'Completed With Due', is_completed: true, due_date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), created_at: '2024-01-07' },
    ];
    render(<TodoItemList {...defaultProps} todos={todosCompletedWithDue} />);
    expect(screen.getByText('Completed With Due')).toBeInTheDocument();
  });
});
