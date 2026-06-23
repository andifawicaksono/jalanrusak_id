'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, UserPlus, AlertCircle, Check } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { registerSchema, PASSWORD_REQUIREMENTS, type RegisterFormData } from '@/lib/userValidation';

// ─── Shared input class ────────────────────────────────────────────

const inputBase =
  'w-full bg-slate-800/60 border border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors';

// ─── Page Component ────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isLoading, error } = useAuthStore();
  const [showPassword, setShowPassword]             = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const passwordValue = watch('password', '');

  const passwordRequirements = PASSWORD_REQUIREMENTS.map(({ label, test }) => ({
    label,
    met: test(passwordValue),
  }));

  const onSubmit = async (data: RegisterFormData) => {
    await registerUser(data.name, data.email, data.password, data.phone);
    router.push('/dashboard');
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1.5">Buat Akun Baru</h1>
        <p className="text-slate-400 text-sm">
          Sudah punya akun?{' '}
          <Link
            href="/login"
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            Masuk di sini
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

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

        {/* Nama Lengkap */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium text-slate-300">
            Nama Lengkap
          </label>
          <input
            id="name"
            placeholder="John Doe"
            className={inputBase}
            {...register('name')}
          />
          {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
        </div>

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
          {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
        </div>

        {/* Nomor Telepon */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-sm font-medium text-slate-300">
            Nomor Telepon{' '}
            <span className="text-slate-600 font-normal">(opsional)</span>
          </label>
          <input
            id="phone"
            type="tel"
            placeholder="08xxxxxxxxxx"
            className={inputBase}
            {...register('phone')}
          />
          {errors.phone && <p className="text-xs text-red-400">{errors.phone.message}</p>}
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
              placeholder="Min. 8 karakter"
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
          {errors.password && <p className="text-red-400 text-xs">{errors.password.message}</p>}

          {/* Password requirements checklist */}
          {passwordValue && (
            <div className="mt-1.5 space-y-1">
              {passwordRequirements.map(({ label, met }) => (
                <div key={label} className="flex items-center gap-2">
                  <div
                    className={`h-3.5 w-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      met ? 'bg-green-500' : 'bg-slate-700'
                    }`}
                  >
                    {met && <Check className="h-2 w-2 text-white" strokeWidth={3} />}
                  </div>
                  <span className={`text-xs transition-colors ${met ? 'text-green-400' : 'text-slate-500'}`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Konfirmasi Password */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-300">
            Konfirmasi Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Ulangi password"
              className={`${inputBase} pr-11`}
              {...register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              aria-label={showConfirmPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-red-400 text-xs">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="mt-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Memproses...
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" />
              Buat Akun
            </>
          )}
        </button>
      </form>
    </div>
  );
}
