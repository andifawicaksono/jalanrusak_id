import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

/**
 * Handler untuk route yang tidak ditemukan (404).
 * Harus didaftarkan setelah semua routes.
 */
export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, `Route ${req.method} ${req.path} tidak ditemukan`, 404);
}

/**
 * Global error handler untuk menangkap error tak terduga.
 * Express mengenali ini sebagai error handler karena memiliki 4 parameter (err, req, res, next).
 *
 * Semua error yang dilempar di middleware/controller akan sampai di sini.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error('[Error]', err.message, err.stack);

  // Hindari bocornya detail error internal ke client di production
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Terjadi kesalahan internal pada server'
      : err.message;

  sendError(res, message, 500);
}
