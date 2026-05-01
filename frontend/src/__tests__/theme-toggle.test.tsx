import { render, screen, waitFor } from '@testing-library/react';
import { ThemeToggle } from '@/components/theme-toggle';

// next-themes のモック
jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: jest.fn(),
  }),
}));

describe('ThemeToggle', () => {
  it('renders without crashing', async () => {
    render(<ThemeToggle />);
    // useEffectのマウント処理を待つ
    await waitFor(() => {
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  it('has accessible label', async () => {
    render(<ThemeToggle />);
    // useEffectのマウント処理を待つ
    await waitFor(() => {
      const srText = screen.getByText(/テーマを切り替え/i);
      expect(srText).toBeInTheDocument();
      expect(srText).toHaveClass('sr-only');
    });
  });
});
