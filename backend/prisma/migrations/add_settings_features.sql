-- ─── Settings Features Migration ──────────────────────────────────
-- Jalankan secara manual setelah add_field_verifier.sql:
--   psql -d <db> -f add_settings_features.sql
-- Lalu: npm run prisma:generate (hentikan dev server dulu)

-- 1. Tambah enum account_status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_status') THEN
    CREATE TYPE account_status AS ENUM ('active', 'disabled', 'banned');
  END IF;
END$$;

-- 2. Tambah kolom account_status ke tabel users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_status account_status NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_users_account_status
  ON users (account_status);

-- 3. Buat tabel audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id   VARCHAR(255),
  description TEXT,
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action     ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity     ON audit_logs (entity_type, entity_id);
