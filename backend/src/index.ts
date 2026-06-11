import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
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
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true, // Izinkan cookie dan Authorization header
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
app.use(
  '/uploads',
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
