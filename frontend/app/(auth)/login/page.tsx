'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, LogIn, AlertCircle } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';

// ─── Validation Schema ─────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password tidak boleh kosong'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ─── Shared input class ────────────────────────────────────────────

const inputBase =
  'w-full bg-slate-800/60 border border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors';

// ─── Page Component ────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle, isLoading, error } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    await login(data.email, data.password);
    router.push('/dashboard');
  };

  const triggerGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      try {
        await loginWithGoogle(tokenResponse.access_token);
        toast.success('Login berhasil!');
        router.push('/dashboard');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Login Google gagal. Silakan coba lagi.';
        toast.error(msg);
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      toast.error('Login Google dibatalkan atau gagal. Silakan coba lagi.');
    },
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1.5">Selamat Datang</h1>
        <p className="text-slate-400 text-sm">
          Belum punya akun?{' '}
          <Link
            href="/register"
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            Daftar sekarang
          </Link>
        </p>
      </div>

      {/* API Error */}
      {error && (
        <div className="mb-5 flex items-start gap-3 p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-slate-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="nama@email.com"
            className={inputBase}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-red-400 text-xs">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-slate-300">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className={`${inputBase} pr-11`}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-400 text-xs">{errors.password.message}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || googleLoading}
          className="mt-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Memproses...
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              Masuk
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-slate-800" />
        <span className="text-xs text-slate-600 font-medium">atau</span>
        <div className="flex-1 h-px bg-slate-800" />
      </div>

      {/* Tombol Login dengan Google */}
      <button
        type="button"
        onClick={() => triggerGoogleLogin()}
        disabled={isLoading || googleLoading}
        className="w-full flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 text-slate-100 font-medium py-2.5 rounded-lg transition-colors"
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        )}
        {googleLoading ? 'Memproses...' : 'Lanjutkan dengan Google'}
      </button>
    </div>
  );
}
