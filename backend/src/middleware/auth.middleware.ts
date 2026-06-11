import { Response, NextFunction } from 'express';
import { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { verifyToken } from '../utils/jwt.util';
import { sendError } from '../utils/response';
import { AuthRequest, UserRole } from '../types';

// ─── authenticateToken ────────────────────────────────────────────

/**
 * Middleware autentikasi JWT — WAJIB untuk semua protected route.
 *
 * Alur:
 *   1. Baca header Authorization: Bearer <token>
 *   2. Verifikasi access token menggunakan JWT_ACCESS_SECRET
 *   3. Lampirkan payload ke req.user untuk dipakai di controller/middleware berikutnya
 *
 * Error yang ditangani secara eksplisit:
 *   - Token tidak ada          → 401 "Token autentikasi tidak ditemukan"
 *   - Token expired            → 401 "Token expired"
 *   - Token tidak valid        → 401 "Token tidak valid"
 */
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    sendError(res, 'Token autentikasi tidak ditemukan', 401);
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    req.user = verifyToken(token, 'access');
    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      // Pesan spesifik agar client tahu harus refresh token, bukan re-login
      sendError(res, 'Token expired', 401);
      return;
    }
    if (error instanceof JsonWebTokenError) {
      sendError(res, 'Token tidak valid', 401);
      return;
    }
    // Error tidak terduga — lempar ke global error handler
    throw error;
  }
}

// ─── requireRole ──────────────────────────────────────────────────

/**
 * Middleware otorisasi berbasis role — gunakan SETELAH authenticateToken.
 *
 * Terima satu atau beberapa role yang diizinkan.
 * Jika role user tidak ada dalam daftar → 403 Forbidden.
 *
 * Hierarki role aplikasi:
 *   PUBLIC   — Pelapor umum (read + create laporan sendiri)
 *   VERIFIER — Petugas lapangan (verifikasi + update status)
 *   ADMIN    — Administrator penuh (semua akses)
 *
 * Contoh:
 *   router.patch('/status', authenticateToken, requireRole('VERIFIER', 'ADMIN'), handler)
 */
export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      // Seharusnya tidak terjadi jika requireRole dipakai setelah authenticateToken
      sendError(res, 'Tidak terautentikasi', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(
        res,
        `Akses ditolak. Dibutuhkan role: ${roles.join(' atau ')}`,
        403,
      );
      return;
    }

    next();
  };
}

// ─── optionalAuth ─────────────────────────────────────────────────

/**
 * Middleware autentikasi opsional — untuk endpoint publik yang perlu tahu
 * apakah request datang dari user terautentikasi atau pengunjung biasa.
 *
 * Jika token valid    → req.user diisi, lanjut ke handler
 * Jika token tidak ada atau tidak valid → req.user = undefined, tetap lanjut
 *
 * Contoh penggunaan:
 *   - Endpoint daftar laporan: tampilkan tombol "Edit" hanya jika req.user ada
 *   - Endpoint peta: semua bisa akses, tapi user login dapat fitur tambahan
 */
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    // Tidak ada token — lanjut tanpa user (bukan error)
    next();
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    req.user = verifyToken(token, 'access');
  } catch {
    // Token tidak valid atau expired — abaikan saja, req.user tetap undefined
  }

  next();
}

// ─── Backward-compatible aliases ─────────────────────────────────
// Agar kode lama di report.routes.ts dan user.routes.ts tidak perlu diubah sekaligus.
// Hapus alias ini setelah semua file yang menggunakannya sudah dimigrate.

/** @deprecated Gunakan authenticateToken */
export const authenticate = authenticateToken;

/** @deprecated Gunakan requireRole */
export const authorize = requireRole;
