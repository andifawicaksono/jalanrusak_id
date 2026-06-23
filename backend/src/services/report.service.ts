import { PrismaClient, ReportStatus, DamageType, Prisma } from '@prisma/client';
import { storageProvider } from '../middleware/upload.middleware';

const prisma = new PrismaClient();

// ─── Tipe Transisi Status yang Valid ─────────────────────────────

/**
 * Peta transisi status yang diizinkan.
 * RESOLVED dan REJECTED adalah status final — tidak bisa diubah lagi.
 *
 * Alur normal:  PENDING → VERIFIED → IN_PROGRESS → RESOLVED
 * Alur tolak:   * → REJECTED  (dari status apa pun kecuali final)
 */
const VALID_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  PENDING:     ['VERIFIED', 'REJECTED'],
  VERIFIED:    ['IN_PROGRESS', 'REJECTED'],
  IN_PROGRESS: ['RESOLVED', 'REJECTED'],
  RESOLVED:    [],
  REJECTED:    [],
};

// ─── Tipe File Setelah Upload ─────────────────────────────────────

/**
 * File object dari multer setelah diproses oleh upload.middleware.ts.
 *   path     → publicUrl    → simpan sebagai Photo.url
 *   filename → storagePath  → simpan sebagai Photo.storagePath (untuk deletion)
 */
export interface UploadedFile extends Express.Multer.File {
  path: string;
  filename: string;
}

// ─── createReport ─────────────────────────────────────────────────

export interface CreateReportInput {
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  roadName?: string;
  damageType: DamageType;
  severity: number;
  regionId?: string;
  isAnonymous: boolean;
  userId: string;
  files: UploadedFile[];
}

/**
 * Buat laporan baru dalam satu transaksi DB:
 *   1. Insert ke tabel reports (reportNumber di-generate oleh trigger PostgreSQL)
 *   2. Update kolom geometry PostGIS secara eksplisit — belt-and-suspenders
 *      di samping trigger `trg_sync_report_location` yang sudah ada
 *   3. Insert Photo records, tandai foto pertama sebagai isPrimary
 *
 * Return laporan lengkap (termasuk foto dan data pelapor).
 */
