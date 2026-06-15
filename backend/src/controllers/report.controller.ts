import { Request, Response } from 'express';
import { z } from 'zod';
import { DamageType, ReportStatus } from '@prisma/client';
import { AuthRequest } from '../types';
import * as reportService from '../services/report.service';
import type { UploadedFile } from '../services/report.service';

// ─── Schema Validasi ──────────────────────────────────────────────

const createReportSchema = z.object({
  title:       z.string().min(5).max(200).trim(),
  description: z.string().min(10).max(2000).trim(),
  latitude:    z.coerce.number().min(-90).max(90),
  longitude:   z.coerce.number().min(-180).max(180),
  address:     z.string().min(5).max(500).trim(),
  roadName:    z.string().max(200).trim().optional(),
  damageType:  z.nativeEnum(DamageType),
  severity:    z.coerce.number().int().min(1).max(5),
  regionId:    z.string().uuid().optional(),
  isAnonymous: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((v) => (typeof v === 'string' ? v === 'true' : v))
    .optional()
    .default(false),
});

const getReportsSchema = z.object({
  cursor:     z.string().uuid().optional(),
  limit:      z.coerce.number().int().min(1).max(50).optional().default(20),
  status:     z.nativeEnum(ReportStatus).optional(),
  damageType: z.nativeEnum(DamageType).optional(),
  severity:   z.coerce.number().int().min(1).max(5).optional(),
  regionId:   z.string().uuid().optional(),
  dateFrom:   z.string().datetime({ offset: true }).optional(),
  dateTo:     z.string().datetime({ offset: true }).optional(),
  search:     z.string().max(100).trim().optional(),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(ReportStatus),
  notes:  z.string().max(1000).trim().optional(),
});

const mapMarkersSchema = z.object({
  swLat: z.coerce.number().min(-90).max(90),
  swLng: z.coerce.number().min(-180).max(180),
  neLat: z.coerce.number().min(-90).max(90),
  neLng: z.coerce.number().min(-180).max(180),
});

const nearbySchema = z.object({
  lat:    z.coerce.number().min(-90).max(90),
  lng:    z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().int().min(100).max(50_000).optional().default(2_000),
  limit:  z.coerce.number().int().min(1).max(50).optional().default(20),
});

// ─── createReport ─────────────────────────────────────────────────

/**
 * POST /api/v1/reports
 * Auth: wajib login (authenticateToken)
 * Multipart: field 'photos' (1–5 gambar)
 */
export async function createReport(req: AuthRequest, res: Response): Promise<void> {
  const parsed = createReportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      error:   'Validasi gagal',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const files = (req.files as UploadedFile[]) ?? [];

  // Laporan wajib punya minimal 1 foto sebagai bukti
  if (files.length === 0) {
    res.status(422).json({ error: 'Minimal 1 foto harus dilampirkan' });
    return;
  }

  try {
    const report = await reportService.createReport({
      ...parsed.data,
      userId: req.user!.userId,
      files,
    });

    res.status(201).json({ message: 'Laporan berhasil dikirim', report });
  } catch (error) {
    console.error('[createReport]', error);
    res.status(500).json({ error: 'Gagal menyimpan laporan' });
  }
}

// ─── getReports ───────────────────────────────────────────────────

/**
 * GET /api/v1/reports
 * Auth: publik (tidak perlu login)
 */
export async function getReports(req: Request, res: Response): Promise<void> {
  const parsed = getReportsSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(422).json({
      error:   'Parameter tidak valid',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const result = await reportService.getReports(parsed.data);
    res.json(result);
  } catch (error) {
    console.error('[getReports]', error);
    res.status(500).json({ error: 'Gagal mengambil daftar laporan' });
  }
}

// ─── getReportById ────────────────────────────────────────────────

/**
 * GET /api/v1/reports/:id
 * Auth: publik, optionalAuth untuk context user
 *
 * Setiap request menaikkan viewsCount secara atomik.
 */
export async function getReportById(req: AuthRequest, res: Response): Promise<void> {
  const id = req.params['id'] as string;

  // Validasi format UUID sebelum hit DB
  if (!z.string().uuid().safeParse(id).success) {
    res.status(400).json({ error: 'ID laporan tidak valid' });
    return;
  }

  try {
    const report = await reportService.getReportById(id);
    if (!report) {
      res.status(404).json({ error: 'Laporan tidak ditemukan' });
      return;
    }
    res.json({ report });
  } catch (error) {
    console.error('[getReportById]', error);
    res.status(500).json({ error: 'Gagal mengambil detail laporan' });
  }
}

// ─── updateReportStatus ───────────────────────────────────────────

/**
 * PATCH /api/v1/reports/:id/status
 * Auth: VERIFIER atau ADMIN
 *
 * Status yang bisa diubah tergantung kondisi saat ini (lihat VALID_TRANSITIONS di service).
 * Status REJECTED wajib disertai notes (alasan).
 */
export async function updateReportStatus(req: AuthRequest, res: Response): Promise<void> {
  const id = req.params['id'] as string;

  if (!z.string().uuid().safeParse(id).success) {
    res.status(400).json({ error: 'ID laporan tidak valid' });
    return;
  }

  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      error:   'Data tidak valid',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const report = await reportService.updateReportStatus({
      reportId:        id,
      newStatus:       parsed.data.status,
      changedByUserId: req.user!.userId,
      notes:           parsed.data.notes,
    });
    res.json({ message: 'Status laporan berhasil diperbarui', report });
  } catch (error) {
    if (error instanceof Error) {
      // Error validasi transisi & notes dari service layer
      const isValidationError =
        error.message.startsWith('Transisi status') ||
        error.message.startsWith('Alasan penolakan') ||
        error.message.startsWith('Laporan tidak ditemukan');

      if (isValidationError) {
        res.status(422).json({ error: error.message });
        return;
      }
    }
    console.error('[updateReportStatus]', error);
    res.status(500).json({ error: 'Gagal memperbarui status laporan' });
  }
}

