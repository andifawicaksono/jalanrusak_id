-- ============================================================
-- Migration: PostGIS Geometry & Auto Report Number
-- Jalankan SETELAH `prisma migrate dev` selesai membuat tabel
--
-- Cara pakai:
--   psql $DATABASE_URL -f prisma/migrations/add_postgis_geometry.sql
-- ============================================================


-- ─── 1. Aktifkan Ekstensi PostGIS ────────────────────────────────
-- Butuh superuser atau role yang punya privilege CREATE EXTENSION.
-- Di managed DB (RDS, Supabase, dll) aktifkan via UI/console terlebih dahulu.

CREATE EXTENSION IF NOT EXISTS postgis;


-- ─── 2. Tambahkan Kolom Geometry ke Tabel reports ────────────────
-- Tipe geometry(Point, 4326): titik geografis dengan SRID 4326 (WGS84 / GPS)
-- NULLABLE karena data lama mungkin belum punya koordinat valid

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS location geometry(Point, 4326);


-- ─── 3. Isi Kolom location dari Data latitude/longitude yang Ada ──
-- ST_MakePoint(longitude, latitude) — PERHATIKAN URUTAN: X (lng) dulu, baru Y (lat)
-- ST_SetSRID menetapkan SRID agar PostGIS tahu sistem koordinat yang dipakai

UPDATE reports
SET location = ST_SetSRID(
                 ST_MakePoint(longitude, latitude),
                 4326
               )
WHERE latitude  IS NOT NULL
  AND longitude IS NOT NULL
  AND latitude  BETWEEN -90  AND 90   -- Validasi range koordinat GPS
  AND longitude BETWEEN -180 AND 180;


-- ─── 4. Buat GIST Index untuk Query Spatial ──────────────────────
-- Index GIST jauh lebih efisien daripada B-Tree untuk data geometri.
-- Dibutuhkan oleh fungsi ST_DWithin, ST_Contains, ST_Intersects, dll.
-- CONCURRENTLY: index dibuat tanpa mengunci tabel (aman di production)

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_location
  ON reports USING GIST(location);


-- ─── 5. Fungsi Generate Report Number ────────────────────────────
-- Format: RPT-YYYYMMDD-XXXX (contoh: RPT-20250610-0042)
-- Menggunakan locking per-tanggal untuk menghindari race condition
-- pada INSERT bersamaan.

CREATE OR REPLACE FUNCTION generate_report_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_date    TEXT;
  v_seq     INT;
  v_result  TEXT;
BEGIN
  -- Format tanggal hari ini sebagai YYYYMMDD
  v_date := TO_CHAR(NOW(), 'YYYYMMDD');

  -- Hitung jumlah laporan yang sudah ada hari ini (advisory lock untuk serialisasi)
  PERFORM pg_advisory_xact_lock(hashtext(v_date));

  SELECT COUNT(*) + 1
  INTO   v_seq
  FROM   reports
  WHERE  report_number LIKE 'RPT-' || v_date || '-%';

  -- Gabungkan: RPT-20250610-0042
  v_result := 'RPT-' || v_date || '-' || LPAD(v_seq::TEXT, 4, '0');

  RETURN v_result;
END;
$$;


-- ─── 6. Trigger: Set report_number Otomatis saat INSERT ──────────
-- Trigger ini berjalan BEFORE INSERT agar report_number sudah terisi
-- sebelum baris disimpan ke tabel.

CREATE OR REPLACE FUNCTION set_report_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Hanya generate jika report_number belum diisi (NULL atau string kosong)
  IF NEW.report_number IS NULL OR NEW.report_number = '' THEN
    NEW.report_number := generate_report_number();
  END IF;
  RETURN NEW;
END;
$$;

-- Hapus trigger lama dulu jika ada (idempoten — aman dijalankan ulang)
DROP TRIGGER IF EXISTS trg_set_report_number ON reports;

CREATE TRIGGER trg_set_report_number
  BEFORE INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION set_report_number();


-- ─── 7. Trigger: Sinkronisasi Kolom location saat INSERT/UPDATE ──
-- Menjaga kolom location selalu sinkron dengan latitude/longitude.
-- Berguna ketika ada update koordinat via Prisma (yang tidak tahu kolom geometry).

CREATE OR REPLACE FUNCTION sync_report_location()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update location jika latitude atau longitude berubah
  IF (NEW.latitude  IS DISTINCT FROM OLD.latitude) OR
     (NEW.longitude IS DISTINCT FROM OLD.longitude) OR
     (TG_OP = 'INSERT') THEN

    IF NEW.latitude  IS NOT NULL AND NEW.longitude IS NOT NULL
    AND NEW.latitude  BETWEEN -90  AND 90
    AND NEW.longitude BETWEEN -180 AND 180 THEN
      NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    ELSE
      NEW.location := NULL; -- Koordinat tidak valid → kosongkan
    END IF;

  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_report_location ON reports;

CREATE TRIGGER trg_sync_report_location
  BEFORE INSERT OR UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION sync_report_location();


-- ─── 8. Helper Views untuk Query Spatial Umum ────────────────────

-- View laporan aktif (belum resolved/rejected) dengan koordinat valid
CREATE OR REPLACE VIEW active_reports_geo AS
SELECT
  r.id,
  r.report_number,
  r.title,
  r.damage_type,
  r.severity,
  r.status,
  r.latitude,
  r.longitude,
  r.address,
  r.road_name,
  r.reported_at,
  ST_AsGeoJSON(r.location)::jsonb AS geojson  -- Siap dikonsumsi GeoJSON client
FROM reports r
WHERE r.status NOT IN ('RESOLVED', 'REJECTED')
  AND r.location IS NOT NULL;

COMMENT ON VIEW active_reports_geo IS
  'Laporan aktif dengan kolom GeoJSON untuk API endpoint peta';


-- ─── Contoh Query Spatial untuk Referensi ────────────────────────
--
-- 1. Cari laporan dalam radius 2 km dari titik (-6.2088, 106.8456):
--    SELECT * FROM reports
--    WHERE ST_DWithin(
--      location,
--      ST_SetSRID(ST_MakePoint(106.8456, -6.2088), 4326)::geography,
--      2000  -- dalam meter (karena cast ke geography)
--    );
--
-- 2. Cari laporan dalam bounding box (viewport peta):
--    SELECT * FROM reports
--    WHERE ST_Within(
--      location,
--      ST_MakeEnvelope(106.8, -6.3, 106.9, -6.1, 4326)  -- minX,minY,maxX,maxY
--    );
--
-- 3. Hitung jarak dari titik ke setiap laporan (meter):
--    SELECT id, title,
--      ST_Distance(
--        location::geography,
--        ST_SetSRID(ST_MakePoint(106.8456, -6.2088), 4326)::geography
--      ) AS distance_m
--    FROM reports
--    WHERE location IS NOT NULL
--    ORDER BY distance_m
--    LIMIT 10;
