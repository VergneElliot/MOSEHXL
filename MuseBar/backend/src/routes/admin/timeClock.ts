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
  AuthorizationError,
  NotFoundError,
  ValidationError,
  AppError,
} from '../../middleware/errorHandler';
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

/** Self-service: any authenticated establishment member. */
router.get(
  '/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const userId = Number(req.user?.id);
    if (!Number.isFinite(userId)) throw new ValidationError('Utilisateur invalide');

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
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const userId = Number(req.user?.id);
    if (!Number.isFinite(userId)) throw new ValidationError('Utilisateur invalide');

    const network = await assertOnVenueNetwork(establishmentId, req);
    if (!network.allowed_ips.length) {
      throw new AppError(
        "Aucune IP autorisée n'est configurée. Un administrateur doit enregistrer l'IP du réseau de l'établissement (Paramètres → Pointage).",
        403,
        'TIME_CLOCK_NETWORK_NOT_CONFIGURED'
      );
    }
    if (!network.allowed) {
      throw new AuthorizationError(
        "Pointage impossible hors du réseau de l'établissement."
      );
    }

    const leaveCheck = await checkPunchLeaveConflict(establishmentId, userId);
    if (leaveCheck.block) {
      throw new AppError(leaveCheck.message ?? 'Congé approuvé', 409, 'TIME_CLOCK_ON_LEAVE');
    }

    try {
      const entry = await TimeEntryModel.clockIn({
        establishmentId,
        userId,
        ip: network.ip,
        source: 'self',
      });
      return res.status(201).json({
        entry,
        leave_warning: leaveCheck.on_leave ? leaveCheck.message : undefined,
      });
    } catch (error) {
      const code = (error as Error & { code?: string }).code;
      if (code === 'TIME_ENTRY_ALREADY_OPEN' || code === '23505') {
        throw new AppError(
          'Un pointage est déjà ouvert pour cet utilisateur',
          409,
          'TIME_ENTRY_ALREADY_OPEN'
        );
      }
      throw error;
    }
  })
);

router.post(
  '/clock-out',
  requireAuth,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const userId = Number(req.user?.id);
    if (!Number.isFinite(userId)) throw new ValidationError('Utilisateur invalide');

    const network = await assertOnVenueNetwork(establishmentId, req);
    if (!network.allowed_ips.length) {
      throw new AppError(
        "Aucune IP autorisée n'est configurée. Un administrateur doit enregistrer l'IP du réseau de l'établissement (Paramètres → Pointage).",
        403,
        'TIME_CLOCK_NETWORK_NOT_CONFIGURED'
      );
    }
    if (!network.allowed) {
      throw new AuthorizationError(
        "Pointage impossible hors du réseau de l'établissement."
      );
    }

    const entry = await TimeEntryModel.clockOut({
      establishmentId,
      userId,
      ip: network.ip,
    });
    if (!entry) {
      throw new AppError('Aucun pointage ouvert', 409, 'TIME_ENTRY_NOT_OPEN');
    }
    return res.json({ entry });
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
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;

    const targetUserId = Number(req.body.user_id);
    const password = String(req.body.password || '');
    if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
      throw new ValidationError('user_id invalide');
    }
    if (!password) throw new ValidationError('Mot de passe requis');

    const network = await assertOnVenueNetwork(establishmentId, req);
    if (!network.allowed_ips.length) {
      throw new AppError(
        "Aucune IP autorisée n'est configurée. Un administrateur doit enregistrer l'IP du réseau de l'établissement.",
        403,
        'TIME_CLOCK_NETWORK_NOT_CONFIGURED'
      );
    }
    if (!network.allowed) {
      throw new AuthorizationError(
        "Pointage impossible hors du réseau de l'établissement."
      );
    }

    const belongs = await UserModel.userBelongsToEstablishment(
      targetUserId,
      establishmentId
    );
    if (!belongs) throw new NotFoundError('Employé');

    const targetUser = await UserModel.findById(targetUserId);
    if (!targetUser || !targetUser.is_active) {
      throw new NotFoundError('Employé');
    }
    const valid = await UserModel.verifyPassword(targetUser, password);
    if (!valid) {
      throw new AuthorizationError('Mot de passe incorrect');
    }

    const leaveCheck = await checkPunchLeaveConflict(establishmentId, targetUserId);
    if (leaveCheck.block) {
      throw new AppError(leaveCheck.message ?? 'Congé approuvé', 409, 'TIME_CLOCK_ON_LEAVE');
    }

    const open = await TimeEntryModel.getOpenEntry(establishmentId, targetUserId);
    if (open) {
      const entry = await TimeEntryModel.clockOut({
        establishmentId,
        userId: targetUserId,
        ip: network.ip,
      });
      return res.json({
        action: 'clock_out',
        entry,
        leave_warning: leaveCheck.on_leave ? leaveCheck.message : undefined,
      });
    }

    try {
      const entry = await TimeEntryModel.clockIn({
        establishmentId,
        userId: targetUserId,
        ip: network.ip,
        source: 'shared_terminal',
      });
      return res.status(201).json({
        action: 'clock_in',
        entry,
        leave_warning: leaveCheck.on_leave ? leaveCheck.message : undefined,
      });
    } catch (error) {
      const code = (error as Error & { code?: string }).code;
      if (code === 'TIME_ENTRY_ALREADY_OPEN' || code === '23505') {
        throw new AppError(
          'Un pointage est déjà ouvert pour cet utilisateur',
          409,
          'TIME_ENTRY_ALREADY_OPEN'
        );
      }
      throw error;
    }
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
