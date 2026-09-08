import express from 'express';
import { getEstablishmentId, requireAuth, requireEstablishmentAdminOrPermission } from './auth';
import { P } from '../permissions/registry';
import {
  asyncHandler,
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../middleware/errorHandler';
import { UserModel } from '../models/user';
import { MembershipModel } from '../models/membership';
import {
  describeAccountFootprint,
  purgeStaffAccount,
  reactivateStaffAccount,
} from '../services/auth/staffAccountLifecycle';
import { logActorAction } from '../services/audit/auditActorLog';

/**
 * Staff account lifecycle beyond deactivation: inspecting what an account left behind,
 * reactivating it, and the narrow hard-delete for accounts that never did anything.
 */
const router = express.Router();
const canManageUsers = requireEstablishmentAdminOrPermission(P.access_user_management);

router.use(requireAuth, canManageUsers);

function parseUserId(raw: string | undefined): number {
  const userId = Number.parseInt(raw ?? '', 10);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new ValidationError('userId must be a positive integer');
  }
  return userId;
}

async function assertBelongsToEstablishment(
  userId: number,
  establishmentId: string
): Promise<void> {
  const membership = await MembershipModel.getIncludingInactive(userId, establishmentId);
  if (!membership) {
    throw new AuthorizationError('User does not belong to your establishment');
  }
}

/**
 * Members of the establishment, deactivated ones included so they can be reactivated or purged.
 * Service-facing lists (waiter pickers, planning) use the active-only model method instead.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    res.json(
      await MembershipModel.listUsersForEstablishment(establishmentId, { includeInactive: true })
    );
  })
);

/** What the account left behind, and therefore whether it can still be deleted outright. */
router.get(
  '/:id/footprint',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const userId = parseUserId(req.params.id);
    await assertBelongsToEstablishment(userId, establishmentId);
    res.json({ success: true, data: await describeAccountFootprint(userId, establishmentId) });
  })
);

router.post(
  '/:id/reactivate',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const userId = parseUserId(req.params.id);

    const reactivated = await reactivateStaffAccount(userId, establishmentId);
    if (!reactivated) throw new NotFoundError('Membership not found');

    await logActorAction(req, {
      action_type: 'REACTIVATE_USER',
      resource_type: 'USER',
      resource_id: String(userId),
      establishment_id: establishmentId,
    });

    res.json({ success: true, user_id: userId });
  })
);

/**
 * Hard delete. Refused with 409 as soon as the account has any recorded activity — those
 * accounts stay deactivated so past orders and journal entries remain attributable.
 */
router.delete(
  '/:id/purge',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const userId = parseUserId(req.params.id);

    if (userId === req.user!.id) {
      throw new ValidationError('You cannot purge your own account');
    }
    await assertBelongsToEstablishment(userId, establishmentId);

    const email = (await UserModel.findById(userId))?.email ?? null;
    const { purged, footprint } = await purgeStaffAccount(userId, establishmentId);
    if (!purged) {
      throw new ConflictError(
        'Ce compte a une activité enregistrée et ne peut pas être supprimé ; il reste désactivé. ' +
          `Activité : ${footprint.orders} commande(s), ${footprint.journal_entries} entrée(s) ` +
          `de journal, ${footprint.time_entries} pointage(s).`
      );
    }

    await logActorAction(req, {
      action_type: 'PURGE_USER',
      resource_type: 'USER',
      resource_id: String(userId),
      establishment_id: establishmentId,
      action_details: { purged_email: email },
    });

    res.json({ success: true, user_id: userId });
  })
);

export default router;
