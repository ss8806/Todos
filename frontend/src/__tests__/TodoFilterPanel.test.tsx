import { render, screen, fireEvent } from '@testing-library/react';
import { TodoFilterPanel } from '@/app/_components/TodoFilterPanel';

describe('TodoFilterPanel', () => {
  const defaultProps = {
    filters: {},
    showFilters: false,
    setShowFilters: jest.fn(),
    onSearch: jest.fn(),
    onStatusFilter: jest.fn(),
    onPriorityFilter: jest.fn(),
    onSortChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input and buttons', () => {
    render(<TodoFilterPanel {...defaultProps} />);
    expect(screen.getByPlaceholderText('検索...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /検索/ })).toBeInTheDocument();
  });

  it('toggles filter panel', () => {
    const setShowFilters = jest.fn();
    render(<TodoFilterPanel {...defaultProps} setShowFilters={setShowFilters} />);

    const filterButton = screen.getByRole('button', { name: '' });
    fireEvent.click(filterButton);
    expect(setShowFilters).toHaveBeenCalledWith(true);
  });

  it('shows filters when showFilters is true', () => {
    render(<TodoFilterPanel {...defaultProps} showFilters={true} />);
    expect(screen.getByText('ステータス')).toBeInTheDocument();
    expect(screen.getByText('優先度')).toBeInTheDocument();
    expect(screen.getByText('並び替え')).toBeInTheDocument();
  });

  it('calls onSearch when search button clicked', () => {
    const onSearch = jest.fn();
    render(<TodoFilterPanel {...defaultProps} onSearch={onSearch} />);

    const input = screen.getByPlaceholderText('検索...');
    fireEvent.change(input, { target: { value: 'test query' } });
    fireEvent.click(screen.getByRole('button', { name: /検索/ }));

    expect(onSearch).toHaveBeenCalledWith('test query');
  });

  it('calls onSearch when Enter key pressed', () => {
    const onSearch = jest.fn();
    render(<TodoFilterPanel {...defaultProps} onSearch={onSearch} />);

    const input = screen.getByPlaceholderText('検索...');
    fireEvent.change(input, { target: { value: 'test query' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSearch).toHaveBeenCalledWith('test query');
  });

  it('clears search when clear button clicked', () => {
    const onSearch = jest.fn();
    render(<TodoFilterPanel {...defaultProps} onSearch={onSearch} />);

    const input = screen.getByPlaceholderText('検索...');
    fireEvent.change(input, { target: { value: 'test' } });

    // クリアボタンはアイコンのみのボタン（nameが空）
    const buttons = screen.getAllByRole('button', { name: '' });
    fireEvent.click(buttons[0]);

    expect(onSearch).toHaveBeenCalledWith('');
  });

  it('initializes search value from filters', () => {
    render(<TodoFilterPanel {...defaultProps} filters={{ search: 'initial' }} />);
    expect(screen.getByDisplayValue('initial')).toBeInTheDocument();
  });
});
