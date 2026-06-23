-- Tambah role baru Verifikator Lapangan ke enum user_role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'field_verifier';

-- Tambah kolom status_history_id ke tabel foto untuk menghubungkan foto bukti pekerjaan
-- dengan entri riwayat status (IN_PROGRESS / RESOLVED)
ALTER TABLE report_photos
  ADD COLUMN IF NOT EXISTS status_history_id UUID
    REFERENCES report_status_history(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_photos_status_history_id
  ON report_photos (status_history_id)
  WHERE status_history_id IS NOT NULL;
