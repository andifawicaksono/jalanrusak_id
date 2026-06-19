import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

/**
 * Route autentikasi — dimount di /api/v1/auth (lihat routes/index.ts)
 *
 * Endpoint:
 *   POST   /api/v1/auth/register  — Daftar akun baru
 *   POST   /api/v1/auth/login     — Login, dapatkan access + refresh token
 *   POST   /api/v1/auth/logout    — Logout, hapus session [Protected]
 *   GET    /api/v1/auth/profile   — Profil user aktif [Protected]
 *   POST   /api/v1/auth/refresh   — Perbarui access token via refresh token
 *
 * Validasi input dilakukan di dalam controller menggunakan Zod.
 * Route ini tidak menggunakan validate middleware (sudah inline di controller).
 */
const router = Router();

// ─── Public Routes ────────────────────────────────────────────────

/** Daftar akun baru — validasi & error handling di controller */
router.post('/register', authController.register);

/** Login — return { accessToken, refreshToken, user } */
router.post('/login', authController.login);

/** Login atau daftar via Google OAuth — body: { accessToken: string } */
router.post('/google', authController.googleAuth);

/**
 * Perbarui access token menggunakan refresh token.
 * Body: { refreshToken: string }
 * Return: { accessToken: string, refreshToken: string } (rotasi refresh token)
 */
router.post('/refresh', authController.refreshToken);

// ─── Protected Routes (butuh access token yang valid) ─────────────

/**
 * Logout.
 * Header: Authorization: Bearer <accessToken>
 * Body: { refreshToken: string }
 */
router.post('/logout', authenticateToken, authController.logout);

/**
 * Profil user yang sedang login.
 * Header: Authorization: Bearer <accessToken>
 */
router.get('/profile', authenticateToken, authController.getProfile);

export default router;
