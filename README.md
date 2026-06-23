# JalanRusak — Platform Pelaporan Jalan Rusak Berbasis Komunitas

Aplikasi web fullstack untuk pelaporan dan pengelolaan kondisi jalan rusak. Warga dapat mengirim laporan lengkap dengan foto dan lokasi GPS; verifikator lapangan, verifikator admin, dan super admin mengelola status penanganan.

## Fitur Utama

- **Pelaporan geotagged** — pin lokasi di peta interaktif + foto bukti (kamera langsung atau gallery)
- **Peta laporan real-time** — marker berkluster berdasarkan viewport, filter severity & tipe kerusakan
- **Alur status penanganan** — `PENDING → VERIFIED → IN_PROGRESS → RESOLVED | REJECTED`
- **Progress penanganan dengan bukti foto** — petugas lapangan wajib upload foto saat mengubah status ke `IN_PROGRESS` dan `RESOLVED`
- **Antrian laporan lapangan** — halaman khusus Verifikator Lapangan dengan prioritas otomatis (`VERIFIED → IN_PROGRESS → PENDING → ...`)
- **RBAC 4 peran** — `PUBLIC`, `VERIFIER` (admin), `FIELD_VERIFIER` (lapangan), `ADMIN` (super admin)
- **Manajemen user** — Super Admin dapat membuat, mengedit, mengubah role, dan mengelola status akun user (`ACTIVE / DISABLED / BANNED`)
- **Audit Log** — Setiap aktivitas kritis (login, ubah role, verifikasi laporan, dll) dicatat otomatis dan dapat dilihat di halaman Settings
- **Validasi status akun** — user dengan status `DISABLED` atau `BANNED` diblokir saat login (termasuk Google OAuth dan refresh token)
- **Upload foto pintar** — kompresi otomatis ke WebP via Sharp, mendukung Local / MinIO / AWS S3
- **Auth JWT** — access token (1 jam) + refresh token (7 hari) dengan rotasi session
- **Login dengan Google** — OAuth 2.0; akun baru dibuat otomatis, akun lama ter-link berdasarkan email
- **Shared validation** — aturan validasi password/email/nama digunakan bersama di Register, Create User, dan Edit User

## Tech Stack

| Layer | Teknologi |
|---|---|
| Backend | Node.js · Express · TypeScript · Prisma ORM |
| Database | PostgreSQL + PostGIS (geometri spasial) |
| Frontend | Next.js 15 (App Router) · React 19 · TypeScript |
| Styling | Tailwind CSS · Shadcn/ui (Radix Primitives) |
| Peta | Leaflet · react-leaflet · react-leaflet-cluster |
| State | Zustand · SWR |
| Auth | JWT (jsonwebtoken) · bcryptjs · Google OAuth 2.0 |
| Upload | Multer · Sharp |
| Form | react-hook-form · Zod |
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

> Backend tidak membutuhkan `GOOGLE_CLIENT_ID`. Verifikasi token Google dilakukan langsung ke endpoint `https://www.googleapis.com/oauth2/v3/userinfo`.

