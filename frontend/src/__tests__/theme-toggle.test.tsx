import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '@/components/theme-toggle';

// next-themes のモック
jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: jest.fn(),
  }),
}));

describe('ThemeToggle', () => {
  it('renders without crashing', () => {
    render(<ThemeToggle />);
    // ボタンが存在することを確認
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('has accessible label', () => {
    render(<ThemeToggle />);
    // スクリーンリーダー用のテキストが存在することを確認
    const srText = screen.getByText(/テーマを切り替え/i);
    expect(srText).toBeInTheDocument();
    expect(srText).toHaveClass('sr-only');
  });
});
