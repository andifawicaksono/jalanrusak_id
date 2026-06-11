import { Response } from 'express';
import { ApiResponse, PaginatedResponse, PaginationMeta } from '../types';

/**
 * Kirim response sukses (2xx) dengan format standar.
 * Semua handler menggunakan fungsi ini agar response konsisten.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Berhasil',
  statusCode = 200,
): Response {
  const body: ApiResponse<T> = { success: true, message, data };
  return res.status(statusCode).json(body);
}

/**
 * Kirim response error dengan format standar.
 * Gunakan ini untuk error yang sudah diketahui (validasi, not found, dll).
 */
export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  errors?: unknown,
): Response {
  const body: ApiResponse = { success: false, message, errors };
  return res.status(statusCode).json(body);
}

/**
 * Kirim response dengan paginasi.
 * Digunakan untuk endpoint yang mengembalikan daftar data.
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  meta: PaginationMeta,
  message = 'Berhasil',
): Response {
  const body: PaginatedResponse<T> = { success: true, message, data, meta };
  return res.status(200).json(body);
}

/** Hitung metadata paginasi dari total data dan parameter request */
export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
