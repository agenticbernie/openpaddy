'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiClientError, apiFetch } from '@/lib/api';
import { type AuthUser, useAuthStore } from '@/lib/auth-store';
import { zodResolver } from '@hookform/resolvers/zod';
import { type LoginInput, loginSchema } from '@openpaddy/shared';
import { AlertCircle, Leaf, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

interface LoginResponse {
  token: string;
  user: AuthUser;
}

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: 'admin',
      password: '',
    },
  });

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    try {
      const res = await apiFetch<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      login(res.token, res.user);
      router.replace('/dashboard');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setServerError(err.message);
      } else {
        setServerError(
          'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.',
        );
      }
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-emerald-50 to-slate-50 px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-md">
            <Leaf className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">OpenPaddy</h1>
          <p className="mt-1 text-base text-slate-700">
            Điều phối vùng nguyên liệu lúa gạo minh bạch
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Đăng nhập hệ thống</CardTitle>
            <CardDescription>
              Dành cho Doanh nghiệp xuất khẩu &amp; Cán bộ Hợp tác xã
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {serverError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-900"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                  <span>{serverError}</span>
                </div>
              )}

              <div>
                <Label htmlFor="username">Tên đăng nhập</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  placeholder="admin"
                  {...register('username')}
                />
                {errors.username && (
                  <p className="mt-1 text-sm font-medium text-red-700">
                    {errors.username.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Mật khẩu</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="mt-1 text-sm font-medium text-red-700">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Đang đăng nhập...
                  </>
                ) : (
                  'Đăng nhập'
                )}
              </Button>

              <p className="text-center text-sm text-slate-600">
                Tài khoản PoC demo: <strong>admin</strong> /{' '}
                <strong>openpaddy2027</strong>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
