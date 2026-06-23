import bcrypt from 'bcryptjs';
import { PrismaClient, Role, AccountStatus, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/** Field aman untuk dikembalikan (tanpa password) */
const USER_SAFE_FIELDS = {
  id:            true,
  email:         true,
  name:          true,
  role:          true,
  roleInfo:      true,
  avatarUrl:     true,
  phone:         true,
  accountStatus: true,
  isActive:      true,
  createdAt:     true,
  updatedAt:     true,
};

/** Ambil semua user (untuk admin) */
export async function getAllUsers() {
  return prisma.user.findMany({
    select: {
      ...USER_SAFE_FIELDS,
      _count: { select: { reports: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── getUsersPage (server-side pagination) ────────────────────────

export interface GetUsersPageInput {
  page:    number;
  limit:   number;
  search?: string;
  role?:   Role;
  status?: AccountStatus;
}

/** Daftar user dengan pagination server-side, pencarian, dan filter */
export async function getUsersPage(input: GetUsersPageInput) {
  const { page, limit, search, role, status } = input;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {
    ...(role   && { role }),
    ...(status && { accountStatus: status }),
    ...(search && {
      OR: [
        { name:  { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: {
        ...USER_SAFE_FIELDS,
        lastLoginAt: true,
        _count: { select: { reports: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { users, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

// ─── getAdminStats ────────────────────────────────────────────────

/** Statistik user untuk halaman overview Settings */
export async function getAdminStats() {
  const [byRole, byStatus] = await Promise.all([
    prisma.user.groupBy({ by: ['role'],          _count: { id: true } }),
    prisma.user.groupBy({ by: ['accountStatus'], _count: { id: true } }),
  ]);

  const roleMap   = Object.fromEntries(byRole.map((r)   => [r.role,          r._count.id]));
  const statusMap = Object.fromEntries(byStatus.map((s) => [s.accountStatus, s._count.id]));

  return {
    total:          (Object.values(roleMap) as number[]).reduce((a, b) => a + b, 0),
    byRole: {
      pelapor:       roleMap['PUBLIC']         ?? 0,
      verifier:      roleMap['VERIFIER']       ?? 0,
      fieldVerifier: roleMap['FIELD_VERIFIER'] ?? 0,
      admin:         roleMap['ADMIN']          ?? 0,
    },
    byStatus: {
      active:   statusMap['ACTIVE']   ?? 0,
      disabled: statusMap['DISABLED'] ?? 0,
      banned:   statusMap['BANNED']   ?? 0,
    },
  };
}

// ─── changeAccountStatus ──────────────────────────────────────────

/** Ubah status akun user (ACTIVE / DISABLED / BANNED) — hanya ADMIN */
export async function changeAccountStatus(userId: string, newStatus: AccountStatus) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return null;

  return prisma.user.update({
    where: { id: userId },
    data:  { accountStatus: newStatus },
    select: USER_SAFE_FIELDS,
  });
}

// ─── createUser (admin manual creation) ──────────────────────────

export interface CreateUserInput {
  name:     string;
  email:    string;
  password: string;
  role?:    Role;
  phone?:   string;
}

/** Buat user baru secara manual oleh ADMIN */
export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw new Error(`Email ${input.email} sudah terdaftar`);

  const passwordHash = await bcrypt.hash(input.password, 12);
  const role = input.role ?? 'PUBLIC';
  const roleDefinition = await prisma.appRole.findUnique({ where: { name: role } });

  return prisma.user.create({
    data: {
      name:         input.name,
      email:        input.email,
      passwordHash,
      phone:        input.phone ?? null,
      role,
      roleId:       roleDefinition?.id ?? null,
    },
    select: USER_SAFE_FIELDS,
  });
}

export interface UpdateUserInput {
  name:      string;
  email:     string;
  role:      Role;
  phone?:    string;
  password?: string;
}

/**
 * Edit data user oleh ADMIN.
 * Password opsional — jika diisi, di-hash dan disimpan.
 * Email harus unik di antara user lain.
 */
export async function updateUser(userId: string, input: UpdateUserInput) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return null;

  if (input.email) {
    const conflict = await prisma.user.findFirst({
      where: { email: input.email, NOT: { id: userId } },
      select: { id: true },
    });
    if (conflict) throw new Error(`Email ${input.email} sudah digunakan oleh user lain`);
  }

  const roleDefinition = await prisma.appRole.findUnique({ where: { name: input.role } });

  const data: Parameters<typeof prisma.user.update>[0]['data'] = {
    name:   input.name,
    email:  input.email,
    phone:  input.phone ?? null,
    role:   input.role,
    roleId: roleDefinition?.id ?? null,
  };

  if (input.password) {
    data.passwordHash = await bcrypt.hash(input.password, 12);
  }

  return prisma.user.update({
    where:  { id: userId },
    data,
    select: USER_SAFE_FIELDS,
  });
}

/** Ambil satu user berdasarkan ID */
export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: USER_SAFE_FIELDS,
  });
}

interface UpdateProfileInput {
  name?: string;
  phone?: string;
}

/** Update nama dan/atau nomor telepon user */
export async function updateProfile(userId: string, data: UpdateProfileInput) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: USER_SAFE_FIELDS,
  });
}

/** Update URL avatar user */
export async function updateAvatar(userId: string, avatarUrl: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
    select: USER_SAFE_FIELDS,
  });
}

/**
 * Ganti password user.
 * Verifikasi password lama sebelum mengganti untuk keamanan.
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User tidak ditemukan');

  if (!user.passwordHash) {
    throw new Error('Akun ini menggunakan login Google dan tidak memiliki password lokal');
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new Error('Password saat ini tidak sesuai');
  }

  const hashedNew = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashedNew },
  });
}

/**
 * Ganti role user — hanya bisa dilakukan oleh ADMIN.
 * Mengupdate dua kolom sekaligus: role (enum) dan roleId (FK ke tabel roles).
 */
export async function changeUserRole(userId: string, newRole: Role) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return null;

  // Cari RoleDefinition yang sesuai agar FK role_id tetap sinkron
  const roleDefinition = await prisma.appRole.findUnique({ where: { name: newRole } });

  return prisma.user.update({
    where: { id: userId },
    data: {
      role: newRole,
      roleId: roleDefinition?.id ?? null,
    },
    select: USER_SAFE_FIELDS,
  });
}
