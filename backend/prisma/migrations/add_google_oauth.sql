-- Migration: Add Google OAuth support
-- Jalankan: psql -U postgres -d jalanrusak -f add_google_oauth.sql

-- 1. Buat enum auth_provider
CREATE TYPE auth_provider AS ENUM ('local', 'google');

-- 2. Tambah kolom ke tabel users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS provider     auth_provider NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS provider_id  VARCHAR(255),
  ALTER COLUMN password_hash DROP NOT NULL;

-- 3. Index untuk lookup Google ID
CREATE INDEX IF NOT EXISTS idx_users_provider_id ON users (provider_id) WHERE provider_id IS NOT NULL;
