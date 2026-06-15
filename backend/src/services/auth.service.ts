import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/jwt.util';
import { hashPassword, comparePassword } from '../utils/password.util';
import { UserRole } from '../types';

const prisma = new PrismaClient();

// ─── Konstanta ────────────────────────────────────────────────────

/** Field user yang aman dikembalikan ke client — TIDAK termasuk passwordHash */
const USER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  roleInfo: true,
  phone: true,
  avatarUrl: true,
  isActive: true,
  isVerified: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** TTL refresh token dalam milidetik (7 hari) */
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ─── Internal Helpers ─────────────────────────────────────────────

/**
 * Hash token dengan SHA-256 sebelum disimpan ke database.
 * Jika DB bocor, penyerang tidak bisa menggunakan hash langsung —
 * mereka butuh raw token yang hanya ada di client.
 */
function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ─── Register ─────────────────────────────────────────────────────

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

/**
 * Daftarkan user baru.
 * Setelah register langsung return access token agar user tidak perlu login ulang.
 * Refresh token tidak dibuat di sini — user login eksplisit untuk mendapatkannya.
 */
export async function register(input: RegisterInput) {
  // Cek duplikasi email SEBELUM hashing (hashing mahal, hindari jika tidak perlu)
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    throw new Error(`Email ${input.email} sudah terdaftar`);
  }

  const passwordHash = await hashPassword(input.password);

  // Cari role Pelapor (PUBLIC) untuk di-assign ke user baru
  const pelagorRole = await prisma.appRole.findUnique({ where: { name: 'PUBLIC' } });

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      phone: input.phone ?? null,
      // role enum default PUBLIC (dari schema); roleId diisi jika tabel roles sudah ada
      ...(pelagorRole ? { roleId: pelagorRole.id } : {}),
    },
    select: USER_SAFE_SELECT,
  });

  // Access token langsung — tanpa session, user tetap harus login untuk dapat refresh token
  const accessToken = generateAccessToken(user.id, user.role as UserRole);

  return { user, accessToken };
}

// ─── Login ────────────────────────────────────────────────────────

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginMeta {
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Login user.
 *
 * Alur keamanan:
 *   1. Cari user by email — jika tidak ada, tetap jalankan comparePassword
 *      dengan dummy hash untuk mencegah timing attack (waktu respons seragam)
 *   2. Compare password — gunakan pesan generik agar tidak bocor info email
 *   3. Cek isActive setelah password valid (bukan sebelum — hindari user enumeration)
 *   4. Buat session di DB dengan hash refresh token
 *   5. Update lastLoginAt
 */
export async function login(input: LoginInput, meta: LoginMeta) {
  // Dummy hash untuk timing-safe comparison jika user tidak ditemukan
  const DUMMY_HASH = '$2a$12$dummyhashfortimingsafety.thisisnotarealpasswordhash';

  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Selalu jalankan compare — jangan return early sebelum compare
  const isValid = await comparePassword(
    input.password,
    user?.passwordHash ?? DUMMY_HASH,
  );

  if (!user || !isValid) {
    // Pesan generik — jangan beri tahu apakah email ada atau tidak
    throw new Error('Email atau password tidak valid');
  }

  if (!user.isActive) {
    // Cek isActive SETELAH verifikasi password — jangan bocorkan status akun sebelum auth
    throw new Error('Akun Anda telah dinonaktifkan. Hubungi administrator.');
  }

  // Generate kedua token
  const accessToken = generateAccessToken(user.id, user.role as UserRole);
  const refreshToken = generateRefreshToken(user.id);

  // Simpan session dan update lastLoginAt secara paralel untuk efisiensi
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await Promise.all([
    prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashRefreshToken(refreshToken),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        expiresAt,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
  ]);

  // Bangun objek user safe secara manual — menghindari spread dari Prisma result yang ada passwordHash
  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
    isVerified: user.isVerified,
    lastLoginAt: new Date(),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return { user: safeUser, accessToken, refreshToken };
}

// ─── Logout ───────────────────────────────────────────────────────

/**
 * Logout: hapus session dari database berdasarkan refresh token.
 * Access token tidak bisa di-invalidate (stateless JWT) — ia akan tetap
 * valid sampai expire (1 jam). Untuk invalidasi cepat, implementasikan
 * token blocklist di Redis.
 */
export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = hashRefreshToken(refreshToken);
  // deleteMany tidak throw jika tidak ada record yang dihapus — aman
  await prisma.session.deleteMany({ where: { tokenHash } });
}

// ─── Get User by ID ───────────────────────────────────────────────

/** Ambil data user berdasarkan ID, tanpa field sensitif */
export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: USER_SAFE_SELECT,
  });
}

// ─── Refresh Access Token ─────────────────────────────────────────

/**
 * Tukar refresh token dengan access token baru.
 *
 * Alur:
 *   1. Verifikasi JWT signature refresh token
 *   2. Hash dan cari di tabel sessions — jika tidak ada, token sudah di-logout atau dicuri
 *   3. Cek expiresAt session (double-check, JWT juga sudah cek)
 *   4. Ambil role terbaru dari DB — perubahan role langsung berlaku
 *   5. Rotasi refresh token: hapus session lama, buat session baru
 *      Ini mencegah refresh token reuse attack (token lama tidak bisa dipakai lagi)
 */
export async function refreshAccessToken(refreshToken: string) {
  // Step 1: Verifikasi JWT
  let payload;
  try {
    payload = verifyToken(refreshToken, 'refresh');
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof JsonWebTokenError) {
      throw new Error('Refresh token tidak valid');
    }
    throw error;
  }

  // Step 2: Cek session di DB
  const tokenHash = hashRefreshToken(refreshToken);
  const session = await prisma.session.findUnique({ where: { tokenHash } });

  if (!session) {
    // Token tidak ada di DB = sudah logout atau token reuse attack
    throw new Error('Refresh token tidak valid atau sudah digunakan');
  }

  // Step 3: Cek expiry di DB (defense in depth)
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { tokenHash } });
    throw new Error('Token expired');
  }

  // Step 4: Ambil data user terbaru (role, isActive bisa berubah)
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true, isActive: true },
  });

  if (!user?.isActive) {
    await prisma.session.delete({ where: { tokenHash } });
    throw new Error('Akun tidak ditemukan atau tidak aktif');
  }

  // Step 5: Rotasi refresh token — hapus lama, buat baru
  const newRefreshToken = generateRefreshToken(user.id);
  const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.$transaction([
    prisma.session.delete({ where: { tokenHash } }),
    prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashRefreshToken(newRefreshToken),
        ipAddress: session.ipAddress, // Pertahankan IP dari session sebelumnya
        userAgent: session.userAgent,
        expiresAt: newExpiresAt,
      },
    }),
  ]);

  const accessToken = generateAccessToken(user.id, user.role as UserRole);

  return { accessToken, refreshToken: newRefreshToken };
}
