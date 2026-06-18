# JalanRusak — Platform Pelaporan Jalan Rusak Berbasis Komunitas

Aplikasi web fullstack untuk pelaporan dan pengelolaan kondisi jalan rusak. Warga dapat mengirim laporan lengkap dengan foto dan lokasi GPS; verifikator dan admin mengelola status penanganan.

## Fitur Utama

- **Pelaporan geotagged** — pin lokasi di peta interaktif + foto bukti (kamera langsung atau gallery)
- **Peta laporan real-time** — marker berkluster berdasarkan viewport, filter severity & tipe kerusakan
- **Alur status penanganan** — `PENDING → VERIFIED → IN_PROGRESS → RESOLVED | REJECTED`
- **RBAC** — tiga peran: `PUBLIC` (pelapor), `VERIFIER`, `ADMIN`
- **Upload foto pintar** — kompresi otomatis ke WebP via Sharp, mendukung Local / MinIO / AWS S3
- **Auth JWT** — access token (1 jam) + refresh token (7 hari) dengan rotasi session

## Tech Stack

| Layer | Teknologi |
|---|---|
| Backend | Node.js · Express · TypeScript · Prisma ORM |
| Database | PostgreSQL + PostGIS (geometri spasial) |
| Frontend | Next.js 15 (App Router) · React 19 · TypeScript |
| Styling | Tailwind CSS · Shadcn/ui (Radix Primitives) |
| Peta | Leaflet · react-leaflet · react-leaflet-cluster |
| State | Zustand · SWR |
| Auth | JWT (jsonwebtoken) · bcryptjs |
| Upload | Multer · Sharp |
| CI/CD | GitHub Actions → SSH → PM2 |

---

## Prasyarat

- **Node.js** ≥ 20
- **npm** ≥ 10
- **PostgreSQL** ≥ 14 dengan ekstensi **PostGIS**
- **Git**

### Aktifkan Ekstensi PostgreSQL

```sql
-- Jalankan di psql sebagai superuser setelah database dibuat
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

## Instalasi Lokal

### 1. Clone Repositori

```bash
git clone <url-repo>
cd jalanrusak_id
```

### 2. Setup Backend

```bash
cd backend
npm install
cp .env.example .env
```

Isi `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/jalanrusak"
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

JWT_ACCESS_SECRET=ganti-dengan-string-acak-panjang-min-32-karakter
JWT_REFRESH_SECRET=ganti-dengan-string-berbeda-min-32-karakter

API_BASE_URL=http://localhost:3001
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
STORAGE_TYPE=local
```

```bash
# Generate Prisma client
npm run prisma:generate

# Jalankan migrasi database
npm run prisma:migrate

# (Opsional) Isi data awal
npm run prisma:seed

# Jalankan dev server
npm run dev
```

Backend berjalan di **`http://localhost:3001`**. Health check: `GET /health`

### 3. Setup Frontend

```bash
cd ../frontend

# --legacy-peer-deps wajib karena react-leaflet belum support React 19
npm install --legacy-peer-deps

cp .env.example .env.local
```

Isi `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_MAP_DEFAULT_LAT=-6.2088
NEXT_PUBLIC_MAP_DEFAULT_LNG=106.8456
NEXT_PUBLIC_MAP_DEFAULT_ZOOM=12
```

```bash
npm run dev
```

Frontend berjalan di **`http://localhost:3000`**

---

## Perintah Development

### Backend

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Dev server dengan hot reload (tsx watch) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm run start` | Jalankan hasil build |
| `npm run prisma:generate` | Regenerate Prisma client (wajib setelah ubah schema) |
| `npm run prisma:migrate` | Buat + jalankan migrasi baru |
| `npm run prisma:migrate:prod` | Deploy migrasi ke production (tanpa prompt) |
| `npm run prisma:studio` | Buka GUI Prisma Studio |
| `npm run prisma:seed` | Isi data awal |

### Frontend

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Dev server Next.js di port 3000 |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run type-check` | Type check tanpa compile (`tsc --noEmit`) |

---

## Arsitektur

