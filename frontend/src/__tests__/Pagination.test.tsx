import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from '@/app/_components/Pagination';

describe('Pagination', () => {
  it('renders pagination info correctly', () => {
    render(<Pagination currentPage={1} pageSize={10} totalItems={25} onPageChange={jest.fn()} />);
    expect(screen.getByText('25 件中 1 - 10 件を表示')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    render(<Pagination currentPage={1} pageSize={10} totalItems={25} onPageChange={jest.fn()} />);
    expect(screen.getByText('前へ').closest('button')).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(<Pagination currentPage={3} pageSize={10} totalItems={25} onPageChange={jest.fn()} />);
    expect(screen.getByText('次へ').closest('button')).toBeDisabled();
  });

  it('calls onPageChange when clicking next', () => {
    const onPageChange = jest.fn();
    render(<Pagination currentPage={1} pageSize={10} totalItems={25} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByText('次へ'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange when clicking previous', () => {
    const onPageChange = jest.fn();
    render(<Pagination currentPage={2} pageSize={10} totalItems={25} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByText('前へ'));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('returns null when totalItems is 0', () => {
    const { container } = render(<Pagination currentPage={1} pageSize={10} totalItems={0} onPageChange={jest.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('handles single page', () => {
    render(<Pagination currentPage={1} pageSize={10} totalItems={5} onPageChange={jest.fn()} />);
    expect(screen.getByText('5 件中 1 - 5 件を表示')).toBeInTheDocument();
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
  });
});
