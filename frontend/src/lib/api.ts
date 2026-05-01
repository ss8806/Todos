import { toast } from "sonner";

// 開発環境では直接バックエンドにアクセス（307リダイレクトによるAuthorizationヘッダー消失防止）
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
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

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

    // エラーメッセージの構築
    const errorMessage = errorData?.message || errorData?.detail || "APIリクエストに失敗しました";

    // 401は認証エラー: 古いトークン等が残っている可能性があるため自動ログアウト
    // リダイレクトは呼び出し元（page.tsxのuseEffect）に任せる
    if (response.status === 401) {
      logout();
    } else {
      // バリデーションエラーの場合は詳細を表示
      if (errorData?.details && errorData.details.length > 0) {
        const detailMessages = errorData.details.map(d => `${d.field}: ${d.message}`).join("\n");
        toast.error("入力エラー", { description: detailMessages });
      } else {
        toast.error("エラー", { description: errorMessage });
      }
    }

    throw new ApiError(errorMessage, response.status);
  }

  return response.json();
};

export const login = async (email: string, password: string) => {
  // ログイン時は既存トークンをクリアしてから新規発行
  localStorage.removeItem("token");
  const secureFlag = typeof window !== "undefined" && window.location.protocol === "https:" ? " Secure;" : "";
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
    
    const errorMessage = errorData?.message || errorData?.detail || "ログインに失敗しました";
    toast.error("ログインエラー", { description: errorMessage });
    
    throw new Error(errorMessage);
  }

  const data = await response.json();
  
  if (!data.access_token) {
    throw new Error("トークンが返されませんでした");
  }
  
  localStorage.setItem("token", data.access_token);
  document.cookie = `token=${data.access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict;${secureFlag}`;
  toast.success("ログイン成功", { description: "ログインしました" });
  return data;
};

export const logout = () => {
  localStorage.removeItem("token");
  // cookieも削除
  const secureFlag = typeof window !== "undefined" && window.location.protocol === "https:" ? " Secure;" : "";
  document.cookie = `token=; path=/; max-age=0; SameSite=Strict;${secureFlag}`;
  toast.info("ログアウト", { description: "ログアウトしました" });
};
