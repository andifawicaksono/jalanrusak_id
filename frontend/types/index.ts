// ─── Auth Types ───────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'PUBLIC' | 'VERIFIER' | 'ADMIN';
  avatar?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

// ─── Enums (harus cocok dengan backend Prisma schema) ─────────────

export type ReportStatus =
  | 'PENDING'
  | 'VERIFIED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED';

export type DamageType =
  | 'BERLUBANG'
  | 'RETAK'
  | 'AMBLAS'
  | 'BANJIR'
  | 'LONGSOR'
  | 'LAINNYA';

// ─── Photo Types ──────────────────────────────────────────────────

export interface Photo {
  id: string;
  url: string;
  filename: string;
  reportId: string;
}

export interface ReportPhoto {
  id: string;
  url: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  orderIndex: number;
  isPrimary: boolean;
  uploadedAt: string;
}

// ─── Report Types ─────────────────────────────────────────────────

export interface Report {
  id: string;
  title: string;
  description: string;
  damageType: DamageType;
  latitude: number;
  longitude: number;
  address: string;
  severity: number;
  status: ReportStatus;
  isAnonymous: boolean;
  userId: string;
  user: Pick<User, 'id' | 'name' | 'avatar'> | null;
  photos: Photo[];
  createdAt: string;
  updatedAt: string;
}

/** Detail laporan lengkap — dari endpoint GET /reports/:id */
export interface ReportDetail {
  id: string;
  reportNumber: string;
  title: string;
  description: string;
  damageType: DamageType;
  severity: number;
  status: ReportStatus;
  latitude: number;
  longitude: number;
  address: string;
  roadName: string | null;
  isAnonymous: boolean;
  viewsCount: number;
  reportedAt: string;
  updatedAt: string;
  photos: ReportPhoto[];
  user: { id: string; name: string; avatarUrl: string | null } | null;
  region: { id: number; name: string; level: string } | null;
}

/** Data yang diperlukan untuk membuat laporan baru */
export interface CreateReportInput {
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  severity: number;
  photos?: FileList;
}

// ─── Map Types ────────────────────────────────────────────────────

/** Koordinat titik di peta */
export interface LatLng {
  lat: number;
  lng: number;
}

/** Bounding box viewport peta — untuk query spasial ke backend */
export interface BoundingBox {
  swLat: number; // Latitude sudut barat-daya (min)
  swLng: number; // Longitude sudut barat-daya (min)
  neLat: number; // Latitude sudut timur-laut (max)
  neLng: number; // Longitude sudut timur-laut (max)
}

/** Data ringan marker peta — dari endpoint GET /reports/map-markers */
export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  severity: number;
  status: ReportStatus;
  damageType: DamageType;
  primaryPhotoUrl: string | null;
}

/** State filter yang diterapkan client-side pada marker */
export interface MapFilters {
  damageTypes: DamageType[];   // Kosong = tampilkan semua
  severityMin: number;         // 1-5
  severityMax: number;         // 1-5
  statuses: ReportStatus[];    // Kosong = tampilkan semua
}

// ─── API Response Types ───────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: { field: string; message: string }[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Filter Types ─────────────────────────────────────────────────

export interface ReportFilters {
  status?: ReportStatus;
  severity?: number;
  search?: string;
  page?: number;
  limit?: number;
}
