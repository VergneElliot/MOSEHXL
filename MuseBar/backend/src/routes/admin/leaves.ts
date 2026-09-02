import express from 'express';
import {
  getEstablishmentId,
  requireAuth,
  requireEstablishmentAdmin,
  requireEstablishmentAdminOrPermission,
} from '../auth';
import { P } from '../../permissions/registry';
import { asyncHandler, NotFoundError, ValidationError, AppError } from '../../middleware/errorHandler';
import {
  StaffLeaveModel,
  isValidLeaveStatus,
  isValidLeaveType,
} from '../../models/staffLeave';
import { UserModel } from '../../models/user';
import { countLeaveDaysForPayrollWithCap } from '../../services/labor/payrollCalculations';
import { frenchPublicHolidaysForYears } from '../../services/labor/frenchPublicHolidays';
import { resolvePayrollSettings } from '../../services/labor/payrollSettingsResolver';

const router = express.Router();
router.use(requireAuth, requireEstablishmentAdminOrPermission(P.access_planning));

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;
    const userId =
      typeof req.query.user_id === 'string' ? parseInt(req.query.user_id, 10) : undefined;
    const statusRaw = typeof req.query.status === 'string' ? req.query.status : undefined;
    const status =
      statusRaw && isValidLeaveStatus(statusRaw) ? statusRaw : undefined;

    const leaves = await StaffLeaveModel.list(establishmentId, {
      from,
      to,
      userId: Number.isFinite(userId) ? userId : undefined,
      status,
    });
    return res.json({ leaves });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;

    const userId = Number(req.body.user_id);
    const leaveType = String(req.body.leave_type || '');
    const startsOn = String(req.body.starts_on || '').slice(0, 10);
    const endsOn = String(req.body.ends_on || '').slice(0, 10);

    if (!Number.isFinite(userId)) throw new ValidationError('user_id requis');
    if (!isValidLeaveType(leaveType)) throw new ValidationError('Type de congé invalide');
    if (!startsOn || !endsOn) throw new ValidationError('starts_on et ends_on requis');
    if (endsOn < startsOn) throw new ValidationError('La date de fin doit être après le début');

    const belongs = await UserModel.userBelongsToEstablishment(userId, establishmentId);
    if (!belongs) throw new ValidationError('Employé introuvable dans cet établissement');

    const requesterId = Number(req.user?.id);
    const leave = await StaffLeaveModel.create({
      establishment_id: establishmentId,
      user_id: userId,
      leave_type: leaveType,
      starts_on: startsOn,
      ends_on: endsOn,
      half_day_start: Boolean(req.body.half_day_start),
      half_day_end: Boolean(req.body.half_day_end),
      note: typeof req.body.note === 'string' ? req.body.note : null,
      requested_by: Number.isFinite(requesterId) ? requesterId : null,
    });

    const autoApprove = req.body.auto_approve === true;
    if (autoApprove) {
      const approved = await StaffLeaveModel.updateStatus(establishmentId, leave.id, {
        status: 'approved',
        reviewed_by: requesterId,
        review_note: 'Approbation directe (administrateur)',
      });
      return res.status(201).json({ leave: approved ?? leave });
    }

    return res.status(201).json({ leave });
  })
);