// ─── updateReport ─────────────────────────────────────────────────

const updateReportSchema = z.object({
  title:        z.string().min(5).max(200).trim(),
  description:  z.string().min(10).max(2000).trim(),
  latitude:     z.coerce.number().min(-90).max(90),
  longitude:    z.coerce.number().min(-180).max(180),
  address:      z.string().min(5).max(500).trim(),
  roadName:     z.string().max(200).trim().optional(),
  damageType:   z.nativeEnum(DamageType),
  severity:     z.coerce.number().int().min(1).max(5),
  keepPhotoIds: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (!v) return [];
      return Array.isArray(v) ? v : [v];
    }),
});

/**
 * PATCH /api/v1/reports/:id
 * Auth: pemilik laporan atau ADMIN
 * Multipart: field 'photos' (0–5 gambar baru), field 'keepPhotoIds' (IDs foto yang dipertahankan)
 */
export async function updateReport(req: AuthRequest, res: Response): Promise<void> {
  const id = req.params['id'] as string;

  if (!z.string().uuid().safeParse(id).success) {
    res.status(400).json({ error: 'ID laporan tidak valid' });
    return;
  }

  const parsed = updateReportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      error:   'Validasi gagal',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  const newFiles = (req.files as UploadedFile[]) ?? [];

  try {
    const report = await reportService.updateReport({
      ...parsed.data,
      reportId:      id,
      requesterId:   req.user!.userId,
      requesterRole: req.user!.role,
      newFiles,
    });

    res.json({ message: 'Laporan berhasil diperbarui', report });
  } catch (error) {
    if (error instanceof Error) {
      const isClientError =
        error.message.startsWith('Laporan tidak ditemukan') ||
        error.message.startsWith('Tidak diizinkan') ||
        error.message.startsWith('Laporan dengan status') ||
        error.message.startsWith('Laporan harus memiliki');

      if (isClientError) {
        const status = error.message.startsWith('Tidak diizinkan') ? 403 : 422;
        res.status(status).json({ error: error.message });
        return;
      }
    }
    console.error('[updateReport]', error);
    res.status(500).json({ error: 'Gagal memperbarui laporan' });
  }
}

// ─── getMapMarkers ────────────────────────────────────────────────

/**
 * GET /api/v1/reports/map-markers?swLat=&swLng=&neLat=&neLng=
 * Auth: publik
 *
 * Ambil marker ringan untuk viewport peta yang sedang dilihat user.
 * Gunakan bounding box (Float index) bukan PostGIS — lebih efisien untuk filter kotak.
 */
export async function getMapMarkers(req: Request, res: Response): Promise<void> {
  const parsed = mapMarkersSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(422).json({
      error:   'Parameter bounding box tidak valid',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  // Validasi bounding box: SW harus di selatan-barat NE
  if (parsed.data.swLat >= parsed.data.neLat || parsed.data.swLng >= parsed.data.neLng) {
    res.status(422).json({
      error: 'Bounding box tidak valid: swLat harus < neLat dan swLng harus < neLng',
    });
    return;
  }

  try {
    const markers = await reportService.getMapMarkers(parsed.data);
    res.json({ markers, total: markers.length });
  } catch (error) {
    console.error('[getMapMarkers]', error);
    res.status(500).json({ error: 'Gagal mengambil data marker peta' });
  }
}

// ─── getNearbyReports ─────────────────────────────────────────────

/**
 * GET /api/v1/reports/nearby?lat=&lng=&radius=&limit=
 * Auth: publik
 *
 * Cari laporan dalam radius tertentu (meter) dari koordinat yang diberikan.
 * Menggunakan PostGIS ST_DWithin — akurat untuk jarak busur (bukan flat Earth).
 */
export async function getNearbyReports(req: Request, res: Response): Promise<void> {
  const parsed = nearbySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(422).json({
      error:   'Parameter tidak valid',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const reports = await reportService.getNearbyReports(parsed.data);
    res.json({ reports, total: reports.length });
  } catch (error) {
    console.error('[getNearbyReports]', error);
    res.status(500).json({ error: 'Gagal mencari laporan terdekat' });
  }
}
