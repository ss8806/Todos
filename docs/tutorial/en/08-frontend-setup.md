# 08. Frontend Foundation

This chapter covers Next.js project settings, shadcn/ui themes, API client, and authentication middleware.

## 1. Next.js Configuration Files

### next.config.ts

```typescript
// frontend/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
```

Key points:
- Proxy `/api/*` requests to backend (port 8000) with `rewrites`
- Direct access to backend API from frontend in development environment

### tsconfig.json

Automatically generated during shadcn/ui initialization. The following `paths` setting is important:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## 2. Global Styles and Layout

### globals.css

```css
/* frontend/src/app/globals.css */
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));
```

### layout.tsx

```tsx
// frontend/src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Todo App",
  description: "A modern Todo application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

## 3. Provider Settings

Integrate React Query and theme providers.

```tsx
// frontend/src/app/providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <Toaster position="top-right" richColors />
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

## 4. API Client (lib/api.ts)

Implement a client that handles communication with the backend API.

```typescript
// frontend/src/lib/api.ts
import { toast } from "sonner";

// Direct access to backend in development environment
const API_BASE_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8000/api/v1"
    : "/api";

interface ErrorResponse {
  status_code: number;
  detail: string;
  message?: string;
  error_code?: string;
  details?: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: ErrorResponse | null = null;
    try {
      errorData = await response.json();
    } catch {
      errorData = null;
    }

    const errorMessage =
      errorData?.message || errorData?.detail || "API request failed";

    if (response.status === 401) {
      logout();
    } else {
      if (errorData?.details && errorData.details.length > 0) {
        const detailMessages = errorData.details
          .map((d) => `${d.field}: ${d.message}`)
          .join("\n");
        toast.error("Input error", { description: detailMessages });
      } else {
        toast.error("Error", { description: errorMessage });
      }
    }

    throw new ApiError(errorMessage, response.status);
  }

  return response.json();
};

export const login = async (email: string, password: string) => {
  // Clear existing token
  localStorage.removeItem("token");
  const secureFlag =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? " Secure;"
      : "";
  document.cookie = `token=; path=/; max-age=0; SameSite=Strict;${secureFlag}`;

  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);

  const response = await fetch(`${API_BASE_URL}/auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData,
  });

  if (!response.ok) {
    let errorData: ErrorResponse | null = null;
    try {
      errorData = await response.json();
    } catch {
      errorData = null;
    }

    const errorMessage =
      errorData?.message || errorData?.detail || "Login failed";
    toast.error("Login error", { description: errorMessage });
    throw new Error(errorMessage);
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error("Token was not returned");
  }

  localStorage.setItem("token", data.access_token);
  document.cookie = `token=${data.access_token}; path=/; max-age=${
    60 * 60 * 24 * 7
  }; SameSite=Strict;${secureFlag}`;
  toast.success("Login successful", { description: "Logged in" });
  return data;
};

export const logout = () => {
  localStorage.removeItem("token");
  const secureFlag =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? " Secure;"
      : "";
  document.cookie = `token=; path=/; max-age=0; SameSite=Strict;${secureFlag}`;
  toast.info("Logout", { description: "Logged out" });
};
```

Key points:
- Manage tokens with dual `localStorage` + `Cookie` approach
- Cookie is for Next.js middleware authentication check
- Automatically add `Secure` attribute in HTTPS environment
- `ApiError` class preserves error status code

## 5. Authentication Middleware

```typescript
// frontend/src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that don't require authentication
const publicPaths = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check token from Cookie
  const token = request.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*))"],
};
```

## 6. Theme Toggle Components

```tsx
// frontend/src/components/theme-provider.tsx
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

```tsx
// frontend/src/components/theme-toggle.tsx
"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
```

## 7. Utility Functions

```typescript
// frontend/src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## Next Steps

Once the frontend foundation is ready, let's create login and registration screens in [Chapter 09: Authentication UI](09-frontend-auth.md).
