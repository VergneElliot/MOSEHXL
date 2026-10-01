import express from 'express';
import {
  getEstablishmentId,
  requireAuth,
  requireEstablishmentAdmin,
  requireEstablishmentAdminOrPermission,
} from '../auth';
import { P } from '../../permissions/registry';
import {
  asyncHandler,
  NotFoundError,
  ValidationError,
  AppError,
} from '../../middleware/errorHandler';
import { readOptionalPinActor } from '../../middleware/pinActor';
import { UserModel } from '../../models/user';
import {
  TimeClockNetworkSettingsModel,
  TimeEntryModel,
  isIpAllowed,
  isValidIpOrCidr,
  normalizeAllowedIps,
} from '../../models/timeEntry';
import {
  buildComplianceReport,
  buildPayrollCsv,
  checkPunchLeaveConflict,
} from '../../services/labor/laborReportService';
import {
  buildAccountantCsv,
  buildPayrollSummary,
} from '../../services/labor/payrollReportService';

const router = express.Router();

function clientIp(req: express.Request): string | null {
  const raw = req.ip || req.socket.remoteAddress || null;
  if (!raw) return null;
  return raw.startsWith('::ffff:') ? raw.slice(7) : raw;
}

async function assertOnVenueNetwork(
  establishmentId: string,
  req: express.Request
): Promise<{ ip: string | null; allowed: boolean; allowed_ips: string[] }> {
  const network = await TimeClockNetworkSettingsModel.get(establishmentId);
  const ip = clientIp(req);
  const allowed = isIpAllowed(ip, network.allowed_ips);
  return { ip, allowed, allowed_ips: network.allowed_ips };
}

/** Status for the active PIN badge when present, else the venue-login account. */
function resolveTimeClockUserId(req: express.Request): number {
  const actor = req.pinActor ?? readOptionalPinActor(req);
  if (actor?.id != null) {
    const pinUserId = Number(actor.id);
    if (Number.isFinite(pinUserId) && pinUserId > 0) return pinUserId;
  }
  const accountId = Number(req.user?.id);
  if (!Number.isFinite(accountId) || accountId <= 0) {
    throw new ValidationError('Utilisateur invalide');
  }
  return accountId;
}

/** Self-service: any authenticated establishment member. */
router.get(
  '/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const userId = resolveTimeClockUserId(req);

    const network = await assertOnVenueNetwork(establishmentId, req);
    const open = await TimeEntryModel.getOpenEntry(establishmentId, userId);

    return res.json({
      open_entry: open,
      on_venue_network: network.allowed,
      client_ip: network.ip,
      allowed_ips_configured: network.allowed_ips.length > 0,
    });
  })
);

router.post(
  '/clock-in',
  requireAuth,
  asyncHandler(async (_req, res) => {
    throw new AppError(
      'Le pointage se fait en ouvrant un badge PIN. Utilisez le pavé PIN pour pointer l’entrée.',
      410,
      'TIME_CLOCK_VIA_PIN_ONLY'
    );
  })
);

router.post(
  '/clock-out',
  requireAuth,
  asyncHandler(async (_req, res) => {
    throw new AppError(
      'Le pointage de sortie se fait en fermant le badge PIN. Libérez vos tables ouvertes avant.',
      410,
      'TIME_CLOCK_VIA_PIN_ONLY'
    );
  })
);

/** Shared terminal punch: session user must be on venue network; target user authenticates with password. */
router.get(
  '/staff',
  requireAuth,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const users = await UserModel.listUsersByEstablishment(establishmentId);
    const open = await TimeEntryModel.listCurrentlyClockedIn(establishmentId);
    const openByUser = new Map(open.map((e) => [e.user_id, e]));
    return res.json({
      staff: users.map((u) => ({
        id: u.id,
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        role: u.role,
        open_entry: openByUser.get(u.id) ?? null,
      })),
    });
  })
);

router.post(
  '/punch',
  requireAuth,
  asyncHandler(async (_req, _res) => {
    throw new AppError(
      'Le pointage partagé est désactivé. Ouvrir ou fermer un badge PIN pointe automatiquement.',
      410,
      'TIME_CLOCK_VIA_PIN_ONLY'
    );
  })
);

/** Admin / planning: reports + corrections. */
router.get(
  '/entries',
  requireAuth,
  requireEstablishmentAdminOrPermission(P.access_planning),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const from = typeof req.query.from === 'string' ? req.query.from : '';
    const to = typeof req.query.to === 'string' ? req.query.to : '';
    if (!from || !to) throw new ValidationError('from and to are required (ISO datetimes)');
    const userId =
      typeof req.query.user_id === 'string' ? parseInt(req.query.user_id, 10) : undefined;

    const entries = await TimeEntryModel.list(establishmentId, {
      from,
      to,
      userId: Number.isFinite(userId) ? userId : undefined,
    });
    const totals = await TimeEntryModel.totalsByUser(establishmentId, {
      from,
      to,
      userId: Number.isFinite(userId) ? userId : undefined,
    });
    return res.json({ entries, totals });
  })
);

