import jwt, { SignOptions } from 'jsonwebtoken';
import { AuthPayload, RefreshTokenPayload, UserRole } from '../types';

// ─── Secret Resolution ─────────────────────────────────────────────

/**
 * Ambil secret yang sesuai untuk tipe token.
 * Access dan refresh token menggunakan secret BERBEDA —
 * jika satu secret bocor, yang lain tetap aman.
 *
 * Env yang dibutuhkan:
 *   JWT_ACCESS_SECRET  — untuk access token
 *   JWT_REFRESH_SECRET — untuk refresh token
 */
function getSecret(type: 'access' | 'refresh'): string {
  const secret =
    type === 'access'
      ? (process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET) // Fallback ke JWT_SECRET untuk kompatibilitas
      : process.env.JWT_REFRESH_SECRET;

  if (!secret) {
    throw new Error(
      `Secret JWT untuk '${type}' token tidak ditemukan. ` +
        `Set ${type === 'access' ? 'JWT_ACCESS_SECRET' : 'JWT_REFRESH_SECRET'} di .env`,
    );
  }
  return secret;
}

// ─── Generate Tokens ──────────────────────────────────────────────

/**
 * Buat access token (expire 1 jam).
 * Berisi userId, role, dan tokenType untuk otorisasi tanpa query DB.
 */
export function generateAccessToken(userId: string, role: UserRole): string {
  const payload: Omit<AuthPayload, keyof jwt.JwtPayload> = {
    userId,
    role,
    tokenType: 'access',
  };
  return jwt.sign(payload, getSecret('access'), {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn']) ?? '1h',
    issuer: 'laporjalan',
  });
}

/**
 * Buat refresh token (expire 7 hari).
 * Hanya berisi userId — role diambil fresh dari DB saat digunakan,
 * sehingga perubahan role langsung berlaku tanpa harus logout.
 */
export function generateRefreshToken(userId: string): string {
  const payload: Omit<RefreshTokenPayload, keyof jwt.JwtPayload> = {
    userId,
    tokenType: 'refresh',
  };
  return jwt.sign(payload, getSecret('refresh'), {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn']) ?? '7d',
    issuer: 'laporjalan',
  });
}

// ─── Verify Token ─────────────────────────────────────────────────

/**
 * Verifikasi dan decode token berdasarkan tipenya.
 *
 * - type = 'access'  → kembalikan AuthPayload
 * - type = 'refresh' → kembalikan RefreshTokenPayload
 *
 * Throws:
 *   TokenExpiredError    jika token sudah kadaluarsa
 *   JsonWebTokenError    jika signature tidak valid
 *   Error                jika tokenType di dalam payload tidak sesuai
 */
export function verifyToken(token: string, type: 'access'): AuthPayload;
export function verifyToken(token: string, type: 'refresh'): RefreshTokenPayload;
export function verifyToken(
  token: string,
  type: 'access' | 'refresh',
): AuthPayload | RefreshTokenPayload {
  const decoded = jwt.verify(token, getSecret(type), {
    issuer: 'laporjalan',
  }) as AuthPayload | RefreshTokenPayload;

  // Pastikan tipe token sesuai — mencegah access token dipakai sebagai refresh dan sebaliknya
  if (decoded.tokenType !== type) {
    throw new Error(
      `Jenis token tidak sesuai: diharapkan '${type}', diterima '${decoded.tokenType}'`,
    );
  }

  return decoded;
}
