/**
 * Shared Zod primitives untuk validasi field user.
 * Digunakan oleh auth.controller dan settings.controller agar aturan konsisten.
 */
import { z } from 'zod';

export const nameSchema = z
  .string({ required_error: 'Nama wajib diisi' })
  .min(3, 'Nama minimal 3 karakter')
  .max(100, 'Nama maksimal 100 karakter')
  .trim();

export const emailSchema = z
  .string({ required_error: 'Email wajib diisi' })
  .email('Format email tidak valid')
  .toLowerCase()
  .trim();

/** Aturan password OWASP: min 8 + huruf kapital + angka + simbol */
export const passwordSchema = z
  .string({ required_error: 'Password wajib diisi' })
  .min(8, 'Password minimal 8 karakter')
  .regex(/[A-Z]/, 'Password harus mengandung minimal 1 huruf kapital (A-Z)')
  .regex(/[0-9]/, 'Password harus mengandung minimal 1 angka (0-9)')
  .regex(/[^A-Za-z0-9]/, 'Password harus mengandung minimal 1 simbol (!@#$%^& dll)');

export const phoneSchema = z
  .string()
  .regex(
    /^(\+62|62|0)\d{8,12}$/,
    'Format nomor telepon tidak valid (contoh: 08123456789 atau +6281234567890)',
  )
  .optional();
