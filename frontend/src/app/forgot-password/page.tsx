"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

const forgotPasswordSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
});

type ForgotPasswordForm = z.output<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setSubmitted(true);
      toast.success("メールを送信しました", {
        description: "パスワードリセットの手順を記載したメールを送信しました。",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "送信に失敗しました";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <Card className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 bg-zinc-900 dark:bg-zinc-100 rounded-xl flex items-center justify-center">
            <Mail className="w-6 h-6 text-white dark:text-zinc-900" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            パスワードをリセット
          </CardTitle>
          <CardDescription>
            登録したメールアドレスを入力してください。リセットリンクを送信します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                メールが送信されました。受信ボックスをご確認ください。
              </p>
              <Link
                href="/login"
                className="inline-flex items-center text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:underline"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                ログイン画面に戻る
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  {...register("email")}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    送信中...
                  </>
                ) : (
                  "リセットリンクを送信"
                )}
              </Button>
              <p className="text-center text-sm">
                <Link
                  href="/login"
                  className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline"
                >
                  ログイン画面に戻る
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
