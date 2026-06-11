import { Router } from 'express';
import authRoute from './auth.route';
import reportRoutes from './report.routes';
import userRoutes from './user.routes';

/**
 * Router utama — dimount di /api/v1 oleh src/index.ts
 *
 * Semua sub-router terdaftar di sini dengan prefix masing-masing.
 */
export const routes = Router();

routes.use('/auth', authRoute);       // /api/v1/auth/...
routes.use('/reports', reportRoutes); // /api/v1/reports/...
routes.use('/users', userRoutes);     // /api/v1/users/...
