import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import dotenv from 'dotenv';
import { routes } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware';

// Muat .env sebelum mengakses process.env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware Keamanan ───────────────────────────────────────────

// Helmet: tambahkan HTTP security headers (XSS protection, CSP, dll)
app.use(helmet());

// CORS: izinkan request dari domain frontend
// FRONTEND_URL bisa berisi beberapa origin dipisahkan koma:
// FRONTEND_URL=https://domain.com,http://103.x.x.x:3001
const rawOrigins = process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = new Set(rawOrigins.split(',').map((o) => o.trim()));

app.use(
  cors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (curl, server-to-server, mobile)
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' tidak diizinkan`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);

// ─── Middleware Logging & Parsing ──────────────────────────────────

// Morgan: log setiap request HTTP (format ringkas untuk dev, lengkap untuk prod)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Parse request body JSON dan form data
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Static Files (Foto Upload) ────────────────────────────────────

// Serve folder uploads agar foto dapat diakses via GET /uploads/namafile.jpg
// Cross-Origin-Resource-Policy diset ke 'cross-origin' agar browser bisa memuat
// foto langsung dari domain/port yang berbeda (misal: localhost:3001 dari localhost:3000)
app.use(
  '/uploads',
  (_req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(path.resolve(process.env.UPLOAD_DIR || 'uploads')),
);

// ─── API Routes ────────────────────────────────────────────────────

app.use('/api/v1', routes);

// ─── Health Check ──────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// ─── Error Handlers (harus didaftarkan setelah routes) ────────────

app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server ──────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
  console.log(`Lingkungan: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
