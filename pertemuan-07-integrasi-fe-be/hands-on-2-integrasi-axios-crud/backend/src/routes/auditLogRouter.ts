
import { Router } from 'express';
import { AuditLogController } from '../controllers/auditLogController.ts';
import { authenticate } from '../middlewares/auth.ts';
import { authorize } from '../middlewares/authorize.ts';
import { validate } from '../middlewares/validate.ts';
import {
  auditIdSchema,
  auditQuerySchema,
} from '../schemas/auditSchema.ts';

const auditLogRouter = Router();
const auditLogController = new AuditLogController();

// Semua endpoint audit log hanya bisa diakses Admin.
auditLogRouter.use(authenticate, authorize('admin'));

// GET /api/audit-logs
auditLogRouter.get(
  '/',
  validate(auditQuerySchema, 'query'),
  auditLogController.list,
);

// GET /api/audit-logs/:id
auditLogRouter.get(
  '/:id',
  validate(auditIdSchema, 'params'),
  auditLogController.detail,
);

export { auditLogRouter };
