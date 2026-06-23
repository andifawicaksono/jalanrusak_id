import { Response } from 'express';
import { z } from 'zod';
import { Role, AccountStatus } from '@prisma/client';
import { AuthRequest } from '../types';
import * as userService from '../services/user.service';
import * as auditService from '../services/audit.service';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { nameSchema, emailSchema, passwordSchema, phoneSchema } from '../utils/user.schema';

// ─── Schemas ──────────────────────────────────────────────────────

const getUsersSchema = z.object({
  page:   z.coerce.number().int().min(1).optional().default(1),
  limit:  z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().max(100).trim().optional(),
  role:   z.nativeEnum(Role).optional(),
  status: z.nativeEnum(AccountStatus).optional(),
});

const createUserSchema = z.object({
  name:     nameSchema,
  email:    emailSchema,
  password: passwordSchema,
  role:     z.nativeEnum(Role).optional().default('PUBLIC'),
  phone:    phoneSchema,
});

const updateUserSchema = z.object({
  name:     nameSchema,
  email:    emailSchema,
  role:     z.nativeEnum(Role),
  phone:    phoneSchema,
  password: z.union([passwordSchema, z.literal('')]).optional(),
});

const changeRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

const changeStatusSchema = z.object({
  status: z.nativeEnum(AccountStatus),
});

const getAuditLogsSchema = z.object({
  page:     z.coerce.number().int().min(1).optional().default(1),
  limit:    z.coerce.number().int().min(1).max(100).optional().default(20),
  search:   z.string().max(100).trim().optional(),
  action:   z.string().max(50).trim().optional(),
  role:     z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo:   z.string().optional(),
});

// ─── Helper ───────────────────────────────────────────────────────

function getClientIP(req: AuthRequest): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]).trim();
  return req.socket?.remoteAddress ?? null;
}

function getUserAgent(req: AuthRequest): string | null {
  return req.headers['user-agent'] ?? null;
}

// ─── Stats ────────────────────────────────────────────────────────

/**
 * GET /api/v1/settings/stats
 * Statistik ringkasan user — hanya ADMIN.
 */
export async function getStats(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const stats = await userService.getAdminStats();
    sendSuccess(res, stats, 'Statistik berhasil diambil');
  } catch (error) {
    console.error('[getStats]', error);
    sendError(res, 'Gagal mengambil statistik', 500);
  }
}

// ─── User Management ──────────────────────────────────────────────

/**
 * GET /api/v1/settings/users
 * Daftar user dengan pagination server-side, pencarian, dan filter.
 */
export async function getUsers(req: AuthRequest, res: Response): Promise<void> {
  const parsed = getUsersSchema.safeParse(req.query);
  if (!parsed.success) {
    sendError(res, 'Parameter tidak valid', 422);
    return;
  }

  try {
    const result = await userService.getUsersPage(parsed.data);
    sendPaginated(res, result.users, result.meta, 'Daftar user berhasil diambil');
  } catch (error) {
    console.error('[settings.getUsers]', error);
    sendError(res, 'Gagal mengambil daftar user', 500);
  }
}

/**
 * POST /api/v1/settings/users
 * Buat user baru secara manual oleh ADMIN.
 */
export async function createUser(req: AuthRequest, res: Response): Promise<void> {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Data tidak valid', details: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const user = await userService.createUser(parsed.data);
    void auditService.createLog({
      userId:      req.user!.userId,
      action:      auditService.AUDIT_ACTION.USER_CREATE,
      entityType:  'user',
      entityId:    user.id,
      description: `Admin membuat akun baru: ${user.email} (${user.role})`,
      ipAddress:   getClientIP(req),
      userAgent:   getUserAgent(req),
    });
    res.status(201).json({ success: true, message: 'User berhasil dibuat', data: user });
  } catch (error) {
    if (error instanceof Error && error.message.includes('sudah terdaftar')) {
      sendError(res, error.message, 409);
      return;
    }
    console.error('[settings.createUser]', error);
    sendError(res, 'Gagal membuat user', 500);
  }
}

/**
 * PATCH /api/v1/settings/users/:id
 * Edit data user (nama, email, role, phone, password opsional) — hanya ADMIN.
 */
