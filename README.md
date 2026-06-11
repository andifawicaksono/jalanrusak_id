# JalanRusak - Aplikasi Pelaporan Jalan Rusak

Aplikasi fullstack untuk pelaporan jalan rusak berbasis web dengan peta interaktif.

## Tech Stack

### Frontend
- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** + **Shadcn/ui** untuk komponen UI
- **Zustand** untuk state management
- **React Hook Form** + **Zod** untuk form & validasi
- **Leaflet.js** untuk peta interaktif
- **Axios** untuk HTTP client

### Backend
- **Express.js** + **TypeScript**
- **Prisma ORM** (PostgreSQL)
- **JWT** untuk autentikasi
- **Multer** + Storage Abstraction Layer untuk upload foto
- **Zod** untuk validasi request
- **Cors, Helmet, Morgan** untuk keamanan

---

## Prasyarat

- Node.js >= 18
- PostgreSQL >= 14
- npm / pnpm / yarn

---

## Cara Setup

### 1. Clone & Install Dependencies

```bash
# Clone repository
git clone <repo-url>
cd jalanrusak

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Setup Backend

```bash
cd backend

# Salin file environment
cp .env.example .env

# Edit .env sesuai konfigurasi database dan JWT secret Anda
# DATABASE_URL, JWT_SECRET wajib diisi

# Generate Prisma client
npm run prisma:generate

# Jalankan migrasi database
npm run prisma:migrate

# Buat folder uploads
mkdir -p uploads
```

### 3. Setup Frontend

```bash
cd frontend

# Salin file environment
cp .env.example .env.local

# Sesuaikan NEXT_PUBLIC_API_URL jika berbeda
```

### 4. Install Komponen Shadcn/ui

```bash
cd frontend

# Inisialisasi shadcn (jika belum)
npx shadcn-ui@latest init

# Install komponen yang dibutuhkan
npx shadcn-ui@latest add button input label card badge select textarea toast dialog dropdown-menu avatar separator skeleton table
```

### 5. Jalankan Aplikasi

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Aplikasi berjalan di:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **API Health Check:** http://localhost:3001/health

---

## Struktur API

| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| POST | `/api/v1/auth/register` | Daftar akun baru | - |
| POST | `/api/v1/auth/login` | Login | - |
| GET | `/api/v1/auth/me` | Profil user aktif | Required |
| GET | `/api/v1/reports` | Daftar semua laporan | - |
| POST | `/api/v1/reports` | Buat laporan baru | Required |
| GET | `/api/v1/reports/:id` | Detail laporan | - |
| PATCH | `/api/v1/reports/:id` | Update laporan | Required |
| DELETE | `/api/v1/reports/:id` | Hapus laporan | Required |
| GET | `/api/v1/users` | Daftar users | Admin only |
| PATCH | `/api/v1/users/:id` | Update profil user | Required |

---

## Mengganti Storage (Local → MinIO/S3)

Storage foto menggunakan abstraction layer di `backend/src/utils/storage.ts`.

Untuk mengganti ke MinIO atau AWS S3:
1. Implementasikan interface `IStorageProvider`
2. Buat class baru (contoh: `MinIOStorageProvider`)
3. Update factory function `createStorageProvider()` untuk return implementasi baru

```typescript
// Contoh di createStorageProvider():
if (process.env.STORAGE_TYPE === 'minio') {
  return new MinIOStorageProvider({ endpoint, bucket, ... });
}
if (process.env.STORAGE_TYPE === 's3') {
  return new S3StorageProvider({ bucket, region, ... });
}
```

---

## Struktur Folder

```
jalanrusak/
├── frontend/
│   ├── app/
│   │   ├── (public)/        # Halaman publik (landing, daftar laporan)
│   │   ├── (auth)/          # Halaman autentikasi (login, register)
│   │   └── (dashboard)/     # Halaman dashboard (butuh login)
│   ├── components/
│   │   ├── layout/          # Navbar, Sidebar
│   │   ├── reports/         # Komponen laporan
│   │   └── map/             # Komponen peta Leaflet
│   ├── lib/                 # Konfigurasi axios, utilities
│   ├── hooks/               # Custom React hooks
│   ├── store/               # Zustand stores
│   └── types/               # TypeScript type definitions
└── backend/
    ├── src/
    │   ├── routes/          # Definisi route Express
    │   ├── controllers/     # Handler request HTTP
    │   ├── middleware/      # Auth, error handler, upload, validasi
    │   ├── services/        # Business logic & database queries
    │   ├── utils/           # Storage, JWT, response helpers
    │   └── types/           # TypeScript types
    ├── prisma/
    │   └── schema.prisma    # Skema database
    └── uploads/             # Folder penyimpanan foto lokal
```