export async function createReport(input: CreateReportInput) {
  const { files, userId, latitude, longitude, ...reportFields } = input;

  const report = await prisma.$transaction(async (tx) => {
    // Prisma ORM tidak bisa mengisi kolom PostGIS geometry (tipe Unsupported).
    // Gunakan raw INSERT agar `location` di-set sekaligus — hindari NOT NULL violation
    // yang terjadi jika INSERT tanpa kolom itu lalu di-UPDATE terpisah.
    // Enum damage_type di DB lowercase; DamageType TypeScript uppercase → toLowerCase().
    const damageTypeDb = reportFields.damageType.toLowerCase();

    const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
      INSERT INTO road_reports (
        user_id, title, description, latitude, longitude, address, road_name,
        damage_type, severity, region_id, is_anonymous, report_number, location
      ) VALUES (
        ${userId}::uuid,
        ${reportFields.title},
        ${reportFields.description},
        ${latitude}::float8,
        ${longitude}::float8,
        ${reportFields.address},
        ${reportFields.roadName ?? null},
        ${damageTypeDb}::damage_type,
        ${reportFields.severity}::int4,
        ${reportFields.regionId ?? null}::uuid,
        ${reportFields.isAnonymous},
        '',
        ST_SetSRID(ST_MakePoint(${longitude}::float8, ${latitude}::float8), 4326)
      )
      RETURNING id
    `);

    const createdId = rows[0].id;

    if (files.length > 0) {
      await tx.photo.createMany({
        data: files.map((file, idx) => ({
          reportId:    createdId,
          url:         file.path,
          storagePath: file.filename,
          filename:    file.originalname,
          fileSize:    file.size,
          mimeType:    file.mimetype,
          orderIndex:  idx,
          isPrimary:   idx === 0,
        })),
      });
    }

    return { id: createdId };
  });

  // Ambil laporan lengkap setelah transaksi — trigger DB sudah mengisi reportNumber
  return fetchReportDetail(report.id);
}

// ─── getReports (cursor-based pagination) ────────────────────────

export interface GetReportsInput {
  cursor?: string;       // ID terakhir dari halaman sebelumnya
  limit: number;         // Jumlah item per halaman (max 50)
  status?: ReportStatus;
  damageType?: DamageType;
  severity?: number;
  regionId?: string;
  dateFrom?: string;     // ISO date string, filter reportedAt >= dateFrom
  dateTo?: string;       // ISO date string, filter reportedAt <= dateTo
  search?: string;       // Fulltext search di title, description, address
}

/**
 * Daftar laporan dengan cursor-based pagination.
 *
 * Cursor-based lebih efisien dari offset-based untuk dataset besar karena
 * tidak perlu menghitung OFFSET — cukup WHERE id > cursor dengan index.
 *
 * Response berisi nextCursor: pakai sebagai ?cursor= untuk halaman berikutnya.
 * nextCursor = null berarti sudah di halaman terakhir.
 */
export async function getReports(input: GetReportsInput) {
  const { cursor, limit, status, damageType, severity, regionId, dateFrom, dateTo, search } =
    input;

  const where: Prisma.ReportWhereInput = {
    ...(status     && { status }),
    ...(damageType && { damageType }),
    ...(severity   && { severity }),
    ...(regionId   && { regionId }),
    ...((dateFrom || dateTo) && {
      reportedAt: {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo   && { lte: new Date(dateTo) }),
      },
    }),
    ...(search && {
      OR: [
        { title:       { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { address:     { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  // Ambil satu item ekstra untuk mendeteksi apakah masih ada halaman berikutnya
  const rows = await prisma.report.findMany({
    where,
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { reportedAt: 'desc' },
    select: {
      id:           true,
      reportNumber: true,
      title:        true,
      damageType:   true,
      severity:     true,
      status:       true,
      address:      true,
      latitude:     true,
      longitude:    true,
      isAnonymous:  true,
      viewsCount:   true,
      reportedAt:   true,
      region: {
        select: { id: true, name: true, level: true },
      },
      // Hanya ambil foto primary — hemat bandwidth
      photos: {
        where:  { isPrimary: true },
        select: { id: true, url: true },
        take:   1,
      },
      // User hanya untuk laporan non-anonim
      user: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
  });

  const hasMore    = rows.length > limit;
  const items      = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? (items.at(-1)?.id ?? null) : null;

  // Sembunyikan identitas pelapor jika laporan bersifat anonim
  const masked = items.map((r) => ({
    ...r,
    user: r.isAnonymous ? null : r.user,
  }));

  return { reports: masked, nextCursor, hasMore };
}

// ─── getUserReports (page-based pagination) ───────────────────────

export interface GetUserReportsInput {
  userId: string;
  page: number;
  limit: number;
  search?: string;
  status?: ReportStatus;
  sort: 'newest' | 'oldest';
}

/**
 * Laporan milik user tertentu dengan page-based pagination.
 * Dipakai oleh endpoint GET /reports/my — user hanya melihat laporan miliknya.
 */
export async function getUserReports(input: GetUserReportsInput) {
  const { userId, page, limit, search, status, sort } = input;
  const skip = (page - 1) * limit;

  const where: Prisma.ReportWhereInput = {
    userId,
    ...(status && { status }),
    ...(search && {
      OR: [
        { title:       { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { address:     { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [total, rows] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      skip,
      take: limit,
      orderBy: { reportedAt: sort === 'oldest' ? 'asc' : 'desc' },
      select: {
        id:           true,
        reportNumber: true,
        title:        true,
        description:  true,
        damageType:   true,
        severity:     true,
        status:       true,
        address:      true,
        latitude:     true,
        longitude:    true,
        isAnonymous:  true,
        userId:       true,
        reportedAt:   true,
        updatedAt:    true,
        photos: {
          where:  { isPrimary: true },
          select: { id: true, url: true, filename: true, reportId: true },
          take:   1,
        },
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  // Alias reportedAt → createdAt untuk kompatibilitas dengan tipe Report di frontend
  const reports = rows.map((r) => ({
    ...r,
    createdAt: r.reportedAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: r.updatedAt?.toISOString() ?? new Date().toISOString(),
  }));

  return {
    reports,
    meta: { page, limit, total, totalPages },
  };
}

// ─── getReportQueue (ADMIN + FIELD_VERIFIER: semua laporan) ───────

export interface GetReportQueueInput {
  page:    number;
  limit:   number;
  search?: string;
  status?: ReportStatus;
}

interface RawQueueRow {
  id:            string;
  reportNumber:  string;
  title:         string;
  description:   string;
  damageType:    string;
  severity:      number | string;
  status:        string;
  address:       string;
  latitude:      number | string;
  longitude:     number | string;
  isAnonymous:   boolean;
  userId:        string;
  reportedAt:    Date;
  updatedAt:     Date;
  userName:      string | null;
  userAvatar:    string | null;
  photoId:       string | null;
  photoUrl:      string | null;
  photoFilename: string | null;
}

/**
 * Seluruh laporan (tanpa filter userId) dengan priority sort bawaan:
 * VERIFIED → IN_PROGRESS → PENDING → RESOLVED → REJECTED.
 * Dipakai oleh endpoint GET /reports/queue — hanya ADMIN dan FIELD_VERIFIER.
 * Menggunakan $queryRaw karena Prisma ORM tidak mendukung CASE di ORDER BY.
 */
export async function getReportQueue(input: GetReportQueueInput) {
  const { page, limit, search, status } = input;
  const offset = (page - 1) * limit;

  // Count via ORM (tidak perlu custom ORDER BY)
  const where: Prisma.ReportWhereInput = {
    ...(status && { status }),
    ...(search && {
      OR: [
        { title:       { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { address:     { contains: search, mode: 'insensitive' } },
      ],
    }),
  };
  const total = await prisma.report.count({ where });

  // Conditional SQL fragments untuk filter dinamis
  const statusFilter = status
    ? Prisma.sql`AND r.status = ${status.toLowerCase()}::report_status`
    : Prisma.sql``;

  const searchParam   = search ? `%${search}%` : null;
  const searchFilter  = searchParam
    ? Prisma.sql`AND (
        r.title       ILIKE ${searchParam}
        OR r.description ILIKE ${searchParam}
        OR r.address     ILIKE ${searchParam}
      )`
    : Prisma.sql``;

  const rows = await prisma.$queryRaw<RawQueueRow[]>(Prisma.sql`
    SELECT
      r.id,
      r.report_number                                                          AS "reportNumber",
      r.title,
      r.description,
      r.damage_type::text                                                      AS "damageType",
      r.severity,
      r.status::text                                                           AS status,
      r.address,
      r.latitude::float8                                                       AS latitude,
      r.longitude::float8                                                      AS longitude,
      r.is_anonymous                                                           AS "isAnonymous",
      r.user_id                                                                AS "userId",
      r.reported_at                                                            AS "reportedAt",
      r.updated_at                                                             AS "updatedAt",
      u.name                                                                   AS "userName",
      u.avatar_url                                                             AS "userAvatar",
      (SELECT p.id       FROM report_photos p WHERE p.report_id = r.id AND p.is_primary = true LIMIT 1) AS "photoId",
      (SELECT p.url      FROM report_photos p WHERE p.report_id = r.id AND p.is_primary = true LIMIT 1) AS "photoUrl",
      (SELECT p.filename FROM report_photos p WHERE p.report_id = r.id AND p.is_primary = true LIMIT 1) AS "photoFilename"
    FROM road_reports r
    LEFT JOIN users u ON u.id = r.user_id
    WHERE 1=1
    ${statusFilter}
    ${searchFilter}
    ORDER BY
      CASE r.status
        WHEN 'verified'    THEN 1
        WHEN 'in_progress' THEN 2
        WHEN 'pending'     THEN 3
        WHEN 'resolved'    THEN 4
        WHEN 'rejected'    THEN 5
        ELSE 6
      END,
      r.reported_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  const totalPages = Math.ceil(total / limit);

  const reports = rows.map((r) => ({
    id:          r.id,
    reportNumber: r.reportNumber,
    title:        r.title,
    description:  r.description,
    damageType:   r.damageType.toUpperCase() as DamageType,
    severity:     Number(r.severity),
    status:       r.status.toUpperCase() as ReportStatus,
    address:      r.address,
    latitude:     Number(r.latitude),
    longitude:    Number(r.longitude),
    isAnonymous:  r.isAnonymous,
    userId:       r.userId,
    createdAt:    r.reportedAt instanceof Date ? r.reportedAt.toISOString() : String(r.reportedAt),
    updatedAt:    r.updatedAt  instanceof Date ? r.updatedAt.toISOString()  : String(r.updatedAt),
    user: r.userName
      ? { id: r.userId, name: r.userName, avatar: r.userAvatar ?? null }
      : null,
    photos: r.photoId
      ? [{ id: r.photoId, url: r.photoUrl!, filename: r.photoFilename!, reportId: r.id }]
      : [],
  }));

  return { reports, meta: { page, limit, total, totalPages } };
}

// ─── getReportById ────────────────────────────────────────────────

/**
 * Detail laporan — menaikkan viewsCount secara atomik dalam satu query UPDATE.
 * Lebih efisien dari SELECT + UPDATE terpisah karena hanya satu round-trip ke DB.
 *
 * Return null jika laporan tidak ditemukan.
 */
export async function getReportById(id: string) {
  try {
    // UPDATE + return dalam satu query — atomic increment viewsCount
    const report = await prisma.report.update({
      where: { id },
      data:  { viewsCount: { increment: 1 } },
      include: {
        photos: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id:          true,
            url:         true,
            filename:    true,
            fileSize:    true,
            mimeType:    true,
            orderIndex:  true,
            isPrimary:   true,
            uploadedAt:  true,
          },
        },
        user: {
          select: { id: true, name: true, avatarUrl: true, phone: true },
        },
        region: true,
        statusHistory: {
          orderBy: { changedAt: 'desc' },
          select: {
            id:        true,
            oldStatus: true,
            newStatus: true,
            notes:     true,
            changedAt: true,
            user: {
              select: { id: true, name: true, role: true },
            },
            proofPhotos: {
              select:  { id: true, url: true },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });

    // Masking identitas pelapor anonim
    return {
      ...report,
      user: report.isAnonymous ? null : report.user,
    };
  } catch (error) {
    // Prisma P2025 = record tidak ditemukan
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return null;
    }
    throw error;
  }
}

// ─── updateReportStatus ───────────────────────────────────────────

export interface UpdateStatusInput {
  reportId:        string;
  newStatus:       ReportStatus;
  changedByUserId: string;
  notes?:          string;
}

/**
 * Update status laporan dengan validasi transisi dan pencatatan audit trail.
 *
 * Validasi:
 *   - Transisi harus ada di VALID_TRANSITIONS
 *   - notes wajib diisi saat status REJECTED
 *
 * Operasi dilakukan dalam satu transaksi — update report + insert StatusHistory atomik.
 */
export async function updateReportStatus(input: UpdateStatusInput) {
  const { reportId, newStatus, changedByUserId, notes } = input;

  // Ambil status saat ini — hanya field yang dibutuhkan
  const current = await prisma.report.findUnique({
    where:  { id: reportId },
    select: { id: true, status: true },
  });

  if (!current) {
    throw new Error('Laporan tidak ditemukan');
  }

  // Validasi transisi status
  const allowed = VALID_TRANSITIONS[current.status];
  if (!allowed.includes(newStatus)) {
    const allowedStr = allowed.length > 0 ? allowed.join(', ') : 'tidak ada (status final)';
    throw new Error(
      `Transisi status tidak valid: ${current.status} → ${newStatus}. ` +
        `Status yang diizinkan dari ${current.status}: ${allowedStr}`,
    );
  }

  // notes wajib saat REJECTED agar ada alasan yang tercatat
  if (newStatus === 'REJECTED' && !notes?.trim()) {
    throw new Error('Alasan penolakan (field "notes") wajib diisi saat menolak laporan');
  }

  // Eksekusi update + audit dalam satu transaksi
  const [updatedReport] = await prisma.$transaction([
    prisma.report.update({
      where: { id: reportId },
      data:  { status: newStatus },
      include: {
        photos: {
          where:  { isPrimary: true },
          select: { id: true, url: true },
          take:   1,
        },
        region: { select: { id: true, name: true } },
      },
    }),
    prisma.statusHistory.create({
      data: {
        reportId,
        changedBy: changedByUserId,
        oldStatus: current.status,
        newStatus,
        notes:     notes ?? null,
      },
    }),
  ]);

  return updatedReport;
}

// ─── updateReportProgress (field verifier — foto wajib) ──────────

export interface UpdateProgressInput {
  reportId:        string;
  changedByUserId: string;
  newStatus:       'IN_PROGRESS' | 'RESOLVED';
  notes?:          string;
  files:           UploadedFile[];
}

const PROGRESS_TRANSITIONS: Record<string, string[]> = {
  VERIFIED:    ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
};

/**
 * Update status laporan ke IN_PROGRESS atau RESOLVED oleh Verifikator Lapangan / Admin.
 * Membutuhkan minimal 1 foto bukti pekerjaan yang dikaitkan ke entri StatusHistory.
 */
export async function updateReportProgress(input: UpdateProgressInput) {
  const { reportId, changedByUserId, newStatus, notes, files } = input;

  const current = await prisma.report.findUnique({
    where:  { id: reportId },
    select: { id: true, status: true },
  });

  if (!current) throw new Error('Laporan tidak ditemukan');

  const allowed = PROGRESS_TRANSITIONS[current.status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Tidak dapat mengubah status dari ${current.status} ke ${newStatus}. ` +
      `Pastikan laporan sudah dalam status yang sesuai.`,
    );
  }

  if (files.length === 0) {
    throw new Error('Minimal 1 foto bukti pekerjaan wajib diunggah');
  }

  const [updatedReport] = await prisma.$transaction([
    prisma.report.update({
      where: { id: reportId },
      data:  { status: newStatus },
      include: {
        photos: { where: { isPrimary: true }, select: { id: true, url: true }, take: 1 },
        region: { select: { id: true, name: true } },
      },
    }),
    prisma.statusHistory.create({
      data: {
        reportId,
        changedBy: changedByUserId,
        oldStatus: current.status,
        newStatus,
        notes:     notes ?? null,
        proofPhotos: {
          create: files.map((file, idx) => ({
            reportId,
            url:         file.path,
            storagePath: file.filename,
            filename:    file.originalname,
            fileSize:    file.size,
            mimeType:    file.mimetype,
            orderIndex:  idx,
            isPrimary:   false,
          })),
        },
      },
    }),
  ]);

  return updatedReport;
}

// ─── getMapMarkers (bounding box) ────────────────────────────────

export interface BoundingBox {
  swLat: number; // Latitude sudut barat-daya (min)
  swLng: number; // Longitude sudut barat-daya (min)
  neLat: number; // Latitude sudut timur-laut (max)
  neLng: number; // Longitude sudut timur-laut (max)
}

/**
 * Ambil marker peta untuk viewport yang sedang dilihat user.
 *
 * Menggunakan kolom Float latitude/longitude (bukan PostGIS geometry) untuk
 * bounding box — cukup efisien dengan index B-Tree standar.
 * Hanya data minimal yang diambil agar response ringan.
 *
 * Status REJECTED dikecualikan — tidak perlu ditampilkan di peta publik.
 */
export async function getMapMarkers(bbox: BoundingBox) {
  const markers = await prisma.report.findMany({
    where: {
      status:    { notIn: ['REJECTED'] },
      latitude:  { gte: bbox.swLat, lte: bbox.neLat },
      longitude: { gte: bbox.swLng, lte: bbox.neLng },
    },
    select: {
      id:         true,
      latitude:   true,
      longitude:  true,
      severity:   true,
      status:     true,
      damageType: true,
      // Hanya foto primary untuk thumbnail marker
      photos: {
        where:  { isPrimary: true },
        select: { url: true },
        take:   1,
      },
    },
    orderBy: { reportedAt: 'desc' },
    // Batasi jumlah marker agar tidak memberatkan browser
    take: 500,
  });

  // Flatten primaryPhotoUrl ke field langsung
  return markers.map((m) => ({
    id:              m.id,
    latitude:        m.latitude,
    longitude:       m.longitude,
    severity:        m.severity,
    status:          m.status,
    damageType:      m.damageType,
    primaryPhotoUrl: m.photos[0]?.url ?? null,
  }));
}

// ─── getNearbyReports (PostGIS ST_DWithin) ───────────────────────

export interface GetNearbyInput {
  lat:    number; // Latitude pusat pencarian
  lng:    number; // Longitude pusat pencarian
  radius: number; // Radius dalam meter (default: 2000m)
  limit:  number; // Jumlah max hasil (default: 20)
}

/** Tipe baris hasil raw query PostGIS */
interface NearbyReportRow {
  id:              string;
  reportNumber:    string;
  title:           string;
  damageType:      DamageType;
  severity:        number;
  status:          ReportStatus;
  latitude:        number;
  longitude:       number;
  address:         string;
  isAnonymous:     boolean;
  reportedAt:      Date;
  primaryPhotoUrl: string | null;
  distance:        number; // meter, dari pusat pencarian ke laporan
}

/**
 * Cari laporan di sekitar koordinat yang diberikan menggunakan PostGIS ST_DWithin.
 *
 * Keunggulan ST_DWithin vs bounding box Float:
 *   - Jarak dihitung berdasarkan busur (geography), bukan kotak lurus
 *   - Akurat untuk semua latitude (tidak distorsi di dekat kutub)
 *   - Memanfaatkan GIST index untuk performa O(log n)
 *
 * Query menggunakan $queryRaw (parameterized) — aman dari SQL injection.
 * Urutan ST_MakePoint: MakePoint(X=longitude, Y=latitude) — jangan tertukar!
 */
export async function getNearbyReports(input: GetNearbyInput) {
  const { lat, lng, radius, limit } = input;

  const results = await prisma.$queryRaw<NearbyReportRow[]>`
    SELECT
      r.id::text                                          AS id,
      r.report_number                                     AS "reportNumber",
      r.title,
      r.damage_type                                       AS "damageType",
      r.severity,
      r.status,
      r.latitude,
      r.longitude,
      r.address,
      r.is_anonymous                                      AS "isAnonymous",
      r.reported_at                                       AS "reportedAt",
      (
        SELECT p.url
        FROM   photos p
        WHERE  p.report_id = r.id
          AND  p.is_primary = true
        LIMIT  1
      )                                                   AS "primaryPhotoUrl",
      ROUND(
        ST_Distance(
          r.location::geography,
          ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography
        )::numeric,
        0
      )                                                   AS distance
    FROM  reports r
    WHERE
      r.location IS NOT NULL
      AND r.status::text != 'REJECTED'
      AND ST_DWithin(
            r.location::geography,
            ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)::geography,
            ${radius}::float8
          )
    ORDER BY distance
    LIMIT ${Prisma.sql`${limit}`}
  `;

  // Masking laporan anonim
  return results.map((r) => ({
    ...r,
    distance: Number(r.distance), // Prisma kembalikan BigInt dari SQL ROUND, konversi ke number
  }));
}

// ─── deleteReport ─────────────────────────────────────────────────

/**
 * Hapus laporan dan semua fotonya.
 *
 * Urutan:
 *   1. Ambil storagePath semua foto dari DB
 *   2. Hapus dari storage provider secara paralel — lanjutkan meski sebagian gagal
 *   3. Hapus record Report dari DB (photos terhapus otomatis via onDelete: Cascade)
 */
export async function deleteReport(id: string) {
  const photos = await prisma.photo.findMany({
    where:  { reportId: id },
    select: { storagePath: true },
  });

  // Hapus dari storage — error per foto tidak menghentikan proses
  await Promise.all(
    photos.map((p) =>
      p.storagePath
        ? storageProvider
            .delete(p.storagePath)
            .catch((err: unknown) => {
              console.warn(`Gagal hapus foto (${p.storagePath}):`, err);
            })
        : Promise.resolve(),
    ),
  );

  await prisma.report.delete({ where: { id } });
}

// ─── updateReport ────────────────────────────────────────────────

export interface UpdateReportInput {
  reportId:      string;
  requesterId:   string;
  requesterRole: string;
  title:         string;
  description:   string;
  latitude:      number;
  longitude:     number;
  address:       string;
  roadName?:     string;
  damageType:    DamageType;
  severity:      number;
  keepPhotoIds:  string[];
  newFiles:      UploadedFile[];
}

const BLOCKED_UPDATE_STATUSES = new Set<ReportStatus>(['VERIFIED', 'RESOLVED']);

/**
 * Update laporan oleh pemilik atau ADMIN.
 * - Diblokir jika status sudah VERIFIED atau RESOLVED.
 * - Foto: IDs dalam keepPhotoIds tetap, sisanya dihapus; newFiles ditambahkan.
 * - Minimal 1 foto harus tersisa setelah update.
 */
export async function updateReport(input: UpdateReportInput) {
  const {
    reportId, requesterId, requesterRole,
    title, description, latitude, longitude, address, roadName,
    damageType, severity, keepPhotoIds, newFiles,
  } = input;

  const report = await prisma.report.findUnique({
    where:  { id: reportId },
    select: {
      id:     true,
      userId: true,
      status: true,
      photos: { select: { id: true, storagePath: true } },
    },
  });

  if (!report) throw new Error('Laporan tidak ditemukan');

  if (report.userId !== requesterId && requesterRole !== 'ADMIN') {
    throw new Error('Tidak diizinkan: hanya pemilik laporan atau admin yang dapat mengedit');
  }

  if (BLOCKED_UPDATE_STATUSES.has(report.status)) {
    throw new Error(`Laporan dengan status ${report.status} tidak dapat diubah`);
  }

  const photosToDelete = report.photos.filter((p) => !keepPhotoIds.includes(p.id));
  const keptCount      = report.photos.length - photosToDelete.length;
  if (keptCount + newFiles.length === 0) {
    throw new Error('Laporan harus memiliki minimal 1 foto');
  }

  await prisma.$transaction(async (tx) => {
    const damageTypeDb = damageType.toLowerCase();
    await tx.$queryRaw(Prisma.sql`
      UPDATE road_reports SET
        title       = ${title},
        description = ${description},
        latitude    = ${latitude}::float8,
        longitude   = ${longitude}::float8,
        address     = ${address},
        road_name   = ${roadName ?? null},
        damage_type = ${damageTypeDb}::damage_type,
        severity    = ${severity}::int4,
        location    = ST_SetSRID(ST_MakePoint(${longitude}::float8, ${latitude}::float8), 4326)
      WHERE id = ${reportId}::uuid
    `);

    if (photosToDelete.length > 0) {
      await tx.photo.deleteMany({
        where: { id: { in: photosToDelete.map((p) => p.id) } },
      });
    }

    if (newFiles.length > 0) {
      const existingCount = await tx.photo.count({ where: { reportId } });
      await tx.photo.createMany({
        data: newFiles.map((file, idx) => ({
          reportId,
          url:         file.path,
          storagePath: file.filename,
          filename:    file.originalname,
          fileSize:    file.size,
          mimeType:    file.mimetype,
          orderIndex:  existingCount + idx,
          isPrimary:   existingCount === 0 && idx === 0,
        })),
      });
    }

    // Ensure at least one primary photo exists
    const primaryCount = await tx.photo.count({ where: { reportId, isPrimary: true } });
    if (primaryCount === 0) {
      const first = await tx.photo.findFirst({
        where:   { reportId },
        orderBy: { orderIndex: 'asc' },
        select:  { id: true },
      });
      if (first) {
        await tx.photo.update({ where: { id: first.id }, data: { isPrimary: true } });
      }
    }
  });

  // Delete files from storage after DB commit — best-effort
  await Promise.allSettled(
    photosToDelete.map((p) =>
      p.storagePath
        ? storageProvider.delete(p.storagePath).catch((err: unknown) => {
            console.warn(`Gagal hapus foto (${p.storagePath}):`, err);
          })
        : Promise.resolve(),
    ),
  );

  return fetchReportDetail(reportId);
}

// ─── Internal Helper ──────────────────────────────────────────────

/**
 * Ambil laporan lengkap berdasarkan ID — TANPA increment viewsCount.
 * Digunakan secara internal setelah createReport agar tidak menaikkan counter.
 */
async function fetchReportDetail(id: string) {
  return prisma.report.findUnique({
    where: { id },
    include: {
      photos: {
        orderBy: { orderIndex: 'asc' },
        select: {
          id:         true,
          url:        true,
          filename:   true,
          fileSize:   true,
          mimeType:   true,
          orderIndex: true,
          isPrimary:  true,
          uploadedAt: true,
        },
      },
      user: {
        select: { id: true, name: true, avatarUrl: true },
      },
      region: true,
    },
  });
}
