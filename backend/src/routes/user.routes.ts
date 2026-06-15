import { Router } from 'express';
import { z } from 'zod';
import * as userController from '../controllers/user.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { uploadSingle } from '../middleware/upload.middleware';

const router = Router();

// ─── Zod Schemas ──────────────────────────────────────────────────

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password saat ini tidak boleh kosong'),
  newPassword: z
    .string()
    .min(8, 'Password baru minimal 8 karakter')
    .regex(/[A-Z]/, 'Password harus mengandung huruf kapital')
    .regex(/\d/, 'Password harus mengandung angka'),
});

const changeRoleSchema = z.object({
  role: z.enum(['PUBLIC', 'VERIFIER', 'ADMIN'], {
    errorMap: () => ({ message: 'Role harus salah satu dari: PUBLIC, VERIFIER, ADMIN' }),
  }),
});

// ─── Routes ───────────────────────────────────────────────────────

/**
 * GET /api/v1/users
 * Ambil semua user — hanya ADMIN
 */
router.get('/', authenticateToken, requireRole('ADMIN'), userController.getUsers);

/**
 * PATCH /api/v1/users/:id/role
 * Ganti role user — hanya ADMIN
 */
router.patch(
  '/:id/role',
  authenticateToken,
  requireRole('ADMIN'),
  validate(changeRoleSchema),
  userController.changeUserRole,
);

/**
 * PATCH /api/v1/users/:id
 * Update profil user — hanya user itu sendiri atau ADMIN
 */
router.patch(
  '/:id',
  authenticateToken,
  validate(updateProfileSchema),
  userController.updateProfile,
);

/**
 * POST /api/v1/users/:id/avatar
 * Upload/ganti foto profil
 */
router.post(
  '/:id/avatar',
  authenticateToken,
  uploadSingle,
  userController.updateAvatar,
);

/**
 * PATCH /api/v1/users/:id/password
 * Ganti password
 */
router.patch(
  '/:id/password',
  authenticateToken,
  validate(changePasswordSchema),
  userController.changePassword,
);

export default router;