```
jalanrusak_id/
├── backend/src/
│   ├── controllers/    # HTTP handler — parse request, panggil service, kirim response
│   ├── services/       # Business logic + Prisma queries
│   ├── routes/         # Registrasi endpoint Express
│   ├── middleware/     # Auth, upload (Multer+Sharp), validasi (Zod), error handler
│   ├── utils/          # jwt.util, response helper, storage abstraction, password
│   └── index.ts        # Entry point — setup Express, CORS, static files
├── frontend/
│   ├── app/
│   │   ├── (public)/   # Halaman publik: landing (/), peta (/map), laporan (/reports)
│   │   ├── (auth)/     # Login, register (unauthenticated only)
│   │   └── (dashboard)/ # Halaman terproteksi: dashboard, buat laporan, kelola user
│   ├── components/
│   │   ├── layout/     # Navbar, Sidebar
│   │   ├── map/        # Komponen Leaflet (semua dynamic import ssr:false)
│   │   ├── reports/    # Wizard laporan: LocationPicker, DamageForm, PhotoUpload
│   │   └── dashboard/  # Tabel laporan, stats, modal status
│   ├── store/          # Zustand: authStore, reportStore, reportFormStore
│   ├── lib/            # apiClient (axios), utils
│   └── types/          # TypeScript type definitions
├── ecosystem.config.js  # Konfigurasi PM2 production
└── .github/workflows/   # GitHub Actions CI/CD
```

**Alur data backend:** `Route → Middleware → Controller → Service → Prisma → PostgreSQL`

---

## Dokumentasi API

Base URL: `http://localhost:3001/api/v1`

Semua response menggunakan format:
```json
{
  "success": true,
  "message": "Deskripsi",
  "data": {},
  "errors": [{ "field": "nama_field", "message": "Pesan error" }]
}
```

### Auth

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `POST` | `/auth/register` | — | Daftar akun baru |
| `POST` | `/auth/login` | — | Login, dapat access + refresh token |
| `POST` | `/auth/refresh` | — | Perbarui access token |
| `GET` | `/auth/profile` | Bearer | Profil user aktif |
| `POST` | `/auth/logout` | Bearer | Invalidasi refresh token |

**Body `POST /auth/register`:**
```json
{
  "name": "Budi Santoso",
  "email": "budi@email.com",
  "password": "Password1!",
  "phone": "08123456789"
}
```
Validasi password: min 8 karakter, 1 huruf kapital, 1 angka, 1 simbol.
Validasi telepon: format Indonesia (`08xxx`, `+628xxx`, `628xxx`).

**Response `POST /auth/login`:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": { "id": "...", "name": "...", "email": "...", "role": "PUBLIC" }
  }
}
```

### Laporan

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/reports` | — | Daftar laporan (paginasi + filter) |
| `GET` | `/reports/:id` | Opsional | Detail laporan |
| `GET` | `/reports/map-markers` | — | Marker dalam bounding box |
| `GET` | `/reports/nearby` | — | Laporan terdekat dari koordinat |
| `POST` | `/reports` | Bearer | Buat laporan baru (`multipart/form-data`) |
| `PATCH` | `/reports/:id` | Bearer | Edit laporan (pemilik atau ADMIN) |
| `PATCH` | `/reports/:id/status` | VERIFIER/ADMIN | Update status laporan |
| `DELETE` | `/reports/:id` | Bearer | Hapus laporan |

**Query `GET /reports`:**
```
cursor, limit, status, damageType, severity, regionId, dateFrom, dateTo, search
```

**Query `GET /reports/map-markers`:**
```
swLat, swLng, neLat, neLng  (bounding box, semua wajib)
```

**Query `GET /reports/nearby`:**
```
lat, lng, radius (meter, default 2000), limit (default 20)
```

**Body `POST /reports` (multipart/form-data):**
```
title, description, latitude, longitude, address
damageType: BERLUBANG | RETAK | AMBLAS | BANJIR | LONGSOR | LAINNYA
severity: 1–5
isAnonymous: true | false
regionId (opsional)
photos[]: 1–5 file, maks 10MB/file, format JPEG/PNG/WebP
```

**Transisi status yang valid:**
```
PENDING     → VERIFIED, REJECTED
VERIFIED    → IN_PROGRESS, REJECTED
IN_PROGRESS → RESOLVED, REJECTED
RESOLVED    → (terminal, tidak bisa diubah)
REJECTED    → (terminal, tidak bisa diubah)
```

