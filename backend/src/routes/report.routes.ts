import { Router } from 'express';
import * as reportController from '../controllers/report.controller';
import { authenticateToken, requireRole, optionalAuth } from '../middleware/auth.middleware';
import { uploadReportPhotos } from '../middleware/upload.middleware';

const router = Router();

// ─── Routes ───────────────────────────────────────────────────────
// PENTING: Rute statis (/map-markers, /nearby) HARUS didaftarkan sebelum
// rute dinamis (/:id) agar Express tidak salah-cocokkan.

/**
 * GET /api/v1/reports/map-markers
 * Ambil marker peta dalam bounding box (publik).
 * Query: swLat, swLng, neLat, neLng (semua wajib)
 */
router.get('/map-markers', reportController.getMapMarkers);

/**
 * GET /api/v1/reports/nearby
 * Cari laporan dalam radius tertentu (publik, PostGIS ST_DWithin).
 * Query: lat, lng, radius (meter, default 2000), limit (default 20)
 */
router.get('/nearby', reportController.getNearbyReports);

/**
 * GET /api/v1/reports
 * Daftar laporan dengan cursor-based pagination dan filter (publik).
 * Query: cursor, limit, status, damageType, severity, regionId, dateFrom, dateTo, search
 */
router.get('/', reportController.getReports);

/**
 * GET /api/v1/reports/my
 * Daftar laporan milik user yang login — page-based pagination (wajib login).
 * Query: page, limit, search, status, sort (newest|oldest)
 */
router.get('/my', authenticateToken, reportController.getMyReports);

/**
 * GET /api/v1/reports/queue
 * Seluruh laporan diurutkan berdasarkan prioritas kerja — hanya ADMIN dan FIELD_VERIFIER.
 * Query: page, limit, search, status
 */
router.get('/queue', authenticateToken, requireRole('ADMIN', 'FIELD_VERIFIER'), reportController.getReportQueue);

/**
 * GET /api/v1/reports/:id
 * Detail laporan — menaikkan viewsCount secara atomik (publik).
 * optionalAuth: jika ada token yang valid, user context tersedia di controller.
 */
router.get('/:id', optionalAuth, reportController.getReportById);

/**
 * POST /api/v1/reports
 * Buat laporan baru dengan foto (wajib login).
 * uploadReportPhotos dijalankan dulu agar body multipart terparse sebelum Zod divalidasi.
 * Field foto: 'photos' (1–5 file, max 5MB per file)
 */
router.post(
  '/',
  authenticateToken,
  uploadReportPhotos,
  reportController.createReport,
);

/**
 * POST /api/v1/reports/:id/progress
 * Update status ke IN_PROGRESS atau RESOLVED oleh Verifikator Lapangan / Admin.
 * Multipart: field 'photos' (1–5 foto bukti pekerjaan, wajib), body: { status, notes? }
 * uploadReportPhotos dijalankan dulu agar body multipart terparse sebelum Zod.
 */
router.post(
  '/:id/progress',
  authenticateToken,
  requireRole('ADMIN', 'FIELD_VERIFIER'),
  uploadReportPhotos,
  reportController.updateReportProgress,
);

/**
 * PATCH /api/v1/reports/:id/status
 * Update status laporan — hanya VERIFIER atau ADMIN.
 * Body: { status, notes? }
 */
router.patch(
  '/:id/status',
  authenticateToken,
  requireRole('VERIFIER', 'ADMIN'),
  reportController.updateReportStatus,
);

/**
 * PATCH /api/v1/reports/:id
 * Update konten laporan — hanya pemilik laporan atau ADMIN.
 * Diblokir jika status VERIFIED atau RESOLVED.
 * Multipart: field 'photos' (0–5 gambar baru), keepPhotoIds[] untuk foto yang dipertahankan.
 */
router.patch(
  '/:id',
  authenticateToken,
  uploadReportPhotos,
  reportController.updateReport,
);

/**
 * DELETE /api/v1/reports/:id
 * Hapus laporan beserta semua fotonya — hanya pemilik laporan atau ADMIN.
 */
router.delete(
  '/:id',
  authenticateToken,
  reportController.deleteReport,
);

export default router;
