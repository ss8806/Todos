"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "パスワードは6文字以上で入力してください"),
  confirmPassword: z.string().min(6, "パスワードは6文字以上で入力してください"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "パスワードが一致しません",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.output<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    if (!token) {
      toast.error("無効なリンクです", {
        description: "トークンが見つかりませんでした。",
      });
    }
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      toast.error("無効なリンクです");
      return;
    }

    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token,
          new_password: data.newPassword,
        }),
      });
      setSubmitted(true);
      toast.success("パスワードを変更しました", {
        description: "新しいパスワードでログインしてください。",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "変更に失敗しました";
      toast.error(message);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-4">
        <Card className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
          <CardHeader className="text-center space-y-3">
            <CardTitle className="text-2xl font-bold tracking-tight">
              パスワードを変更しました
            </CardTitle>
            <CardDescription>
              新しいパスワードでログインしてください。
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/login" className={cn(buttonVariants({ variant: "default" }), "w-full")}>
              ログイン画面へ
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <Card className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 bg-zinc-900 dark:bg-zinc-100 rounded-xl flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-white dark:text-zinc-900" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            新しいパスワードを設定
          </CardTitle>
          <CardDescription>
            新しいパスワードを入力してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!token && (
            <p className="text-sm text-red-500 text-center mb-4">
              無効または期限切れのリンクです。
            </p>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">新しいパスワード</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                {...register("newPassword")}
                className={errors.newPassword ? "border-red-500" : ""}
              />
              {errors.newPassword && (
                <p className="text-sm text-red-500">{errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">パスワード（確認）</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...register("confirmPassword")}
                className={errors.confirmPassword ? "border-red-500" : ""}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting || !token}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  変更中...
                </>
              ) : (
                "パスワードを変更"
              )}
            </Button>
            <p className="text-center text-sm">
              <Link
                href="/login"
                className="inline-flex items-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                ログイン画面に戻る
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
