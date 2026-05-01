import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/app/login/page';
import RegisterPage from '@/app/register/page';
import ForgotPasswordPage from '@/app/forgot-password/page';
import { apiFetch } from '@/lib/api';

// next/navigation のモック
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// sonner のモック
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// lib/api のモック
jest.mock('@/lib/api', () => ({
  login: jest.fn(),
  apiFetch: jest.fn(),
}));

describe('Auth Pages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LoginPage', () => {
    it('renders login form', () => {
      render(<LoginPage />);
      expect(screen.getByText('Welcome')).toBeInTheDocument();
      expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
      expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ログイン/ })).toBeInTheDocument();
    });

    it('shows validation error for invalid email', async () => {
      render(<LoginPage />);
      const emailInput = screen.getByLabelText('メールアドレス');
      fireEvent.change(emailInput, { target: { value: 'invalid' } });
      fireEvent.blur(emailInput);

      const form = screen.getByRole('button', { name: /ログイン/ }).closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText(/有効なメールアドレス/)).toBeInTheDocument();
      });
    });
  });

  describe('RegisterPage', () => {
    it('renders register form', () => {
      render(<RegisterPage />);
      expect(screen.getByText('アカウント作成')).toBeInTheDocument();
      expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
      expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /登録/ })).toBeInTheDocument();
    });

    it('shows validation error for short password', async () => {
      render(<RegisterPage />);
      const passwordInput = screen.getByLabelText('パスワード');
      fireEvent.change(passwordInput, { target: { value: '123' } });
      fireEvent.blur(passwordInput);

      const form = screen.getByRole('button', { name: /登録/ }).closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText(/6文字以上/)).toBeInTheDocument();
      });
    });
  });

  describe('ForgotPasswordPage', () => {
    it('renders forgot password form', () => {
      render(<ForgotPasswordPage />);
      expect(screen.getByText('パスワードをリセット')).toBeInTheDocument();
      expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /リセットリンクを送信/ })).toBeInTheDocument();
    });

    it('shows submitted state', async () => {
      (apiFetch as jest.Mock).mockResolvedValueOnce({});

      render(<ForgotPasswordPage />);
      const emailInput = screen.getByLabelText('メールアドレス');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      const form = screen.getByRole('button', { name: /リセットリンクを送信/ }).closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText(/メールが送信されました/)).toBeInTheDocument();
      });
    });
  });
});
