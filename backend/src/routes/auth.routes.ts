import { Router } from 'express';
import { z } from 'zod';
import * as authController from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

// ─── Zod Schemas untuk Validasi ──────────────────────────────────

/** Schema validasi request register */
const registerSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  email: z.string().email('Format email tidak valid'),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Password harus mengandung huruf kapital')
    .regex(/[0-9]/, 'Password harus mengandung angka'),
  phone: z.string().optional(),
});

/** Schema validasi request login */
const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password tidak boleh kosong'),
});

// ─── Routes ───────────────────────────────────────────────────────

/** POST /api/v1/auth/register — Daftar akun baru */
router.post('/register', validate(registerSchema), authController.register);

/** POST /api/v1/auth/login — Login dan dapatkan JWT token */
router.post('/login', validate(loginSchema), authController.login);

/** GET /api/v1/auth/me — Ambil data profil user yang sedang login */
router.get('/me', authenticateToken, authController.getProfile);

/** POST /api/v1/auth/google — Login atau daftar via Google OAuth */
router.post('/google', authController.googleAuth);

export default router;