```bash
# Generate Prisma client
npm run prisma:generate

# Jalankan migrasi database awal
npm run prisma:migrate

# Jalankan migrasi fitur tambahan (Google OAuth, Field Verifier, Settings)
psql -U postgres -d jalanrusak -f prisma/migrations/add_google_oauth.sql
psql -U postgres -d jalanrusak -f prisma/migrations/add_field_verifier.sql
psql -U postgres -d jalanrusak -f prisma/migrations/add_settings_features.sql

# Regenerate Prisma client setelah migrasi manual (hentikan dev server dulu)
npm run prisma:generate

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

# Google OAuth — dapatkan dari Google Cloud Console
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
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
│   ├── utils/          # jwt.util, response helper, storage abstraction, user.schema (shared Zod)
│   └── index.ts        # Entry point — setup Express, CORS, static files
├── backend/prisma/
│   ├── schema.prisma                     # Definisi model Prisma
│   └── migrations/
│       ├── add_google_oauth.sql          # Kolom provider + provider_id
│       ├── add_field_verifier.sql        # Enum field_verifier
│       └── add_settings_features.sql    # Kolom account_status + tabel audit_logs
├── frontend/
│   ├── app/
│   │   ├── (public)/       # Halaman publik: landing, peta, daftar laporan, detail laporan
│   │   ├── (auth)/         # Login, register (unauthenticated only)
│   │   └── (dashboard)/    # Halaman terproteksi:
│   │       ├── dashboard/      # Ringkasan admin/verifier
│   │       ├── lapangan/       # Antrian laporan (FIELD_VERIFIER + ADMIN)
│   │       ├── reports/        # Laporan saya + wizard buat laporan
│   │       ├── users/          # Kelola user (legacy, digantikan settings)
│   │       └── settings/       # Super Admin only
│   │           ├── page.tsx           # Statistik overview
│   │           ├── users/page.tsx     # Manajemen user (create, edit, role, status)
│   │           └── audit-logs/page.tsx # Audit log viewer
│   ├── components/
│   │   ├── layout/     # Navbar, Sidebar
│   │   ├── map/        # Komponen Leaflet (semua dynamic import ssr:false)
│   │   ├── reports/    # Wizard laporan: LocationPicker, DamageForm, PhotoUpload, ReportCard
│   │   └── dashboard/  # Tabel laporan, stats, modal status
│   ├── lib/
│   │   ├── axios.ts          # apiClient singleton + interceptor auth
│   │   ├── utils.ts          # Helper: formatDate, getRoleDisplayName, getRoleBadgeClass, dll
│   │   └── userValidation.ts # Shared Zod schemas: registerSchema, adminCreateUserSchema, adminEditUserSchema
│   ├── store/          # Zustand: authStore, reportStore, reportFormStore
│   └── types/          # TypeScript type definitions (User, Report, AuditLog, AdminStats, dll)
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
| `POST` | `/auth/login` | — | Login email + password |
| `POST` | `/auth/google` | — | Login / daftar via Google OAuth |
| `POST` | `/auth/refresh` | — | Perbarui access token |
| `GET` | `/auth/me` | Bearer | Profil user aktif |
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

> Login akan mengembalikan error `403` jika akun berstatus `DISABLED` ("Akun Anda telah dinonaktifkan.") atau `BANNED` ("Akun Anda telah diblokir."). Berlaku juga untuk Google OAuth dan refresh token.

### Laporan

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/reports` | — | Daftar laporan publik (cursor-based pagination) |
| `GET` | `/reports/map-markers` | — | Marker dalam bounding box |
| `GET` | `/reports/nearby` | — | Laporan terdekat dari koordinat |
| `GET` | `/reports/my` | Bearer | Laporan milik user sendiri (page-based) |
| `GET` | `/reports/queue` | VERIFIER/FIELD_VERIFIER/ADMIN | Antrian laporan berurutan prioritas |
| `GET` | `/reports/:id` | Opsional | Detail laporan |
| `POST` | `/reports` | Bearer | Buat laporan baru (`multipart/form-data`) |
| `PATCH` | `/reports/:id/status` | VERIFIER/ADMIN | Update status laporan |
| `POST` | `/reports/:id/progress` | FIELD_VERIFIER/ADMIN | Update progress dengan foto bukti |
| `DELETE` | `/reports/:id` | Bearer | Hapus laporan |

**Query `GET /reports/queue`:**
```
page, limit, search, status
```
Diurutkan otomatis: `VERIFIED → IN_PROGRESS → PENDING → RESOLVED → REJECTED`

**Body `POST /reports/:id/progress` (multipart/form-data):**
```
status: IN_PROGRESS | RESOLVED
notes (opsional)
photos[]: 1–5 foto wajib sebagai bukti penanganan
```

**Transisi status yang valid:**
```
PENDING     → VERIFIED, REJECTED
VERIFIED    → IN_PROGRESS, REJECTED
IN_PROGRESS → RESOLVED, REJECTED
RESOLVED    → (terminal)
REJECTED    → (terminal)
```

### User

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/users` | ADMIN | Daftar semua user |
| `GET` | `/users/:id` | Bearer | Detail user |
| `PATCH` | `/users/:id` | Bearer | Update profil |
| `PATCH` | `/users/:id/role` | ADMIN | Ubah peran user |

### Settings (Super Admin only)

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/settings/stats` | ADMIN | Statistik user (per role & per status) |
| `GET` | `/settings/users` | ADMIN | Daftar user dengan pagination + filter |
| `POST` | `/settings/users` | ADMIN | Buat user baru |
| `PATCH` | `/settings/users/:id` | ADMIN | Edit data user (nama, email, role, password opsional) |
| `PATCH` | `/settings/users/:id/role` | ADMIN | Ubah role user |
| `PATCH` | `/settings/users/:id/status` | ADMIN | Ubah status akun (ACTIVE/DISABLED/BANNED) |
| `GET` | `/settings/audit-logs` | ADMIN | Daftar audit log dengan pagination + filter |

