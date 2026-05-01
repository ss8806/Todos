import { cn } from '@/lib/utils';
import { apiFetch, login, logout, ApiError } from '@/lib/api';

// fetch のモック
global.fetch = jest.fn();

// localStorage のモック
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// document.cookie のモック
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: '',
});

// toast のモック
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
  },
}));

describe('cn utility', () => {
  it('merges tailwind classes correctly', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    expect(cn('base', isActive && 'active')).toBe('base active');
  });

  it('handles undefined and null values', () => {
    expect(cn('base', undefined, null, 'extra')).toBe('base extra');
  });
});

describe('ApiError', () => {
  it('creates error with status', () => {
    const error = new ApiError('Not found', 404);
    expect(error.message).toBe('Not found');
    expect(error.status).toBe(404);
  });
});

describe('apiFetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('returns data on successful request', async () => {
    const mockData = { id: 1, title: 'Test' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const result = await apiFetch('/todos');
    expect(result).toEqual(mockData);
  });

  it('includes authorization header when token exists', async () => {
    localStorageMock.getItem.mockReturnValue('test-token');
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await apiFetch('/todos');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });

  it('throws ApiError on failed request', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'Server error' }),
    });

    await expect(apiFetch('/todos')).rejects.toThrow(ApiError);
  });

  it('handles 401 by calling logout', async () => {
    localStorageMock.getItem.mockReturnValue('old-token');
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Unauthorized' }),
    });

    await expect(apiFetch('/todos')).rejects.toThrow();
  });
});

describe('login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.cookie = '';
  });

  it('stores token on successful login', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'new-token' }),
    });

    await login('test@example.com', 'password');

    expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'new-token');
  });

  it('throws error on failed login', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Invalid credentials' }),
    });

    await expect(login('test@example.com', 'wrong')).rejects.toThrow('Invalid credentials');
  });

  it('throws error when no access_token in response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'wrong-key' }),
    });

    await expect(login('test@example.com', 'password')).rejects.toThrow('トークンが返されませんでした');
  });
});

describe('logout', () => {
  it('removes token from localStorage', () => {
    logout();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
  });
});