router.get(
  '/preview-count',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;

    const startsOn = String(req.query.starts_on || '').slice(0, 10);
    const endsOn = String(req.query.ends_on || '').slice(0, 10);
    if (!startsOn || !endsOn) throw new ValidationError('starts_on et ends_on requis');
    if (endsOn < startsOn) throw new ValidationError('La date de fin doit être après le début');

    const halfDayStart = req.query.half_day_start === 'true';
    const halfDayEnd = req.query.half_day_end === 'true';

    const payrollSettings = await resolvePayrollSettings(establishmentId, {
      from: startsOn,
      to: endsOn,
    });
    const result = countLeaveDaysForPayrollWithCap(
      {
        starts_on: startsOn,
        ends_on: endsOn,
        half_day_start: halfDayStart,
        half_day_end: halfDayEnd,
      },
      payrollSettings
    );

    const years = [
      parseInt(startsOn.slice(0, 4), 10),
      parseInt(endsOn.slice(0, 4), 10),
      parseInt(result.return_on.slice(0, 4), 10),
    ].filter(Number.isFinite);
    const holidaysInWindow = frenchPublicHolidaysForYears([...new Set(years)]).filter(
      (h) => h.date >= result.count_from && h.date <= result.count_through
    );

    return res.json({
      ...result,
      excluded_public_holidays: holidaysInWindow,
    });
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const id = parseInt(req.params.id ?? '', 10);
    if (!Number.isFinite(id)) throw new ValidationError('Identifiant invalide');

    const statusRaw = String(req.body.status || '');
    if (!isValidLeaveStatus(statusRaw)) {
      throw new ValidationError('Statut invalide');
    }
    if (!['approved', 'rejected', 'cancelled'].includes(statusRaw)) {
      throw new ValidationError('Statut non autorisé pour cette action');
    }

    const reviewerId = Number(req.user?.id);
    if (!Number.isFinite(reviewerId)) throw new ValidationError('Utilisateur invalide');

    const existing = await StaffLeaveModel.getById(establishmentId, id);
    if (!existing) throw new NotFoundError('Demande de congé introuvable');

    if (statusRaw === 'approved' && (existing.leave_type === 'paid_leave' || existing.leave_type === 'rtt')) {
      const year = parseInt(existing.starts_on.slice(0, 4), 10);
      const balances = await StaffLeaveModel.getBalances(establishmentId, year);
      const row = balances.find((b) => b.user_id === existing.user_id);
      const payrollSettings = await resolvePayrollSettings(establishmentId, {
        from: existing.starts_on,
        to: existing.ends_on,
      });
      const days = countLeaveDaysForPayrollWithCap(existing, payrollSettings).counted_days;
      if (row) {
        if (existing.leave_type === 'paid_leave' && days > row.remaining_paid_leave) {
          throw new AppError(
            `Solde CP insuffisant (${row.remaining_paid_leave} j restants, ${days} j demandés)`,
            409,
            'LEAVE_BALANCE_EXCEEDED'
          );
        }
        if (existing.leave_type === 'rtt' && days > row.remaining_rtt) {
          throw new AppError(
            `Solde RTT insuffisant (${row.remaining_rtt} j restants, ${days} j demandés)`,
            409,
            'LEAVE_BALANCE_EXCEEDED'
          );
        }
      }
    }

    const leave = await StaffLeaveModel.updateStatus(establishmentId, id, {
      status: statusRaw,
      reviewed_by: reviewerId,
      review_note: typeof req.body.review_note === 'string' ? req.body.review_note : undefined,
    });
    if (!leave) throw new NotFoundError('Demande de congé introuvable');
    return res.json({ leave });
  })
);

router.get(
  '/balances',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const year = parseInt(String(req.query.year || new Date().getFullYear()), 10);
    if (!Number.isFinite(year)) throw new ValidationError('Année invalide');
    const balances = await StaffLeaveModel.getBalances(establishmentId, year);
    return res.json({ year, balances });
  })
);

router.put(
  '/balances/:userId',
  requireEstablishmentAdmin,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const userId = parseInt(req.params.userId ?? '', 10);
    const year = parseInt(String(req.body.year || new Date().getFullYear()), 10);
    if (!Number.isFinite(userId)) throw new ValidationError('userId invalide');
    if (!Number.isFinite(year)) throw new ValidationError('Année invalide');

    const belongs = await UserModel.userBelongsToEstablishment(userId, establishmentId);
    if (!belongs) throw new ValidationError('Employé introuvable');

    await StaffLeaveModel.upsertEntitlement({
      establishment_id: establishmentId,
      user_id: userId,
      year,
      paid_leave_days:
        req.body.paid_leave_days != null ? Number(req.body.paid_leave_days) : undefined,
      rtt_days: req.body.rtt_days != null ? Number(req.body.rtt_days) : undefined,
    });
    const balances = await StaffLeaveModel.getBalances(establishmentId, year);
    const row = balances.find((b) => b.user_id === userId);
    return res.json({ balance: row ?? null });
  })
);

export default router;