**Query `GET /settings/users`:**
```
page, limit, search (nama/email), role, status
```

**Body `POST /settings/users`:**
```json
{
  "name": "Nama Lengkap",
  "email": "email@domain.com",
  "password": "Password1!",
  "role": "PUBLIC | VERIFIER | FIELD_VERIFIER | ADMIN",
  "phone": "08xxx (opsional)"
}
```
Validasi identik dengan endpoint register.

**Body `PATCH /settings/users/:id`:**
```json
{
  "name": "Nama Baru",
  "email": "email@baru.com",
  "role": "VERIFIER",
  "phone": "08xxx (opsional)",
  "password": "PasswordBaru1! (opsional — kosongkan jika tidak diubah)"
}
```

**Body `PATCH /settings/users/:id/status`:**
```json
{ "status": "ACTIVE | DISABLED | BANNED" }
```

**Query `GET /settings/audit-logs`:**
```
page, limit, search (nama/email/aksi/deskripsi), action, role, dateFrom, dateTo
```

**Aksi yang dicatat di Audit Log:**
- Auth: `AUTH_REGISTER`, `AUTH_LOGIN`, `AUTH_GOOGLE_LOGIN`, `AUTH_LOGOUT`
- User: `USER_CREATE`, `USER_UPDATE_ROLE`, `USER_ENABLE`, `USER_DISABLE`, `USER_BAN`
- Laporan: `REPORT_CREATE`, `REPORT_VERIFY`, `REPORT_REJECT`, `REPORT_IN_PROGRESS`, `REPORT_RESOLVED`, `REPORT_DELETE`

---

## ENV Variable

### Backend (`backend/.env`)

| Variabel | Wajib | Default | Deskripsi |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | ✅ | — | Secret access token (min 32 karakter) |
| `JWT_REFRESH_SECRET` | ✅ | — | Secret refresh token (berbeda dari access) |
| `FRONTEND_URL` | ✅ | — | Origin untuk CORS |
| `API_BASE_URL` | ✅ | — | Base URL untuk URL foto publik — harus domain yang melayani `/uploads` |
| `PORT` | — | `3001` | Port server |
| `UPLOAD_DIR` | — | `uploads` | Folder upload lokal |
| `MAX_FILE_SIZE` | — | `10485760` | Maks ukuran file (bytes) |
| `STORAGE_TYPE` | — | `local` | `local` \| `minio` \| `s3` |

### Frontend (`frontend/.env.local`)

| Variabel | Wajib | Default | Deskripsi |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | — | URL backend API |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | ✅ | — | Client ID dari Google Cloud Console |
| `NEXT_PUBLIC_MAP_DEFAULT_LAT` | — | `-6.2088` | Latitude pusat peta |
| `NEXT_PUBLIC_MAP_DEFAULT_LNG` | — | `106.8456` | Longitude pusat peta |
| `NEXT_PUBLIC_MAP_DEFAULT_ZOOM` | — | `12` | Zoom level peta |

---

## Peran Pengguna

| Peran | Kemampuan |
|---|---|
| `PUBLIC` | Daftar · Login (email atau Google) · Buat laporan · Edit/hapus laporan sendiri |
| `VERIFIER` | Semua PUBLIC + Verifikasi/tolak laporan · Akses dashboard admin |
| `FIELD_VERIFIER` | Semua PUBLIC + Lihat semua laporan (antrian) · Update status ke IN_PROGRESS & RESOLVED dengan foto bukti |
| `ADMIN` | Semua VERIFIER + Semua FIELD_VERIFIER + Kelola user (via Settings) · Hapus laporan siapapun · Akses audit log |

> Akun baru mendapat role `PUBLIC` secara default. Role dapat diubah oleh ADMIN melalui halaman **Settings → Kelola User**.
> Akun dengan status `DISABLED` tidak dapat login sampai diaktifkan kembali. Akun `BANNED` diblokir secara permanen.

---

## Migrasi Database

Jalankan migrasi secara berurutan setelah setup awal:

