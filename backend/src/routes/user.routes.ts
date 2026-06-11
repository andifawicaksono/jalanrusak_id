import { Router } from 'express';
import { z } from 'zod';
import * as userController from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { uploadSingle } from '../middleware/upload.middleware';

const router = Router();

// ─── Zod Schemas ──────────────────────────────────────────────────

/** Schema validasi update profil (semua field opsional) */
const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
});

/** Schema validasi ganti password */
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password saat ini tidak boleh kosong'),
  newPassword: z
    .string()
    .min(8, 'Password baru minimal 8 karakter')
    .regex(/[A-Z]/, 'Password harus mengandung huruf kapital')
    .regex(/[0-9]/, 'Password harus mengandung angka'),
});

// ─── Routes ───────────────────────────────────────────────────────

/**
 * GET /api/v1/users
 * Ambil semua user — hanya ADMIN
 */
router.get('/', authenticate, authorize('ADMIN'), userController.getUsers);

/**
 * PATCH /api/v1/users/:id
 * Update profil user — hanya user itu sendiri atau ADMIN
 */
router.patch(
  '/:id',
  authenticate,
  validate(updateProfileSchema),
  userController.updateProfile,
);

/**
 * POST /api/v1/users/:id/avatar
 * Upload/ganti foto profil
 */
router.post(
  '/:id/avatar',
  authenticate,
  uploadSingle, // Upload satu foto (field 'photo')
  userController.updateAvatar,
);

/**
 * PATCH /api/v1/users/:id/password
 * Ganti password
 */
router.patch(
  '/:id/password',
  authenticate,
  validate(changePasswordSchema),
  userController.changePassword,
);

export default router;
