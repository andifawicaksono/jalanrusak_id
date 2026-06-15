-- ============================================================
-- Migration: Tambahkan Tabel roles dan Kolom role_id di users
--
-- Cara pakai:
--   psql $DATABASE_URL -f prisma/migrations/add_roles_table.sql
--
-- Setelah migrasi, jalankan seed untuk mengisi data roles:
--   npm run prisma:seed
-- ============================================================


-- ─── 1. Buat Tabel roles ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS roles (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description  TEXT,
  created_at   TIMESTAMP(6) DEFAULT NOW()
);

COMMENT ON TABLE roles IS 'Definisi role pengguna (Pelapor, Admin Verifikator, Super Admin)';


-- ─── 2. Isi Data Role Default ────────────────────────────────────

INSERT INTO roles (name, display_name, description)
VALUES
  ('PUBLIC',   'Pelapor',           'Pengguna umum yang dapat membuat dan melihat laporan kerusakan jalan'),
  ('VERIFIER', 'Admin Verifikator', 'Petugas yang dapat memverifikasi laporan dan mengubah status perbaikan'),
  ('ADMIN',    'Super Admin',       'Administrator penuh dengan akses ke seluruh fitur dan manajemen pengguna')
ON CONFLICT (name) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      description  = EXCLUDED.description;


-- ─── 3. Tambahkan Kolom role_id ke Tabel users ───────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL;


-- ─── 4. Sinkronisasi role_id dari Kolom role yang Sudah Ada ──────
-- Kolom users.role menyimpan lowercase ('public', 'verifier', 'admin')
-- karena Prisma @map; roles.name menyimpan uppercase ('PUBLIC', 'VERIFIER', 'ADMIN')

UPDATE users u
SET role_id = r.id
FROM roles r
WHERE UPPER(u.role::TEXT) = r.name
  AND u.role_id IS NULL;


-- ─── 5. Buat Index untuk role_id ─────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
