"use client";

import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, Loader2 } from "lucide-react";
import { toast } from "sonner";

const loginSchema = z.object({
  username: z.string().min(3, "ユーザー名は3文字以上で入力してください"),
  password: z.string().min(6, "パスワードは6文字以上で入力してください"),
});

type LoginForm = z.output<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.username, data.password);
      router.push("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "ログインに失敗しました";
      setError("root", { message });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <Card className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 bg-zinc-900 dark:bg-zinc-100 rounded-xl flex items-center justify-center">
            <LogIn className="w-6 h-6 text-white dark:text-zinc-900" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Welcome</CardTitle>
          <CardDescription>ログインしてタスクを管理しましょう。</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">ユーザー名</Label>
              <Input
                id="username"
                placeholder="ユーザー名を入力"
                {...register("username")}
                className={errors.username ? "border-red-500" : ""}
              />
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
                className={errors.password ? "border-red-500" : ""}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
            {errors.root && (
              <p className="text-sm text-red-500 text-center">{errors.root.message}</p>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  ログイン中...
                </>
              ) : (
                "ログイン"
              )}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            アカウントをお持ちでないですか？{" "}
            <Link href="/register" className="font-bold text-zinc-900 dark:text-zinc-100 hover:underline">
              アカウントを作成
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
