/**
 * Upload Middleware — Local Storage + Sharp untuk kompresi gambar
 *
 * Alur upload per request:
 *   1. multer.memoryStorage()  → file masuk ke req.file.buffer (belum ke disk)
 *   2. Sharp                   → resize max 1200×900, konversi ke WebP, kompres
 *   3. StorageProvider.save()  → tulis ke disk / upload ke MinIO / S3
 *   4. Mutasi file object      → file.path = publicUrl, file.filename = storagePath
 *
 * Ganti provider dengan mengubah env: STORAGE_TYPE=local|minio|s3
 *
 * Dependensi: npm install multer sharp @types/multer @types/sharp
 */
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import sharp from 'sharp';

// ─── Interface Storage Provider ───────────────────────────────────

export interface StoredFile {
  /** Path relatif dari UPLOAD_DIR (lokal) atau object key (MinIO/S3). Disimpan di Photo.storagePath. */
  storagePath: string;
  /** URL publik yang bisa diakses browser. Disimpan di Photo.url. */
  publicUrl:   string;
  /** Ukuran file setelah kompresi dalam bytes. */
  fileSize:    number;
  /** MIME type setelah konversi — selalu 'image/webp' untuk implementasi saat ini. */
  mimeType:    string;
}

export interface IStorageProvider {
  /**
   * Simpan buffer file ke storage.
   * Buffer berasal dari multer.memoryStorage() sebelum diproses Sharp.
   *
   * @param buffer       - Raw bytes file yang diupload
   * @param originalname - Nama file asli dari client (dipakai untuk log/debug)
   * @returns StoredFile — metadata file yang sudah tersimpan
   */
  save(buffer: Buffer, originalname: string): Promise<StoredFile>;

  /**
   * Hapus file dari storage menggunakan storagePath yang tersimpan di DB.
   * Implementasi harus idempotent — tidak throw jika file sudah tidak ada.
   *
   * @param storagePath - Nilai dari Photo.storagePath di database
   */
  delete(storagePath: string): Promise<void>;

  /**
   * Buat public URL dari storagePath.
   * Untuk S3/CloudFront: bisa dipakai untuk regenerate presigned URL.
   *
   * @param storagePath - Nilai dari Photo.storagePath di database
   */
  getPublicUrl(storagePath: string): string;
}

// ─── Local Storage Provider ───────────────────────────────────────

const UPLOAD_DIR   = process.env.UPLOAD_DIR   ?? 'uploads';
const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3001';

// Batas dimensi maksimal setelah resize — file lebih kecil tidak diperbesar (fit: 'inside')
const MAX_WIDTH  = 1200;
const MAX_HEIGHT = 900;
// WebP quality 82 setara dengan JPEG ~85 secara visual; cocok untuk foto lapangan
const WEBP_QUALITY = 82;

class LocalStorageProvider implements IStorageProvider {
  private readonly baseDir: string;

  constructor(uploadDir: string) {
    // path.resolve relatif ke CWD saat server dijalankan (biasanya folder backend/)
    this.baseDir = path.resolve(process.cwd(), uploadDir);
  }