### User

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/users` | ADMIN | Daftar semua user |
| `GET` | `/users/:id` | Bearer | Detail user |
| `PATCH` | `/users/:id` | Bearer | Update profil |
| `PATCH` | `/users/:id/role` | ADMIN | Ubah peran user |

---

## Variabel Lingkungan

### Backend (`backend/.env`)

| Variabel | Wajib | Default | Deskripsi |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | ✅ | — | Secret access token (min 32 karakter) |
| `JWT_REFRESH_SECRET` | ✅ | — | Secret refresh token (berbeda dari access) |
| `FRONTEND_URL` | ✅ | — | Origin untuk CORS |
| `API_BASE_URL` | ✅ | — | Base URL untuk URL foto publik |
| `PORT` | — | `3001` | Port server |
| `UPLOAD_DIR` | — | `uploads` | Folder upload lokal |
| `MAX_FILE_SIZE` | — | `10485760` | Maks ukuran file (bytes) |
| `STORAGE_TYPE` | — | `local` | `local` \| `minio` \| `s3` |

### Frontend (`frontend/.env.local`)

| Variabel | Wajib | Default | Deskripsi |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | — | URL backend API |
| `NEXT_PUBLIC_MAP_DEFAULT_LAT` | — | `-6.2088` | Latitude pusat peta |
| `NEXT_PUBLIC_MAP_DEFAULT_LNG` | — | `106.8456` | Longitude pusat peta |
| `NEXT_PUBLIC_MAP_DEFAULT_ZOOM` | — | `12` | Zoom level peta |

---

## Peran Pengguna

| Peran | Kemampuan |
|---|---|
| `PUBLIC` | Daftar · Login · Buat laporan · Edit/hapus laporan sendiri |
| `VERIFIER` | Semua PUBLIC + Update status laporan · Akses dashboard admin |
| `ADMIN` | Semua VERIFIER + Kelola user · Hapus laporan siapapun · Ubah peran user |

> Akun VERIFIER dan ADMIN dibuat manual melalui Prisma Studio (`npm run prisma:studio`) atau query langsung ke database.

---

## Deployment Production

### Prasyarat Server

- VPS dengan AlmaLinux 9 / Ubuntu 22
- Node.js ≥ 20, PM2, Nginx, Certbot
- PostgreSQL + PostGIS
- Domain yang DNS-nya sudah diarahkan ke IP VPS

### Setup Pertama Kali

```bash
# Di server VPS
mkdir -p /root/apps/jalanrusak_id /apps/logs
cd /root/apps/jalanrusak_id
git clone <url-repo> .

# Isi environment files production
cp backend/.env.example backend/.env          # sesuaikan semua nilai
cp frontend/.env.example frontend/.env.local  # NEXT_PUBLIC_API_URL → domain API

# Build & start
cd backend && npm ci && npm run build
cd ../frontend && npm ci --legacy-peer-deps && npm run build
pm2 start /root/apps/jalanrusak_id/ecosystem.config.js
pm2 save && pm2 startup
```

### Nginx Reverse Proxy

```nginx
# /etc/nginx/conf.d/jalanrusak.conf

server {
    server_name jalan-rusak.andifawicaksono.cloud;
    location / {
        proxy_pass         http://localhost:3001;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
    }
}

server {
    server_name api.jalan-rusak.andifawicaksono.cloud;
    client_max_body_size 15M;
    location / {
        proxy_pass         http://localhost:5000;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
    }
}
```

```bash
nginx -t && systemctl reload nginx
certbot --nginx \
  -d jalan-rusak.andifawicaksono.cloud \
  -d api.jalan-rusak.andifawicaksono.cloud
```

### CI/CD Otomatis (GitHub Actions)

Setiap push ke branch `main` otomatis deploy ke VPS. Tambahkan secrets di **Settings → Secrets → Actions**:

| Secret | Nilai |
|---|---|
| `VPS_HOST` | IP address VPS |
| `VPS_USER` | Username SSH (contoh: `root`) |
| `VPS_SSH_KEY` | Isi private key SSH (`cat ~/.ssh/id_rsa`) |

### Perintah PM2

```bash
pm2 status                     # Cek status semua proses
pm2 logs jalanrusak-backend    # Lihat log backend
pm2 logs jalanrusak-frontend   # Lihat log frontend
pm2 reload jalanrusak-backend  # Reload tanpa downtime
pm2 reload jalanrusak-frontend
```

---

## Mengganti Storage Foto

Storage menggunakan interface `IStorageProvider` di `backend/src/middleware/upload.middleware.ts`. Cukup ubah `STORAGE_TYPE` di `.env`:

| Nilai | Keterangan |
|---|---|
| `local` | Simpan di folder `uploads/` lokal (default) |
| `minio` | MinIO object storage (install: `npm install minio`) |
| `s3` | AWS S3 (install: `npm install @aws-sdk/client-s3`) |

Implementasi MinIO dan S3 sudah tersedia sebagai stub di file yang sama — aktifkan dengan uncomment kodenya.
