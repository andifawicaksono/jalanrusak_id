/**
 * Shared Zod schemas untuk form user (Register, Admin Create, Admin Edit).
 * Import dari sini — jangan duplikasi aturan di tiap halaman.
 */
import { z } from 'zod';
import type { UserRole } from '@/types';

// ─── Primitive schemas ─────────────────────────────────────────────

export const nameSchema = z
  .string()
  .min(3, 'Nama minimal 3 karakter')
  .max(100, 'Nama maksimal 100 karakter')
  .trim();

export const emailSchema = z
  .string()
  .email('Format email tidak valid')
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string()
  .min(8, 'Password minimal 8 karakter')
  .regex(/[A-Z]/, 'Harus mengandung huruf kapital (A-Z)')
  .regex(/[0-9]/, 'Harus mengandung angka (0-9)')
  .regex(/[^A-Za-z0-9]/, 'Harus mengandung simbol (!@#$%^& dll)');

export const phoneSchema = z
  .string()
  .regex(
    /^(\+62|62|0)\d{8,12}$/,
    'Format tidak valid (contoh: 08123456789 atau +6281234567890)',
  )
  .optional()
  .or(z.literal(''));

export const PASSWORD_REQUIREMENTS = [
  { label: 'Minimal 8 karakter',        test: (v: string) => v.length >= 8           },
  { label: 'Huruf kapital (A–Z)',        test: (v: string) => /[A-Z]/.test(v)         },
  { label: 'Angka (0–9)',               test: (v: string) => /[0-9]/.test(v)          },
  { label: 'Simbol (!@#$%^& dll)',      test: (v: string) => /[^A-Za-z0-9]/.test(v)  },
] as const;

// ─── Register schema (dipakai di halaman Register) ─────────────────

export const registerSchema = z
  .object({
    name:            nameSchema,
    email:           emailSchema,
    password:        passwordSchema,
    confirmPassword: z.string(),
    phone:           phoneSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Konfirmasi password tidak sesuai',
    path:    ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

// ─── Admin Create User schema ──────────────────────────────────────

const ROLES = ['PUBLIC', 'VERIFIER', 'FIELD_VERIFIER', 'ADMIN'] as const satisfies UserRole[];

export const adminCreateUserSchema = z
  .object({
    name:            nameSchema,
    email:           emailSchema,
    password:        passwordSchema,
    confirmPassword: z.string(),
    role:            z.enum(ROLES, { required_error: 'Role wajib dipilih' }),
    phone:           phoneSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Konfirmasi password tidak sesuai',
    path:    ['confirmPassword'],
  });

export type AdminCreateUserFormData = z.infer<typeof adminCreateUserSchema>;

// ─── Admin Edit User schema ────────────────────────────────────────

export const adminEditUserSchema = z
  .object({
    name:            nameSchema,
    email:           emailSchema,
    role:            z.enum(ROLES, { required_error: 'Role wajib dipilih' }),
    phone:           phoneSchema,
    password:        z.union([passwordSchema, z.literal('')]).optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.password && data.password.length > 0) {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    {
      message: 'Konfirmasi password tidak sesuai',
      path:    ['confirmPassword'],
    },
  );

export type AdminEditUserFormData = z.infer<typeof adminEditUserSchema>;
