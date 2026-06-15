import { Response } from 'express';
import { Role } from '@prisma/client';
import * as userService from '../services/user.service';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../types';
import { storageProvider } from '../utils/storage';

/**
 * GET /api/v1/users
 * Ambil semua user — hanya ADMIN.
 */
export async function getUsers(_req: AuthRequest, res: Response): Promise<void> {
  const users = await userService.getAllUsers();
  sendSuccess(res, users, 'Daftar user berhasil diambil');
}

/**
 * PATCH /api/v1/users/:id
 * Update nama/telepon profil user. User hanya bisa update profil sendiri, kecuali admin.
 */
export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  const targetId = req.params['id'] as string;
  const requesterId = req.user!.userId;
  const isAdmin = req.user!.role === 'ADMIN';

  // User biasa hanya boleh update profil milik sendiri
  if (targetId !== requesterId && !isAdmin) {
    sendError(res, 'Anda tidak memiliki izin untuk mengubah profil ini', 403);
    return;
  }

  const updated = await userService.updateProfile(targetId, req.body);
  sendSuccess(res, updated, 'Profil berhasil diupdate');
}

/**
 * POST /api/v1/users/:id/avatar
 * Upload foto profil baru. Foto lama dihapus otomatis.
 */
export async function updateAvatar(req: AuthRequest, res: Response): Promise<void> {
  const targetId = req.params['id'] as string;
  const requesterId = req.user!.userId;
  const isAdmin = req.user!.role === 'ADMIN';

  if (targetId !== requesterId && !isAdmin) {
    sendError(res, 'Anda tidak memiliki izin untuk mengubah avatar ini', 403);
    return;
  }

  if (!req.file) {
    sendError(res, 'File foto tidak ditemukan', 400);
    return;
  }

  // Simpan foto baru dan dapatkan URL-nya
  const avatarUrl = await storageProvider.saveFile(req.file);

  // Hapus foto lama jika ada (agar tidak menumpuk di storage)
  const oldUser = await userService.getUserById(targetId);
  if (oldUser?.avatarUrl) {
    const oldFilename = oldUser.avatarUrl.split('/').pop();
    if (oldFilename) {
      await storageProvider.deleteFile(oldFilename).catch(() => {
        // Abaikan error penghapusan file lama — tidak kritikal
      });
    }
  }

  const updated = await userService.updateAvatar(targetId, avatarUrl);
  sendSuccess(res, updated, 'Avatar berhasil diupdate');
}

/**
 * PATCH /api/v1/users/:id/role
 * Ganti role user — hanya ADMIN.
 * Body: { role: 'PUBLIC' | 'VERIFIER' | 'ADMIN' }
 */
export async function changeUserRole(req: AuthRequest, res: Response): Promise<void> {
  const targetId = req.params['id'] as string;
  const { role } = req.body as { role: string };

  const VALID_ROLES: string[] = ['PUBLIC', 'VERIFIER', 'ADMIN'];
  if (!role || !VALID_ROLES.includes(role)) {
    sendError(res, 'Role tidak valid. Pilih: PUBLIC, VERIFIER, atau ADMIN', 400);
    return;
  }

  const updated = await userService.changeUserRole(targetId, role as Role);
  if (!updated) {
    sendError(res, 'User tidak ditemukan', 404);
    return;
  }

  sendSuccess(res, updated, 'Role user berhasil diubah');
}

/**
 * PATCH /api/v1/users/:id/password
 * Ganti password. Verifikasi password lama sebelum mengganti.
 */
export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  const targetId = req.params['id'] as string;
  const requesterId = req.user!.userId;

  // User hanya boleh ganti password sendiri
  if (targetId !== requesterId) {
    sendError(res, 'Anda tidak memiliki izin untuk mengubah password ini', 403);
    return;
  }

  try {
    await userService.changePassword(targetId, req.body.currentPassword, req.body.newPassword);
    sendSuccess(res, null, 'Password berhasil diubah');
  } catch (error) {
    if (error instanceof Error && error.message.includes('tidak sesuai')) {
      sendError(res, error.message, 400);
      return;
    }
    throw error;
  }
}
