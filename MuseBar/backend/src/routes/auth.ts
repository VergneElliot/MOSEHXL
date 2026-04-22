// Middleware re-exports only. Session routes (login, register, password) live in
// `authSession.ts` and are mounted from `app.ts` — that split avoids circular
// imports when `app` → feature routes → this file: loading guards must not pull
// in auth session handlers before `middleware/auth` re-exports are ready.

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