  async save(buffer: Buffer, _originalname: string): Promise<StoredFile> {
    const now       = new Date();
    const yearMonth = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
    const filename  = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.webp`;
    const destDir   = path.join(this.baseDir, yearMonth);
    const destPath  = path.join(destDir, filename);

    // Relative key yang disimpan di DB — tidak bergantung pada path absolut server
    const storagePath = `${yearMonth}/${filename}`;

    await fs.mkdir(destDir, { recursive: true });

    // Resize + konversi ke WebP dalam satu pipeline Sharp (tidak ada file temp)
    const compressed = await sharp(buffer)
      .resize(MAX_WIDTH, MAX_HEIGHT, {
        fit:               'inside', // Pertahankan aspek rasio, tidak pernah crop
        withoutEnlargement: true,    // Jangan perbesar gambar kecil dari klien
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    await fs.writeFile(destPath, compressed);

    return {
      storagePath,
      publicUrl: this.getPublicUrl(storagePath),
      fileSize:  compressed.length,
      mimeType:  'image/webp',
    };
  }

  async delete(storagePath: string): Promise<void> {
    const fullPath = path.join(this.baseDir, storagePath);
    // fs.unlink gagal jika file tidak ada — catch agar idempotent
    await fs.unlink(fullPath).catch(() => undefined);
  }

  getPublicUrl(storagePath: string): string {
    // Express melayani baseDir di route /uploads (lihat src/index.ts)
    return `${API_BASE_URL}/uploads/${storagePath}`;
  }
}

// ─── MinIO Storage Provider (stub) ───────────────────────────────
//
// Aktifkan dengan: STORAGE_TYPE=minio
// Install:         npm install minio
//
// import { Client as MinioClient } from 'minio';
//
// class MinIOStorageProvider implements IStorageProvider {
//   private readonly client: MinioClient;
//   private readonly bucket: string;
//
//   constructor() {
//     this.client = new MinioClient({
//       endPoint:  process.env.MINIO_ENDPOINT  ?? 'localhost',
//       port:      Number.parseInt(process.env.MINIO_PORT ?? '9000', 10),
//       useSSL:    process.env.MINIO_USE_SSL === 'true',
//       accessKey: process.env.MINIO_ACCESS_KEY ?? '',
//       secretKey: process.env.MINIO_SECRET_KEY ?? '',
//     });
//     this.bucket = process.env.MINIO_BUCKET ?? 'jalanrusak';
//   }
//
//   async save(buffer: Buffer, _originalname: string): Promise<StoredFile> {
//     const now        = new Date();
//     const yearMonth  = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
//     const filename   = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.webp`;
//     const objectKey  = `reports/${yearMonth}/${filename}`;
//
//     const compressed = await sharp(buffer)
//       .resize(MAX_WIDTH, MAX_HEIGHT, { fit: 'inside', withoutEnlargement: true })
//       .webp({ quality: WEBP_QUALITY })
//       .toBuffer();
//
//     await this.client.putObject(this.bucket, objectKey, compressed, compressed.length, {
//       'Content-Type': 'image/webp',
//     });
//
//     return {
//       storagePath: objectKey,
//       publicUrl:   this.getPublicUrl(objectKey),
//       fileSize:    compressed.length,
//       mimeType:    'image/webp',
//     };
//   }
//
//   async delete(storagePath: string): Promise<void> {
//     await this.client.removeObject(this.bucket, storagePath).catch(() => undefined);
//   }
//
//   getPublicUrl(storagePath: string): string {
//     const proto = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
//     const host  = process.env.MINIO_ENDPOINT ?? 'localhost';
//     const port  = process.env.MINIO_PORT ?? '9000';
//     return `${proto}://${host}:${port}/${this.bucket}/${storagePath}`;
//   }
// }

// ─── AWS S3 Storage Provider (stub) ──────────────────────────────
//
// Aktifkan dengan: STORAGE_TYPE=s3
// Install:         npm install @aws-sdk/client-s3
//
// import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
//
// class S3StorageProvider implements IStorageProvider {
//   private readonly client: S3Client;
//   private readonly bucket: string;
//
//   constructor() {
//     this.client = new S3Client({
//       region:      process.env.AWS_REGION ?? 'ap-southeast-1',
//       credentials: {
//         accessKeyId:     process.env.AWS_ACCESS_KEY_ID     ?? '',
//         secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
//       },
//     });
//     this.bucket = process.env.AWS_S3_BUCKET ?? 'jalanrusak';
//   }
//
//   async save(buffer: Buffer, _originalname: string): Promise<StoredFile> {
//     const now        = new Date();
//     const yearMonth  = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
//     const filename   = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.webp`;
//     const objectKey  = `reports/${yearMonth}/${filename}`;
//
//     const compressed = await sharp(buffer)
//       .resize(MAX_WIDTH, MAX_HEIGHT, { fit: 'inside', withoutEnlargement: true })
//       .webp({ quality: WEBP_QUALITY })
//       .toBuffer();
//
//     await this.client.send(new PutObjectCommand({
//       Bucket:      this.bucket,
//       Key:         objectKey,
//       Body:        compressed,
//       ContentType: 'image/webp',
//     }));
//
//     return {
//       storagePath: objectKey,
//       publicUrl:   this.getPublicUrl(objectKey),
//       fileSize:    compressed.length,
//       mimeType:    'image/webp',
//     };
//   }
//
//   async delete(storagePath: string): Promise<void> {
//     await this.client.send(new DeleteObjectCommand({
//       Bucket: this.bucket,
//       Key:    storagePath,
//     })).catch(() => undefined);
//   }
//
//   getPublicUrl(storagePath: string): string {
//     // Jika ada CloudFront distribution, gunakan itu; fallback ke URL S3 langsung
//     const cdnBase = process.env.AWS_CLOUDFRONT_URL;
//     if (cdnBase) return `${cdnBase}/${storagePath}`;
//     const region = process.env.AWS_REGION ?? 'ap-southeast-1';
//     return `https://${this.bucket}.s3.${region}.amazonaws.com/${storagePath}`;
//   }
// }

// ─── Instansiasi Provider Aktif ───────────────────────────────────

function createStorageProvider(): IStorageProvider {
  const type = process.env.STORAGE_TYPE ?? 'local';
  // Aktifkan branch di bawah setelah menginstall package yang dibutuhkan:
  // if (type === 'minio') return new MinIOStorageProvider();
  // if (type === 's3')    return new S3StorageProvider();
  if (type !== 'local') {
    console.warn(`[upload] STORAGE_TYPE="${type}" tidak dikenali, fallback ke local.`);
  }
  return new LocalStorageProvider(UPLOAD_DIR);
}

/** Provider aktif — dieksport agar service bisa memanggil .delete() saat laporan dihapus */
export const storageProvider: IStorageProvider = createStorageProvider();

// ─── File Filter ──────────────────────────────────────────────────

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

function imageFileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
  if (ALLOWED_MIME.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Format tidak didukung: ${file.mimetype}. Gunakan JPEG, PNG, atau WebP.`));
  }
}

const MAX_FILE_SIZE = Number.parseInt(process.env.MAX_FILE_SIZE ?? '5242880', 10);

// memoryStorage: file tidak pernah menyentuh disk sebelum diproses Sharp
const memStorage = multer.memoryStorage();

// ─── Wrapper Middleware ───────────────────────────────────────────

interface UploadOptions {
  field:    string;
  mode:     'single' | 'array';
  maxCount: number;
}

/**
 * Bungkus multer + Sharp + storageProvider menjadi satu Express middleware.
 *
 * Setelah middleware selesai, setiap file dalam req.file / req.files memiliki:
 *   file.path     → publicUrl   (simpan sebagai Photo.url)
 *   file.filename → storagePath (simpan sebagai Photo.storagePath untuk deletion)
 *   file.size     → ukuran file setelah kompresi (bytes)
 *   file.mimetype → 'image/webp'
 */
function makeUploadHandler({ field, mode, maxCount }: UploadOptions) {
  const limits = { fileSize: MAX_FILE_SIZE, ...(mode === 'array' && { files: maxCount }) };

  const multerMiddleware =
    mode === 'single'
      ? multer({ storage: memStorage, fileFilter: imageFileFilter, limits }).single(field)
      : multer({ storage: memStorage, fileFilter: imageFileFilter, limits }).array(field, maxCount);

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    multerMiddleware(req, _res, async (multerErr: unknown) => {
      if (multerErr) {
        next(multerErr);
        return;
      }

      // Normalisasi: single → array agar bisa diproses seragam
      let rawFiles: Express.Multer.File[];
      if (req.file) {
        rawFiles = [req.file];
      } else if (Array.isArray(req.files)) {
        rawFiles = req.files;
      } else {
        rawFiles = [];
      }

      if (rawFiles.length === 0) {
        next();
        return;
      }

      try {
        await Promise.all(
          rawFiles.map(async (file) => {
            const stored = await storageProvider.save(file.buffer, file.originalname);
            // Mutasi file object agar service tidak perlu berubah interface-nya
            file.path     = stored.publicUrl;
            file.filename = stored.storagePath;
            file.size     = stored.fileSize;
            file.mimetype = stored.mimeType;
            // Buffer tidak dibutuhkan lagi setelah tersimpan — bebaskan memori
            file.buffer   = Buffer.alloc(0);
          }),
        );
        next();
      } catch (saveErr) {
        next(saveErr);
      }
    });
  };
}

// ─── Export Middleware ────────────────────────────────────────────

/** Upload satu foto (field: 'photo') — untuk avatar user */
export const uploadSingle = makeUploadHandler({ field: 'photo', mode: 'single', maxCount: 1 });

/** Upload hingga 5 foto (field: 'photos') — untuk laporan jalan rusak */
export const uploadReportPhotos = makeUploadHandler({ field: 'photos', mode: 'array', maxCount: 5 });

/** @deprecated Gunakan uploadReportPhotos */
export const uploadMultiple = uploadReportPhotos;
