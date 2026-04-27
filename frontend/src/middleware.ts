import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 認証なしでアクセスできるパス
const publicPaths = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // パブリックパスはスキップ
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }
  
  // トークンの存在を確認（cookie または localStorage）
  const token = request.cookies.get('token')?.value;
  
  // トークンがない場合はログインページにリダイレクト
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
}

// ミドルウェアを実行するパスを指定
export const config = {
  matcher: [
    // 認証が必要なページ全般（ログイン・登録・Next.js内部パス・静的ファイルは除外）
    '/((?!login|register|_next|api|favicon.ico|.*\\.).*)',
  ],
};
