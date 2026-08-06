/**
 * Public staff planning confirmation — /api/public/planning
 */

import express from 'express';
import { asyncHandler, NotFoundError, ValidationError } from '../../middleware/errorHandler';
import { StaffShiftModel } from '../../models/staffShift';
import { pool } from '../../db/pool';

const router = express.Router();

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.get(
  '/confirm/:token',
  asyncHandler(async (req, res) => {
    const token = String(req.params.token || '');
    if (!UUID_RE.test(token)) throw new ValidationError('Lien invalide');

    const shifts = await StaffShiftModel.findByConfirmationToken(token);
    if (shifts.length === 0) {
      throw new NotFoundError('Proposition de planning');
    }

    const first = shifts[0]!;
    const est = await pool.query(`SELECT name FROM establishments WHERE id = $1`, [
      first.establishment_id,
    ]);
    const user = await pool.query(
      `SELECT first_name, last_name, email FROM users WHERE id = $1`,
      [first.user_id]
    );

    return res.json({
      establishment_name: est.rows[0]?.name || '',
      employee_name:
        `${user.rows[0]?.first_name || ''} ${user.rows[0]?.last_name || ''}`.trim() ||
        user.rows[0]?.email ||
        '',
      recurrence: first.recurrence,
      approval_status: first.approval_status,
      shift_count: shifts.length,
      first_shift: {
        starts_at: first.starts_at,
        ends_at: first.ends_at,
        label: first.label,
      },
      pending: first.approval_status === 'pending_employee',
    });
  })
);

router.post(
  '/confirm/:token',
  asyncHandler(async (req, res) => {
    const token = String(req.params.token || '');
    if (!UUID_RE.test(token)) throw new ValidationError('Lien invalide');
    const action = String(req.body.action || '').toLowerCase();
    if (action !== 'confirm' && action !== 'decline') {
      throw new ValidationError('action must be confirm or decline');
    }

    const existing = await StaffShiftModel.findByConfirmationToken(token);
    if (existing.length === 0) {
      throw new NotFoundError('Proposition de planning');
    }

    const updated = await StaffShiftModel.setApprovalByToken(
      token,
      action === 'confirm' ? 'confirmed' : 'declined'
    );

    if (updated.length === 0) {
      return res.json({
        ok: true,
        already_processed: true,
        status: existing[0]!.approval_status,
        updated_count: 0,
      });
    }

    return res.json({
      ok: true,
      status: action === 'confirm' ? 'confirmed' : 'declined',
      updated_count: updated.length,
    });
  })
);

export default router;
