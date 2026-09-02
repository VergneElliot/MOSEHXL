import express from 'express';
import { getEstablishmentId, requireAuth, requireEstablishmentAdminOrPermission } from '../auth';
import { P } from '../../permissions/registry';
import { asyncHandler, NotFoundError, ValidationError, AppError } from '../../middleware/errorHandler';
import { StaffShiftModel, isValidRecurrence } from '../../models/staffShift';
import { UserModel } from '../../models/user';
import { pool } from '../../db/pool';
import { notifyEmployeeShiftConfirmation } from '../../services/planning/planningEmailService';
import { StaffLeaveModel } from '../../models/staffLeave';
import { shiftOverlapsApprovedLeave } from '../../services/labor/laborCompliance';

const router = express.Router();
router.use(requireAuth, requireEstablishmentAdminOrPermission(P.access_planning));

router.get(
  '/staff',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const users = await UserModel.listUsersByEstablishment(establishmentId);
    return res.json({
      staff: users.map((u) => ({
        id: u.id,
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        role: u.role,
      })),
    });
  })
);

router.get(
  '/shifts',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const from = typeof req.query.from === 'string' ? req.query.from : '';
    const to = typeof req.query.to === 'string' ? req.query.to : '';
    if (!from || !to) throw new ValidationError('from and to are required (ISO datetimes)');
    const userId =
      typeof req.query.user_id === 'string' ? parseInt(req.query.user_id, 10) : undefined;
    const shifts = await StaffShiftModel.list(establishmentId, {
      from,
      to,
      userId: Number.isFinite(userId) ? userId : undefined,
    });
    return res.json({ shifts });
  })
);

router.post(
  '/shifts',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const userId = Number(req.body.user_id);
    const startsAt = String(req.body.starts_at || '');
    const endsAt = String(req.body.ends_at || '');
    const recurrenceRaw = String(req.body.recurrence || 'once');
    if (!Number.isFinite(userId)) throw new ValidationError('user_id requis');
    if (!startsAt || !endsAt) throw new ValidationError('starts_at et ends_at requis');
    if (new Date(endsAt) <= new Date(startsAt)) {
      throw new ValidationError('ends_at must be after starts_at');
    }
    if (!isValidRecurrence(recurrenceRaw)) {
      throw new ValidationError('Fréquence invalide');
    }

    const belongs = await UserModel.userBelongsToEstablishment(userId, establishmentId);
    if (!belongs) throw new ValidationError('Employé introuvable dans cet établissement');

    const approvedLeaves = await StaffLeaveModel.listApprovedForRange(
      establishmentId,
      startsAt,
      endsAt
    );
    const leaveSpans = approvedLeaves.map((l) => ({
      user_id: l.user_id,
      starts_on: l.starts_on,
      ends_on: l.ends_on,
      half_day_start: l.half_day_start,
      half_day_end: l.half_day_end,
      status: l.status,
      leave_type: l.leave_type,
    }));
    const overlap = shiftOverlapsApprovedLeave(
      new Date(startsAt),
      new Date(endsAt),
      leaveSpans,
      userId
    );
    if (overlap) {
      throw new AppError(
        `Impossible de planifier : congé approuvé (${overlap.leave_type}) du ${overlap.starts_on} au ${overlap.ends_on}.`,
        409,
        'SHIFT_ON_APPROVED_LEAVE'
      );
    }

    let created;
    try {
      created = await StaffShiftModel.createSeries({
        establishment_id: establishmentId,
        user_id: userId,
        starts_at: startsAt,
        ends_at: endsAt,
        label: req.body.label != null ? String(req.body.label) : null,
        note: req.body.note != null ? String(req.body.note) : null,
        created_by: req.user?.id ?? null,
        recurrence: recurrenceRaw,
        requireEmployeeConfirmation: true,
      });
    } catch (error) {
      if ((error as Error & { code?: string }).code === 'INVALID_RANGE') {
        throw new ValidationError('ends_at must be after starts_at');
      }
      throw error;
    }

    const employee = await UserModel.findById(userId);
    const est = await pool.query(`SELECT name FROM establishments WHERE id = $1`, [
      establishmentId,
    ]);
    if (employee?.email && created.confirmation_token) {
      const employeeName =
        `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.email;
      void notifyEmployeeShiftConfirmation({
        employeeEmail: employee.email,
        employeeName,
        establishmentName: String(est.rows[0]?.name || ''),
        shifts: created.shifts,
        confirmationToken: created.confirmation_token,
      });
    }

    return res.status(201).json({
      shift: created.shifts[0],
      shifts: created.shifts,
      created_count: created.shifts.length,
      series_id: created.series_id,
      confirmation_pending: Boolean(created.confirmation_token),
    });
  })
);

router.patch(
  '/shifts/:id',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const id = parseInt(req.params.id ?? '', 10);
    if (!Number.isFinite(id)) throw new ValidationError('Identifiant invalide');
    const updated = await StaffShiftModel.update(establishmentId, id, {
      user_id: req.body.user_id != null ? Number(req.body.user_id) : undefined,
      starts_at: req.body.starts_at != null ? String(req.body.starts_at) : undefined,
      ends_at: req.body.ends_at != null ? String(req.body.ends_at) : undefined,
      label:
        req.body.label !== undefined
          ? req.body.label != null
            ? String(req.body.label)
            : null
          : undefined,
      note:
        req.body.note !== undefined
          ? req.body.note != null
            ? String(req.body.note)
            : null
          : undefined,
    });
    if (!updated) throw new NotFoundError('Vacation introuvable');
    return res.json({ shift: updated });
  })
);

router.delete(
  '/shifts/:id',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const id = parseInt(req.params.id ?? '', 10);
    if (!Number.isFinite(id)) throw new ValidationError('Identifiant invalide');
    const ok = await StaffShiftModel.delete(establishmentId, id);
    if (!ok) throw new NotFoundError('Vacation introuvable');
    return res.json({ success: true });
  })
);

router.post(
  '/shifts/duplicate-week',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const sourceFrom = String(req.body.source_from || '');
    const sourceTo = String(req.body.source_to || '');
    const targetFrom = String(req.body.target_from || '');
    if (!sourceFrom || !sourceTo || !targetFrom) {
      throw new ValidationError('source_from, source_to and target_from are required');
    }
    const created = await StaffShiftModel.duplicateWeek(
      establishmentId,
      sourceFrom,
      sourceTo,
      targetFrom,
      req.user?.id ?? null
    );
    return res.json({ created });
  })
);

router.get(
  '/ics/token/:userId',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const userId = parseInt(req.params.userId ?? '', 10);
    if (!Number.isFinite(userId)) throw new ValidationError('userId invalide');
    const token = await StaffShiftModel.getOrCreateIcsToken(establishmentId, userId);
    const base = (process.env.PUBLIC_API_URL || process.env.APP_URL || '').replace(/\/$/, '');
    return res.json({
      token,
      url: base
        ? `${base}/api/public/ics/planning/${token}.ics`
        : `/api/public/ics/planning/${token}.ics`,
    });
  })
);

export default router;