router.get(
  '/payroll-summary',
  requireAuth,
  requireEstablishmentAdminOrPermission(P.access_planning),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const from = typeof req.query.from === 'string' ? req.query.from : '';
    const to = typeof req.query.to === 'string' ? req.query.to : '';
    if (!from || !to) throw new ValidationError('from and to are required (ISO datetimes)');
    const report = await buildPayrollSummary(establishmentId, from, to);
    return res.json(report);
  })
);

router.get(
  '/compliance',
  requireAuth,
  requireEstablishmentAdminOrPermission(P.access_planning),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const from = typeof req.query.from === 'string' ? req.query.from : '';
    const to = typeof req.query.to === 'string' ? req.query.to : '';
    if (!from || !to) throw new ValidationError('from and to are required (ISO datetimes)');
    const report = await buildComplianceReport(establishmentId, from, to);
    return res.json(report);
  })
);

router.get(
  '/export',
  requireAuth,
  requireEstablishmentAdminOrPermission(P.access_planning),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const from = typeof req.query.from === 'string' ? req.query.from : '';
    const to = typeof req.query.to === 'string' ? req.query.to : '';
    if (!from || !to) throw new ValidationError('from and to are required (ISO datetimes)');

    const format = typeof req.query.format === 'string' ? req.query.format : 'detail';
    if (format === 'accountant') {
      const report = await buildPayrollSummary(establishmentId, from, to);
      const csv = buildAccountantCsv(report);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="paie-${from.slice(0, 10)}-${to.slice(0, 10)}.csv"`
      );
      return res.send('\uFEFF' + csv);
    }

    const entries = await TimeEntryModel.list(establishmentId, { from, to });
    const totals = await TimeEntryModel.totalsByUser(establishmentId, { from, to });
    const csv = buildPayrollCsv(entries, totals);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="pointage-${from.slice(0, 10)}-${to.slice(0, 10)}.csv"`
    );
    return res.send('\uFEFF' + csv);
  })
);

router.patch(
  '/entries/:id',
  requireAuth,
  requireEstablishmentAdminOrPermission(P.access_planning),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const id = parseInt(req.params.id ?? '', 10);
    if (!Number.isFinite(id)) throw new ValidationError('Identifiant invalide');
    const adjusterId = Number(req.user?.id);
    if (!Number.isFinite(adjusterId)) throw new ValidationError('Utilisateur invalide');

    try {
      const entry = await TimeEntryModel.adminUpdate(establishmentId, id, {
        clock_in_at:
          typeof req.body.clock_in_at === 'string' ? req.body.clock_in_at : undefined,
        clock_out_at:
          req.body.clock_out_at === null
            ? null
            : typeof req.body.clock_out_at === 'string'
              ? req.body.clock_out_at
              : undefined,
        note: typeof req.body.note === 'string' ? req.body.note : undefined,
        adjusted_by: adjusterId,
      });
      if (!entry) throw new NotFoundError('Pointage introuvable');
      return res.json({ entry });
    } catch (error) {
      if ((error as Error & { code?: string }).code === 'TIME_ENTRY_INVALID_RANGE') {
        throw new ValidationError('La fin doit être postérieure au début');
      }
      throw error;
    }
  })
);

router.delete(
  '/entries/:id',
  requireAuth,
  requireEstablishmentAdminOrPermission(P.access_planning),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const id = parseInt(req.params.id ?? '', 10);
    if (!Number.isFinite(id)) throw new ValidationError('Identifiant invalide');
    const ok = await TimeEntryModel.delete(establishmentId, id);
    if (!ok) throw new NotFoundError('Pointage introuvable');
    return res.json({ success: true });
  })
);

/** Network allowlist settings — establishment admin only. */
router.get(
  '/network',
  requireAuth,
  requireEstablishmentAdmin,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const settings = await TimeClockNetworkSettingsModel.get(establishmentId);
    return res.json({
      ...settings,
      client_ip: clientIp(req),
    });
  })
);

router.put(
  '/network',
  requireAuth,
  requireEstablishmentAdmin,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;

    const current = await TimeClockNetworkSettingsModel.get(establishmentId);
    let ips = normalizeAllowedIps(
      Array.isArray(req.body.allowed_ips) ? req.body.allowed_ips : current.allowed_ips
    );

    if (req.body.capture_current === true) {
      const ip = clientIp(req);
      if (!ip || !isValidIpOrCidr(ip)) {
        throw new ValidationError("Impossible de déterminer l'IP publique actuelle");
      }
      if (!ips.includes(ip)) ips = [...ips, ip];
    }

    for (const ip of ips) {
      if (!isValidIpOrCidr(ip)) {
        throw new ValidationError(`Adresse IP / CIDR invalide: ${ip}`);
      }
    }

    const settings = await TimeClockNetworkSettingsModel.upsert(establishmentId, {
      allowed_ips: ips,
    });
    return res.json({
      ...settings,
      client_ip: clientIp(req),
    });
  })
);

export default router;
