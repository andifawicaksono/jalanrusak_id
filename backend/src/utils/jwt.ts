import jwt from 'jsonwebtoken';
import { AuthPayload } from '../types';

/** Ambil JWT secret dari environment, throw jika tidak ada */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET tidak ditemukan di environment variables');
  return secret;
}

/**
 * Buat JWT token baru untuk user yang berhasil login.
 * Token berisi userId, email, dan role sebagai payload.
 */
export function generateToken(payload: Omit<AuthPayload, keyof jwt.JwtPayload>): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: (process.env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']) || '7d',
  });
}

/**
 * Verifikasi dan decode JWT token.
 * Throws JsonWebTokenError jika token tidak valid atau expired.
 */
export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, getJwtSecret()) as AuthPayload;
}
