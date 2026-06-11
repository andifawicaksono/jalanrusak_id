import bcrypt from 'bcryptjs';

/**
 * Jumlah salt rounds untuk bcrypt.
 * 12 adalah sweet spot antara keamanan dan performa (±250ms di hardware modern).
 * Naikkan ke 14-15 untuk security kritis, tapi ini akan memperlambat login.
 */
const SALT_ROUNDS = 12;

/**
 * Hash password dengan bcrypt.
 * SELALU gunakan fungsi ini — jangan pernah simpan plain text password.
 *
 * Bcrypt otomatis menambahkan salt unik per hash, sehingga
 * dua hash dari password yang sama akan berbeda.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Bandingkan plain text password dengan hash yang tersimpan di DB.
 * Timing-safe — tidak rentan terhadap timing attack.
 *
 * Return true jika cocok, false jika tidak.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
