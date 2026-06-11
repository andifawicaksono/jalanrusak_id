import fs from 'fs';
import path from 'path';

/**
 * Interface abstraksi storage provider.
 *
 * Semua provider storage (local, MinIO, S3) harus mengimplementasikan
 * interface ini. Dengan demikian, kode yang menggunakan storage tidak
 * perlu tahu detail implementasinya — cukup panggil method ini.
 */
export interface IStorageProvider {
  /**
   * Simpan file yang diupload dan kembalikan URL publik-nya.
   * File sudah ada di disk (diletakkan oleh multer) — provider
   * bisa memindahkan/meng-upload ke remote storage jika diperlukan.
   */
  saveFile(file: Express.Multer.File): Promise<string>;

  /** Hapus file dari storage berdasarkan nama file */
  deleteFile(filename: string): Promise<void>;

  /** Kembalikan URL publik yang dapat diakses browser */
  getPublicUrl(filename: string): string;
}

// ─── Local Storage Provider ───────────────────────────────────────

/**
 * Provider storage lokal — menyimpan file di folder `uploads/`.
 * Cocok untuk development dan deployment skala kecil.
 *
 * Untuk production skala besar, ganti dengan MinIOStorageProvider
 * atau S3StorageProvider menggunakan factory di bawah.
 */
export class LocalStorageProvider implements IStorageProvider {
  private uploadDir: string;
  private baseUrl: string;

  constructor(uploadDir: string, baseUrl: string) {
    this.uploadDir = uploadDir;
    this.baseUrl = baseUrl;

    // Buat folder uploads jika belum ada
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  /**
   * Multer sudah menyimpan file ke disk — kita cukup return URL-nya.
   * Jika menggunakan remote storage, di sinilah kita upload file-nya.
   */
  async saveFile(file: Express.Multer.File): Promise<string> {
    return this.getPublicUrl(file.filename);
  }

  /** Hapus file dari folder uploads lokal */
  async deleteFile(filename: string): Promise<void> {
    const filePath = path.join(this.uploadDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /** Buat URL publik berdasarkan nama file */
  getPublicUrl(filename: string): string {
    return `${this.baseUrl}/uploads/${filename}`;
  }
}

// ─── MinIO Provider (template untuk masa depan) ───────────────────
/*
import { Client as MinioClient } from 'minio';

export class MinIOStorageProvider implements IStorageProvider {
  private client: MinioClient;
  private bucket: string;

  constructor(config: { endpoint: string; port: number; accessKey: string; secretKey: string; bucket: string; useSSL: boolean }) {
    this.client = new MinioClient({
      endPoint: config.endpoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
    });
    this.bucket = config.bucket;
  }

  async saveFile(file: Express.Multer.File): Promise<string> {
    await this.client.fPutObject(this.bucket, file.filename, file.path);
    return this.getPublicUrl(file.filename);
  }

  async deleteFile(filename: string): Promise<void> {
    await this.client.removeObject(this.bucket, filename);
  }

  getPublicUrl(filename: string): string {
    return `https://${process.env.MINIO_ENDPOINT}/${this.bucket}/${filename}`;
  }
}
*/

// ─── S3 Provider (template untuk masa depan) ──────────────────────
/*
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

export class S3StorageProvider implements IStorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor(config: { region: string; accessKeyId: string; secretAccessKey: string; bucket: string }) {
    this.client = new S3Client({
      region: config.region,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
    this.bucket = config.bucket;
  }

  async saveFile(file: Express.Multer.File): Promise<string> {
    const fileContent = fs.readFileSync(file.path);
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: file.filename,
      Body: fileContent,
      ContentType: file.mimetype,
    }));
    return this.getPublicUrl(file.filename);
  }

  async deleteFile(filename: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: filename }));
  }

  getPublicUrl(filename: string): string {
    return `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;
  }
}
*/

// ─── Factory Function ─────────────────────────────────────────────

/**
 * Factory function untuk membuat storage provider yang sesuai.
 *
 * Ubah logika di sini untuk mengganti implementasi storage:
 * - Set env STORAGE_TYPE=minio → MinIOStorageProvider
 * - Set env STORAGE_TYPE=s3    → S3StorageProvider
 * - Default                    → LocalStorageProvider
 */
export function createStorageProvider(): IStorageProvider {
  const storageType = process.env.STORAGE_TYPE || 'local';

  switch (storageType) {
    case 'local':
    default: {
      const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'uploads');
      const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
      return new LocalStorageProvider(uploadDir, baseUrl);
    }

    // Uncomment dan implementasikan sesuai provider yang diinginkan:
    // case 'minio':
    //   return new MinIOStorageProvider({ ... });
    // case 's3':
    //   return new S3StorageProvider({ ... });
  }
}

/** Singleton instance — digunakan di seluruh aplikasi */
export const storageProvider = createStorageProvider();
