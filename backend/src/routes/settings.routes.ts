import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import * as settingsController from '../controllers/settings.controller';

const router = Router();

// Semua endpoint /settings wajib login dan hanya ADMIN
router.use(authenticateToken, requireRole('ADMIN'));

// ─── Stats ────────────────────────────────────────────────────────
router.get('/stats', settingsController.getStats);

// ─── User Management ──────────────────────────────────────────────
router.get('/users',              settingsController.getUsers);
router.post('/users',             settingsController.createUser);
router.patch('/users/:id',        settingsController.updateUser);
router.patch('/users/:id/role',   settingsController.changeUserRole);
router.patch('/users/:id/status', settingsController.changeUserStatus);

// ─── Audit Logs (read-only) ───────────────────────────────────────
router.get('/audit-logs', settingsController.getAuditLogs);

export default router;
