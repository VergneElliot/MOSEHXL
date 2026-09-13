import express from 'express';
import { getEstablishmentId, requireAuth, requirePermission } from './auth';
import { P } from '../permissions/registry';
import {
  asyncHandler,
  ValidationError,
  NotFoundError,
} from '../middleware/errorHandler';
import { listOngoingSummaries } from '../models/database/openTicketOngoingSummaries';
import { requirePosPinActor } from '../middleware/pinActor';
import { requireOpenTicketForActor } from '../services/floor/floorTicketAuth';
import {
  advanceTicketLineFulfillment,
  countByFulfillment,
} from '../services/floor/advanceTicketLineFulfillment';
import { resolveFulfillmentStatus } from '../services/floor/ticketLineFulfillment';
import { pool } from '../db/pool';
import type { PinActorPayload } from '../services/auth/pinActorToken';

const router = express.Router();

function formatUserDisplayName(input: {
  first_name: string | null;
  last_name: string | null;
  email: string;
}): string {
  const parts = [input.first_name, input.last_name].filter((p) => p && String(p).trim());
  return parts.length > 0 ? parts.join(' ') : input.email;
}

async function resolveWaiterDisplayName(userId: number | null): Promise<string | null> {
  if (userId == null) return null;
  const result = await pool.query(
    `SELECT first_name, last_name, email FROM users WHERE id = $1`,
    [userId]
  );
  const row = result.rows[0] as
    | { first_name: string | null; last_name: string | null; email: string }
    | undefined;
  return row ? formatUserDisplayName(row) : null;
}

router.get(
  '/ongoing-orders',
  requireAuth,
  requirePermission(P.access_pos),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const summaries = await listOngoingSummaries(establishmentId);
    const orders = (
      await Promise.all(
        summaries.map(async (row) => {
          const serviceItems = row.items.filter((i) => i.line_status === 'validated');
          if (serviceItems.length === 0) return null;
          const waiter_display_name = await resolveWaiterDisplayName(row.waiter_user_id);
          const counts = countByFulfillment(serviceItems);
          const totalAmount = serviceItems.reduce((sum, i) => sum + Number(i.total_price), 0);
          return {
            ticket_id: row.ticket_id,
            table_id: row.table_id,
            table_label: row.table_label,
            waiter_user_id: row.waiter_user_id,
            waiter_display_name,
            updated_at: row.ticket_updated_at,
            validated_line_count: counts.validated,
            sent_line_count: counts.sent,
            served_line_count: counts.served,
            draft_line_count: 0,
            total_amount: totalAmount,
            items: serviceItems.map((item) => {
              const fulfillment_status = resolveFulfillmentStatus(item);
              return {
                ...item,
                fulfillment_status:
                  fulfillment_status === 'draft' ? 'validated' : fulfillment_status,
              };
            }),
          };
        })
      )
    ).filter((o): o is NonNullable<typeof o> => o != null);
    return res.json({ orders });
  })
);

router.post(
  '/tickets/:id/items/:itemId/fulfillment',
  requireAuth,
  requirePermission(P.access_pos),
  requirePosPinActor,
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const ticketId = parseInt(req.params.id ?? '', 10);
    const itemId = parseInt(req.params.itemId ?? '', 10);
    if (!Number.isFinite(ticketId) || ticketId <= 0 || !Number.isFinite(itemId) || itemId <= 0) {
      throw new ValidationError('Invalid ticket or item id');
    }
    const target = (req.body as { status?: unknown })?.status;
    if (target !== 'sent' && target !== 'served') {
      throw new ValidationError('status must be sent or served');
    }

    await requireOpenTicketForActor(ticketId, establishmentId, req.pinActor as PinActorPayload);

    try {
      const item = await advanceTicketLineFulfillment({
        ticketId,
        itemId,
        establishmentId,
        target,
      });
      const fulfillment_status = resolveFulfillmentStatus({
        line_status: item.line_status,
        validated_at: item.validated_at,
        kitchen_sent_at: item.kitchen_sent_at,
        served_at: (item as { served_at?: Date | null }).served_at ?? null,
      });
      return res.json({
        item: {
          ...item,
          fulfillment_status:
            fulfillment_status === 'draft' ? 'validated' : fulfillment_status,
        },
      });
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === 'NOT_FOUND') throw new NotFoundError('Open ticket');
      if (e.code === 'VALIDATION') throw new ValidationError(e.message || 'Invalid fulfillment');
      throw err;
    }
  })
);

export default router;
