import { middleware } from '@/middleware';
import { NextResponse } from 'next/server';

jest.mock('next/server', () => ({
  NextResponse: {
    next: jest.fn(() => ({ type: 'next' })),
    redirect: jest.fn(() => ({ type: 'redirect' })),
  },
}));

describe('middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function createRequest(pathname: string, token?: string) {
    return {
      nextUrl: { pathname },
      url: `http://localhost:3000${pathname}`,
      cookies: {
        get: jest.fn(() => (token ? { value: token } : undefined)),
      },
    } as unknown as import('next/server').NextRequest;
  }

  it('allows public paths without token', () => {
    middleware(createRequest('/login'));
    expect(NextResponse.next).toHaveBeenCalled();
  });

  it('allows register page', () => {
    middleware(createRequest('/register'));
    expect(NextResponse.next).toHaveBeenCalled();
  });

  it('allows forgot-password page', () => {
    middleware(createRequest('/forgot-password'));
    expect(NextResponse.next).toHaveBeenCalled();
  });

  it('allows reset-password page', () => {
    middleware(createRequest('/reset-password'));
    expect(NextResponse.next).toHaveBeenCalled();
  });

  it('redirects to login when no token on protected path', () => {
    middleware(createRequest('/'));
    expect(NextResponse.redirect).toHaveBeenCalled();
  });

  it('allows protected path with token', () => {
    middleware(createRequest('/', 'valid-token'));
    expect(NextResponse.next).toHaveBeenCalled();
  });

  it('sets callbackUrl when redirecting', () => {
    middleware(createRequest('/todos'));
    const redirectCall = (NextResponse.redirect as jest.Mock).mock.calls[0][0];
    expect(redirectCall.searchParams.get('callbackUrl')).toBe('/todos');
  });
});
