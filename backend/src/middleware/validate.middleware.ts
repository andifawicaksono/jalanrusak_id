import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response';

/**
 * Factory middleware untuk validasi request body menggunakan Zod schema.
 * Jika validasi gagal, kirim response 400 dengan detail error.
 *
 * Contoh penggunaan:
 * router.post('/login', validate(loginSchema), authController.login)
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // Format error Zod menjadi array pesan yang mudah dibaca
      const errors = formatZodErrors(result.error);
      sendError(res, 'Data yang dikirim tidak valid', 400, errors);
      return;
    }

    // Ganti req.body dengan data yang sudah divalidasi dan di-parse Zod
    req.body = result.data;
    next();
  };
}

/**
 * Factory middleware untuk validasi query parameters.
 * Digunakan di endpoint GET yang menerima filter/paginasi.
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      sendError(res, 'Parameter query tidak valid', 400, errors);
      return;
    }

    req.query = result.data;
    next();
  };
}

/** Ubah ZodError menjadi array objek field-message yang mudah dikonsumsi frontend */
function formatZodErrors(error: ZodError): { field: string; message: string }[] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}
