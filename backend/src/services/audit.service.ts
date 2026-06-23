import { PrismaClient, Prisma, Role } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Action Constants ─────────────────────────────────────────────

export const AUDIT_ACTION = {
  // Authentication
  AUTH_LOGIN:         'AUTH_LOGIN',
  AUTH_LOGOUT:        'AUTH_LOGOUT',
  AUTH_REGISTER:      'AUTH_REGISTER',
  AUTH_GOOGLE_LOGIN:  'AUTH_GOOGLE_LOGIN',

  // User management
  USER_CREATE:        'USER_CREATE',
  USER_UPDATE:        'USER_UPDATE',
  USER_UPDATE_ROLE:   'USER_UPDATE_ROLE',
  USER_DISABLE:       'USER_DISABLE',
  USER_ENABLE:        'USER_ENABLE',
  USER_BAN:           'USER_BAN',

  // Report management
  REPORT_CREATE:      'REPORT_CREATE',
  REPORT_UPDATE:      'REPORT_UPDATE',
  REPORT_DELETE:      'REPORT_DELETE',
  REPORT_VERIFY:      'REPORT_VERIFY',
  REPORT_REJECT:      'REPORT_REJECT',
  REPORT_IN_PROGRESS: 'REPORT_IN_PROGRESS',
  REPORT_RESOLVED:    'REPORT_RESOLVED',

  // System
  SYSTEM_CONFIG:      'SYSTEM_CONFIG',
  SYSTEM_ROLE_CHANGE: 'SYSTEM_ROLE_CHANGE',
} as const;

export type AuditAction = typeof AUDIT_ACTION[keyof typeof AUDIT_ACTION];

// ─── createLog ────────────────────────────────────────────────────

export interface CreateAuditLogInput {
  userId?:      string | null;
  action:       AuditAction | string;
  entityType?:  string;
  entityId?:    string;
  description:  string;
  ipAddress?:   string | null;
  userAgent?:   string | null;
}

/**
 * Buat entri audit log — fire-and-forget, jangan await di caller kritikal.
 * Penggunaan: void createLog({ ... });
 */
export async function createLog(input: CreateAuditLogInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId:      input.userId ?? null,
      action:      input.action,
      entityType:  input.entityType ?? null,
      entityId:    input.entityId ?? null,
      description: input.description,
      ipAddress:   input.ipAddress ?? null,
      userAgent:   input.userAgent ?? null,
    },
  });
}

// ─── getLogs ──────────────────────────────────────────────────────

export interface GetAuditLogsInput {
  page:        number;
  limit:       number;
  search?:     string;
  action?:     string;
  role?:       string;
  dateFrom?:   string;
  dateTo?:     string;
}

/**
 * Daftar audit log dengan pagination, pencarian, dan filter.
 * Dipakai oleh endpoint GET /settings/audit-logs — hanya ADMIN.
 */
export async function getLogs(input: GetAuditLogsInput) {
  const { page, limit, search, action, role, dateFrom, dateTo } = input;
  const skip = (page - 1) * limit;

  // Build user-related sub-filter for join
  const userWhere: Prisma.UserWhereInput | undefined = (search || role)
    ? {
        ...(search && {
          OR: [
            { name:  { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(role && { role: { equals: role as Role } }),
      }
    : undefined;

  const where: Prisma.AuditLogWhereInput = {
    ...(action && { action }),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo   && { lte: new Date(new Date(dateTo).setHours(23, 59, 59, 999)) }),
          },
        }
      : {}),
    ...(userWhere && { user: userWhere }),
    // Also search by action keyword if search is provided
    ...(search && !userWhere
      ? { action: { contains: search, mode: 'insensitive' as const } }
      : {}),
  };

  // Merge action filter into search if both provided
  const finalWhere: Prisma.AuditLogWhereInput = {
    ...(action && { action }),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo   && { lte: new Date(new Date(dateTo).setHours(23, 59, 59, 999)) }),
          },
        }
      : {}),
    ...(search && {
      OR: [
        { user: { name:  { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { action:      { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(role && { user: { role: { equals: role as Role } } }),
  };

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where: finalWhere }),
    prisma.auditLog.findMany({
      where: finalWhere,
      skip,
      take:  limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id:          true,
        action:      true,
        entityType:  true,
        entityId:    true,
        description: true,
        ipAddress:   true,
        createdAt:   true,
        user: {
          select: {
            id:    true,
            name:  true,
            email: true,
            role:  true,
          },
        },
      },
    }),
  ]);

  return {
    logs,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
