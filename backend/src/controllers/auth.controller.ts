import { Request, Response } from 'express';
import { z, ZodError } from 'zod';
import * as authService from '../services/auth.service';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';

// ─── Zod Schemas ──────────────────────────────────────────────────
// Dideklarasikan di controller — dekat dengan handler yang menggunakannya.

/**
 * Schema register:
 *   name     — min 3 karakter (nama orang asli, bukan singkatan)
 *   email    — valid RFC, di-lowercase otomatis
 *   password — min 8 + huruf kapital + angka + simbol (OWASP recommendation)
 *   phone    — format Indonesia opsional: 08xxx, +628xxx, 628xxx
 */
const registerSchema = z.object({
  name: z
    .string({ required_error: 'Nama wajib diisi' })
    .min(3, 'Nama minimal 3 karakter')
    .max(100, 'Nama maksimal 100 karakter')
    .trim(),
  email: z
    .string({ required_error: 'Email wajib diisi' })
    .email('Format email tidak valid')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password wajib diisi' })
    .min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Password harus mengandung minimal 1 huruf kapital (A-Z)')
    .regex(/[0-9]/, 'Password harus mengandung minimal 1 angka (0-9)')
    .regex(/[^A-Za-z0-9]/, 'Password harus mengandung minimal 1 simbol (!@#$%^& dll)'),
  phone: z
    .string()
    .regex(
      /^(\+62|62|0)\d{8,12}$/,
      'Format nomor telepon tidak valid (contoh: 08123456789 atau +6281234567890)',
    )
    .optional(),
});

/** Schema login: email + password, tidak perlu cek format password (server yang menentukan) */
const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email wajib diisi' })
    .email('Format email tidak valid')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password wajib diisi' })
    .min(1, 'Password tidak boleh kosong'),
});

/** Schema refresh: hanya butuh refreshToken di body */
const refreshSchema = z.object({
  refreshToken: z
    .string({ required_error: 'Refresh token wajib diisi' })
    .min(1, 'Refresh token tidak boleh kosong'),
});

// ─── Internal Helper ──────────────────────────────────────────────

/** Ubah ZodError menjadi array { field, message } yang mudah dibaca frontend */
function formatZodErrors(error: ZodError) {
  return error.errors.map((e) => ({
    field: e.path.join('.') || 'input',
    message: e.message,
  }));
}

// ─── Handlers ─────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/register
 *
 * Validasi → cek duplikasi email → hash password → simpan user → return access token.
 * Error 409 jika email sudah ada, 422 jika input tidak valid.
 */
export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Data registrasi tidak valid', 422, formatZodErrors(parsed.error));
    return;
  }

  try {
    const result = await authService.register(parsed.data);
    sendSuccess(res, result, 'Akun berhasil dibuat', 201);
  } catch (error) {
    if (error instanceof Error && error.message.includes('sudah terdaftar')) {
      sendError(res, error.message, 409); // 409 Conflict
      return;
    }
    throw error; // Serahkan ke global error handler
  }
}

/**
 * POST /api/v1/auth/login
 *
 * Validasi → cek kredensial → buat session → return access token + refresh token.
 * Error 401 jika email/password salah, 403 jika akun nonaktif.
 */
export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Data login tidak valid', 422, formatZodErrors(parsed.error));
    return;
  }

  // Ambil metadata untuk disimpan di session (berguna untuk audit & keamanan)
  const ipAddress = req.ip ?? req.socket.remoteAddress ?? null;
  const userAgent = req.headers['user-agent'] ?? null;

  try {
    const result = await authService.login(parsed.data, { ipAddress, userAgent });
    sendSuccess(res, result, 'Login berhasil');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Email atau password')) {
        sendError(res, error.message, 401); // 401 Unauthorized
        return;
      }
      if (error.message.includes('dinonaktifkan')) {
        sendError(res, error.message, 403); // 403 Forbidden
        return;
      }
    }
    throw error;
  }
}

/**
 * POST /api/v1/auth/logout  [Protected]
 *
 * Hapus session dari DB berdasarkan refresh token di body.
 * Selalu return 200 — jangan bocorkan apakah session ada atau tidak.
 *
 * CATATAN: Access token tetap valid sampai expire (1 jam).
 * Untuk invalidasi instan, implementasikan token blocklist di Redis.
 */
export async function logout(req: AuthRequest, res: Response): Promise<void> {
  const parsed = refreshSchema.safeParse(req.body);

  if (parsed.success) {
    // Hapus session — abaikan error (session mungkin sudah expired)
    await authService.logout(parsed.data.refreshToken).catch(() => undefined);
  }

  // Selalu sukses — client harus hapus token dari penyimpanannya sendiri
  sendSuccess(res, null, 'Logout berhasil');
}

/**
 * GET /api/v1/auth/profile  [Protected]
 *
 * Kembalikan data lengkap user yang sedang login.
 * Mengambil fresh dari DB — bukan dari JWT — agar data terbaru (role, isVerified, dll).
 */
export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  const user = await authService.getUserById(req.user!.userId);

  if (!user) {
    // Bisa terjadi jika user dihapus setelah JWT dibuat
    sendError(res, 'User tidak ditemukan', 404);
    return;
  }

  sendSuccess(res, user, 'Data profil berhasil diambil');
}

/**
 * POST /api/v1/auth/refresh
 *
 * Tukar refresh token lama dengan access token baru (+ refresh token baru — rotasi).
 * Rotasi mencegah refresh token reuse attack: token lama langsung tidak berlaku.
 *
 * Error 401 "Token expired"      → client harus redirect ke login
 * Error 401 "tidak valid"        → client harus redirect ke login
 */
export async function refreshToken(req: Request, res: Response): Promise<void> {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Refresh token tidak ditemukan di body request', 400);
    return;
  }

  try {
    const result = await authService.refreshAccessToken(parsed.data.refreshToken);
    sendSuccess(res, result, 'Token berhasil diperbarui');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Token expired')) {
        sendError(res, 'Token expired', 401);
        return;
      }
      // Semua error refresh token lainnya → 401 agar client re-login
      sendError(res, 'Refresh token tidak valid atau sudah digunakan', 401);
      return;
    }
    throw error;
  }
}
