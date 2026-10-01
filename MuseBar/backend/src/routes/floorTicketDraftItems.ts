/**
 * PUT /tickets/:id/items — draft line sync for an open floor ticket (PIN actor).
 */

import express from 'express';
import { getEstablishmentId, requireAuth } from './auth';
import {
  asyncHandler,
  ValidationError,
  NotFoundError,
} from '../middleware/errorHandler';
import { OpenTicketModel, type OpenTicketItemInput } from '../models/database/openTicketModel';
import { requireOpenTicketForActor } from '../services/floor/floorTicketAuth';
import { requirePosPinActor } from '../middleware/pinActor';
import { assertPosOrderLinePermissions } from '../middleware/orderPosLinePermissions';

const router = express.Router();

function parseTicketItems(raw: unknown): OpenTicketItemInput[] {
  if (!Array.isArray(raw)) throw new ValidationError('items must be an array');
  return raw.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new ValidationError(`items[${index}] must be an object`);
    }
    const item = entry as Record<string, unknown>;
    const product_name = typeof item.product_name === 'string' ? item.product_name.trim() : '';
    if (!product_name) throw new ValidationError(`items[${index}].product_name is required`);
    const quantity = Number(item.quantity);
    const unit_price = Number(item.unit_price);
    const total_price = Number(item.total_price);
    const tax_rate = Number(item.tax_rate);
    const tax_amount = Number(item.tax_amount);
    if (![quantity, unit_price, total_price, tax_rate, tax_amount].every(Number.isFinite)) {
      throw new ValidationError(`items[${index}] has invalid numeric fields`);
    }
    return {
      product_id: item.product_id == null ? null : Number(item.product_id),
      product_name,
      quantity,
      unit_price,
      total_price,
      tax_rate,
      tax_amount,
      happy_hour_applied: item.happy_hour_applied === true,
      happy_hour_discount_amount: Number(item.happy_hour_discount_amount ?? 0) || 0,
      is_manual_happy_hour: item.is_manual_happy_hour === true,
      description: typeof item.description === 'string' ? item.description : '',
      options_json: item.options_json ?? item.options ?? [],
      kitchen_printer_ids_snapshot: item.kitchen_printer_ids_snapshot ?? [],
      print_pickup_slip_snapshot: item.print_pickup_slip_snapshot === true,
      sort_order: item.sort_order != null ? Number(item.sort_order) : index,
    };
  });
}

router.put(
  '/tickets/:id/items',
  requireAuth,
  requirePosPinActor,
  assertPosOrderLinePermissions(),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const actor = req.pinActor!;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ValidationError('Invalid ticket id');
    const items = parseTicketItems(req.body?.items);
    try {
      await requireOpenTicketForActor(id, establishmentId, actor);
      const saved = await OpenTicketModel.syncDraftItems(id, establishmentId, items);
      const updatedTicket = await OpenTicketModel.get(id, establishmentId);
      return res.json({ ticket: updatedTicket, items: saved });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'OPEN_TICKET_NOT_FOUND_OR_CLOSED') {
        throw new NotFoundError('Open ticket not found or already closed');
      }
      throw error;
    }
  })
);

export default router;
