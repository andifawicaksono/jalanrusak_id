import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Field aman untuk dikembalikan (tanpa password) */
const USER_SAFE_FIELDS = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatarUrl: true,
  phone: true,
  createdAt: true,
  updatedAt: true,
};

/** Ambil semua user (untuk admin) */
export async function getAllUsers() {
  return prisma.user.findMany({
    select: {
      ...USER_SAFE_FIELDS,
      _count: { select: { reports: true } }, // Tambahkan jumlah laporan tiap user
    },
    orderBy: { createdAt: 'desc' },
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

  // Verifikasi password lama
  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new Error('Password saat ini tidak sesuai');
  }

  // Hash password baru sebelum disimpan
  const hashedNew = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashedNew },
  });
}
