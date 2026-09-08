/**
 * Public staff planning confirmation — /api/public/planning
 */

import express from 'express';
import { asyncHandler, NotFoundError, ValidationError } from '../../middleware/errorHandler';
import { StaffShiftModel } from '../../models/staffShift';
import { StaffShiftConfirmationModel } from '../../models/staffShiftConfirmation';
import { pool } from '../../db/pool';
import {
  applyPlanningBatchAll,
  applyPlanningBatchDecisions,
} from '../../services/planning/planningBatchDecisionService';

const router = express.Router();

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CHANGE_FR: Record<string, string> = {
  create: 'Nouvelle vacation',
  update: 'Modification',
  delete: 'Annulation',
};

router.get(
  '/confirm/:token',
  asyncHandler(async (req, res) => {
    const token = String(req.params.token || '');
    if (!UUID_RE.test(token)) throw new ValidationError('Lien invalide');

    const batchFound = await StaffShiftConfirmationModel.findByToken(token);
    if (batchFound) {
      const { batch, items } = batchFound;
      const est = await pool.query(`SELECT name FROM establishments WHERE id = $1`, [
        batch.establishment_id,
      ]);
      const user = await pool.query(
        `SELECT first_name, last_name, email FROM users WHERE id = $1`,
        [batch.user_id]
      );
      const pendingItems = items.filter(
        (i) => i.decision === 'pending' && i.change_type !== 'delete'
      );
      return res.json({
        mode: 'batch',
        establishment_name: est.rows[0]?.name || '',
        employee_name:
          `${user.rows[0]?.first_name || ''} ${user.rows[0]?.last_name || ''}`.trim() ||
          user.rows[0]?.email ||
          '',
        pending: pendingItems.length > 0,
        closed: Boolean(batch.closed_at),
        items: items.map((i) => ({
          id: i.id,
          change_type: i.change_type,
          change_label: CHANGE_FR[i.change_type] || i.change_type,
          starts_at: i.starts_at,
          ends_at: i.ends_at,
          label: i.label,
          previous_starts_at: i.previous_starts_at,
          previous_ends_at: i.previous_ends_at,
          previous_label: i.previous_label,
          decision: i.decision,
          decline_reason: i.decline_reason,
          decidable: i.change_type !== 'delete' && i.decision === 'pending',
        })),
      });
    }

    // Legacy single-token (pre-batch) shifts
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
      mode: 'legacy',
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
      items: shifts.map((s) => ({
        id: String(s.id),
        change_type: 'create',
        change_label: CHANGE_FR.create,
        starts_at: s.starts_at,
        ends_at: s.ends_at,
        label: s.label,
        previous_starts_at: null,
        previous_ends_at: null,
        previous_label: null,
        decision: s.approval_status === 'pending_employee' ? 'pending' : s.approval_status,
        decline_reason: s.decline_reason ?? null,
        decidable: s.approval_status === 'pending_employee',
      })),
    });
  })
);

router.post(
  '/confirm/:token',
  asyncHandler(async (req, res) => {
    const token = String(req.params.token || '');
    if (!UUID_RE.test(token)) throw new ValidationError('Lien invalide');

    const batchFound = await StaffShiftConfirmationModel.findByToken(token);
    if (batchFound) {
      const action = String(req.body.action || '').toLowerCase();
      if (action === 'confirm_all' || action === 'confirm') {
        const result = await applyPlanningBatchAll(token, 'confirm');
        return res.json({ ok: true, ...result, status: 'confirmed' });
      }
      if (action === 'decline_all' || action === 'decline') {
        const reason = req.body.reason != null ? String(req.body.reason) : null;
        const result = await applyPlanningBatchAll(token, 'decline', reason);
        return res.json({ ok: true, ...result, status: 'declined' });
      }

      const decisions = Array.isArray(req.body.decisions) ? req.body.decisions : null;
      if (!decisions || decisions.length === 0) {
        throw new ValidationError(
          'action (confirm_all|decline_all) ou decisions[] requis'
        );
      }
      const result = await applyPlanningBatchDecisions({
        token,
        decisions: decisions.map(
          (d: { item_id?: string; action?: string; reason?: string }) => ({
            item_id: String(d.item_id || ''),
            action: String(d.action || '').toLowerCase() === 'decline' ? 'decline' : 'confirm',
            reason: d.reason != null ? String(d.reason) : null,
          })
        ),
      });
      return res.json({ ok: true, ...result });
    }

    // Legacy all-or-nothing
    const action = String(req.body.action || '').toLowerCase();
    if (action !== 'confirm' && action !== 'decline' && action !== 'confirm_all' && action !== 'decline_all') {
      throw new ValidationError('action must be confirm or decline');
    }
    const confirm = action === 'confirm' || action === 'confirm_all';

    const existing = await StaffShiftModel.findByConfirmationToken(token);
    if (existing.length === 0) {
      throw new NotFoundError('Proposition de planning');
    }

    const updated = await StaffShiftModel.setApprovalByToken(
      token,
      confirm ? 'confirmed' : 'declined'
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
      status: confirm ? 'confirmed' : 'declined',
      updated_count: updated.length,
    });
  })
);

export default router;
