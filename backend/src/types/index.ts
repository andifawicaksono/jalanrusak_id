import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

// ─── Role ─────────────────────────────────────────────────────────

/** Role pengguna — harus sinkron dengan enum Role di Prisma schema */
export type UserRole = 'PUBLIC' | 'VERIFIER' | 'ADMIN';

// ─── JWT Payload Types ────────────────────────────────────────────

/**
 * Payload access token (expire 1 jam).
 * Berisi data minimal yang cukup untuk otorisasi tanpa hit DB.
 */
export interface AuthPayload extends JwtPayload {
  userId: string;
  role: UserRole;
  tokenType: 'access';
}

/**
 * Payload refresh token (expire 7 hari).
 * Hanya berisi userId — role selalu diambil fresh dari DB saat refresh.
 */
export interface RefreshTokenPayload extends JwtPayload {
  userId: string;
  tokenType: 'refresh';
}

// ─── Express Request Extension ───────────────────────────────────

/**
 * Extend Express Request untuk menyertakan data user terautentikasi.
 * Diisi oleh middleware `authenticateToken` setelah token diverifikasi.
 */
export interface AuthRequest extends Request {
  user?: AuthPayload;
}

// ─── API Response Types ───────────────────────────────────────────

/** Format standar semua response API */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
}

/** Metadata paginasi */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Response dengan paginasi */
export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  meta: PaginationMeta;
}

// ─── Query Params ─────────────────────────────────────────────────

export interface ReportQueryParams {
  page?: string;
  limit?: string;
  status?: string;
  severity?: string;
  userId?: string;
  search?: string;
}