export async function updateUser(req: AuthRequest, res: Response): Promise<void> {
  const targetId = req.params['id'] as string;

  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: 'Data tidak valid', details: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const { password, ...rest } = parsed.data;
    const updated = await userService.updateUser(targetId, {
      ...rest,
      password: password && password.length > 0 ? password : undefined,
    });

    if (!updated) {
      sendError(res, 'User tidak ditemukan', 404);
      return;
    }

    void auditService.createLog({
      userId:      req.user!.userId,
      action:      auditService.AUDIT_ACTION.USER_UPDATE_ROLE,
      entityType:  'user',
      entityId:    targetId,
      description: `Data user ${updated.email} diperbarui oleh admin`,
      ipAddress:   getClientIP(req),
      userAgent:   getUserAgent(req),
    });

    sendSuccess(res, updated, 'Data user berhasil diperbarui');
  } catch (error) {
    if (error instanceof Error && error.message.includes('sudah digunakan')) {
      sendError(res, error.message, 409);
      return;
    }
    console.error('[settings.updateUser]', error);
    sendError(res, 'Gagal memperbarui data user', 500);
  }
}

/**
 * PATCH /api/v1/settings/users/:id/role
 * Ubah role user — hanya ADMIN, tidak bisa ubah diri sendiri.
 */
export async function changeUserRole(req: AuthRequest, res: Response): Promise<void> {
  const targetId = req.params['id'] as string;

  if (targetId === req.user!.userId) {
    sendError(res, 'Tidak dapat mengubah role akun Anda sendiri', 403);
    return;
  }

  const parsed = changeRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Role tidak valid', 422);
    return;
  }

  try {
    const updated = await userService.changeUserRole(targetId, parsed.data.role);
    if (!updated) {
      sendError(res, 'User tidak ditemukan', 404);
      return;
    }
    void auditService.createLog({
      userId:      req.user!.userId,
      action:      auditService.AUDIT_ACTION.USER_UPDATE_ROLE,
      entityType:  'user',
      entityId:    targetId,
      description: `Role diubah menjadi ${parsed.data.role} untuk user ${updated.email}`,
      ipAddress:   getClientIP(req),
      userAgent:   getUserAgent(req),
    });
    sendSuccess(res, updated, 'Role user berhasil diubah');
  } catch (error) {
    console.error('[settings.changeUserRole]', error);
    sendError(res, 'Gagal mengubah role user', 500);
  }
}

/**
 * PATCH /api/v1/settings/users/:id/status
 * Ubah status akun: ACTIVE / DISABLED / BANNED — hanya ADMIN.
 */
export async function changeUserStatus(req: AuthRequest, res: Response): Promise<void> {
  const targetId = req.params['id'] as string;

  if (targetId === req.user!.userId) {
    sendError(res, 'Tidak dapat mengubah status akun Anda sendiri', 403);
    return;
  }

  const parsed = changeStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Status tidak valid. Pilih: ACTIVE, DISABLED, atau BANNED', 422);
    return;
  }

  try {
    const updated = await userService.changeAccountStatus(targetId, parsed.data.status);
    if (!updated) {
      sendError(res, 'User tidak ditemukan', 404);
      return;
    }

    const actionMap: Record<AccountStatus, auditService.AuditAction> = {
      ACTIVE:   auditService.AUDIT_ACTION.USER_ENABLE,
      DISABLED: auditService.AUDIT_ACTION.USER_DISABLE,
      BANNED:   auditService.AUDIT_ACTION.USER_BAN,
    };
    void auditService.createLog({
      userId:      req.user!.userId,
      action:      actionMap[parsed.data.status],
      entityType:  'user',
      entityId:    targetId,
      description: `Status akun ${updated.email} diubah menjadi ${parsed.data.status}`,
      ipAddress:   getClientIP(req),
      userAgent:   getUserAgent(req),
    });

    sendSuccess(res, updated, 'Status akun berhasil diubah');
  } catch (error) {
    console.error('[settings.changeUserStatus]', error);
    sendError(res, 'Gagal mengubah status akun', 500);
  }
}

// ─── Audit Logs ───────────────────────────────────────────────────

/**
 * GET /api/v1/settings/audit-logs
 * Daftar audit log — read-only, hanya ADMIN.
 */
export async function getAuditLogs(req: AuthRequest, res: Response): Promise<void> {
  const parsed = getAuditLogsSchema.safeParse(req.query);
  if (!parsed.success) {
    sendError(res, 'Parameter tidak valid', 422);
    return;
  }

  try {
    const result = await auditService.getLogs(parsed.data);
    sendPaginated(res, result.logs, result.meta, 'Audit log berhasil diambil');
  } catch (error) {
    console.error('[settings.getAuditLogs]', error);
    sendError(res, 'Gagal mengambil audit log', 500);
  }
}