```bash
# 1. Migrasi Prisma standar (membuat tabel dasar)
cd backend && npm run prisma:migrate

# 2. Migrasi manual — jalankan satu per satu sesuai urutan
psql -U postgres -d jalanrusak -f prisma/migrations/add_google_oauth.sql
psql -U postgres -d jalanrusak -f prisma/migrations/add_field_verifier.sql
psql -U postgres -d jalanrusak -f prisma/migrations/add_settings_features.sql

# 3. Regenerate Prisma client (hentikan dev server dulu untuk menghindari DLL lock)
npm run prisma:generate
```

---

## Setup Google OAuth

### 1. Buat Credentials di Google Cloud Console

1. Buka [console.cloud.google.com](https://console.cloud.google.com) → buat project baru (atau pilih yang ada)
2. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Tambahkan **Authorized JavaScript Origins**:
   - `http://localhost:3000` (development)
   - `https://jalan-rusak.andifawicaksono.cloud` (production)
5. Salin **Client ID** yang dihasilkan

### 2. Tambahkan ke Environment

```env
# frontend/.env.local
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

Backend **tidak** membutuhkan Google Client ID — verifikasi dilakukan dengan memanggil `https://www.googleapis.com/oauth2/v3/userinfo`.

---

## Deployment Production

### Prasyarat Server

- VPS dengan AlmaLinux 9 / Ubuntu 22
- Node.js ≥ 20, PM2, Apache2 (httpd), Certbot
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

# Jalankan semua migrasi
cd backend
npm run prisma:migrate
psql "$DATABASE_URL" -f prisma/migrations/add_google_oauth.sql
psql "$DATABASE_URL" -f prisma/migrations/add_field_verifier.sql
psql "$DATABASE_URL" -f prisma/migrations/add_settings_features.sql
npm run prisma:generate

# Build & start
npm run build
cd ../frontend && npm ci --legacy-peer-deps && npm run build
pm2 start /root/apps/jalanrusak_id/ecosystem.config.js
pm2 save && pm2 startup
```

### Apache Reverse Proxy

```bash
# AlmaLinux: /etc/httpd/conf.d/jalanrusak.conf
# Ubuntu:    /etc/apache2/sites-available/jalanrusak.conf
```

```apache
# Single domain — frontend dan API di domain yang sama (path-based routing)
# PENTING: urutan ProxyPass sangat menentukan — lebih spesifik harus di atas.
<VirtualHost *:80>
    ServerName jalan-rusak.andifawicaksono.cloud

    LimitRequestBody 15728640
    ProxyPreserveHost On

    # 1. Static uploads backend — wajib sebelum ProxyPass /
    ProxyPass        /uploads http://localhost:5000/uploads
    ProxyPassReverse /uploads http://localhost:5000/uploads

    # 2. API backend — wajib sebelum ProxyPass /
    ProxyPass        /api/v1 http://localhost:5000/api/v1
    ProxyPassReverse /api/v1 http://localhost:5000/api/v1

    # 3. Frontend Next.js (catch-all, paling terakhir)
    ProxyPass        / http://localhost:3001/
    ProxyPassReverse / http://localhost:3001/

    RequestHeader set X-Forwarded-Proto "http"
</VirtualHost>
```

```env
# frontend/.env.local
NEXT_PUBLIC_API_URL=https://jalan-rusak.andifawicaksono.cloud/api/v1

# backend/.env
API_BASE_URL=https://jalan-rusak.andifawicaksono.cloud
```

```bash
# AlmaLinux
httpd -t && systemctl reload httpd

# Ubuntu
a2ensite jalanrusak
apache2ctl configtest && systemctl reload apache2
```

Pasang SSL dengan Certbot:

```bash
# AlmaLinux
dnf install -y python3-certbot-apache
certbot --apache -d jalan-rusak.andifawicaksono.cloud
```

> **Penting:** Setelah Certbot menambahkan blok `<VirtualHost *:443>`, pastikan `LimitRequestBody 15728640` dan urutan ProxyPass yang sama juga ada di blok HTTPS tersebut.

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

Storage menggunakan interface `IStorageProvider` di `backend/src/utils/storage.ts`. Cukup ubah `STORAGE_TYPE` di `.env`:

| Nilai | Keterangan |
|---|---|
| `local` | Simpan di folder `uploads/` lokal (default) |
| `minio` | MinIO object storage (install: `npm install minio`) |
| `s3` | AWS S3 (install: `npm install @aws-sdk/client-s3`) |

Implementasi MinIO dan S3 tersedia sebagai stub — aktifkan dengan mengimplementasi `IStorageProvider` dan mendaftarkannya di `createStorageProvider()`.
