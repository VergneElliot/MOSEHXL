import express from 'express';

// Middleware lives in middleware/auth.ts (single source of truth).
// Re-exported here so existing `import { requireAuth } from '../routes/auth'`
// statements keep working without a mass-rename.
export {
  generateToken,
  getEstablishmentId,
  requireAuth,
  requireAdmin,
  requireEstablishmentAdmin,
  requirePermission,
  requireAnyPermission,
  requireEstablishmentAdminOrPermission,
} from '../middleware/auth';
export type { JwtPayload } from '../middleware/auth';

import loginRouter from './authLogin';
import registerRouter from './authRegister';
import passwordRouter from './authPassword';

const router = express.Router();

// Mount sub-routers that handle the actual route logic.
router.use(loginRouter);
router.use(registerRouter);
router.use(passwordRouter);

export default router;

