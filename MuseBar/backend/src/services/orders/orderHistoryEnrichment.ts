import { pool } from '../../db/pool';
import { AuditTrailModel } from '../../models/auditTrail';

function formatUserDisplayName(input: {
  first_name: string | null;
  last_name: string | null;
  email: string;
}): string {
  const parts = [input.first_name, input.last_name].filter((p) => p && String(p).trim());
  if (parts.length > 0) return parts.join(' ');
  return input.email;
}

type UserNameRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
};

async function loadUserDisplayNames(userIds: number[]): Promise<Map<number, string>> {
  const namesById = new Map<number, string>();
  if (userIds.length === 0) return namesById;
  const users = await pool.query<UserNameRow>(
    `SELECT id, first_name, last_name, email FROM users WHERE id = ANY($1::int[])`,
    [userIds]
  );
  for (const u of users.rows) {
    namesById.set(u.id, formatUserDisplayName(u));
  }
  return namesById;
}

export interface KitchenPrintTarget {
  printer_id: number | null;
  printer_name: string;
  printer_slug: string;
  kitchen_ticket_day_number: number | null;
}

export interface OrderHistoryEnrichment {
  legal_sequence_number: number | null;
  kitchen_ticket_day_number: number | null;
  kitchen_print_targets: KitchenPrintTarget[];
  cashier_user_id: number | null;
  cashier_display_name: string | null;
}

type OrderRow = { id: number; kitchen_ticket_day_number?: number | null };

export async function enrichOrdersForHistory(
  establishmentId: string,
  orders: OrderRow[]
): Promise<Map<number, OrderHistoryEnrichment>> {
  const map = new Map<number, OrderHistoryEnrichment>();
  if (orders.length === 0) return map;

  const orderIds = orders.map((o) => o.id);

  const [legalRows, printRows, cashierByOrder] = await Promise.all([
    pool.query<{ order_id: number; sequence_number: number }>(
      `SELECT order_id, sequence_number
       FROM legal_journal
       WHERE establishment_id = $1
         AND order_id = ANY($2::int[])
         AND transaction_type = 'SALE'
       ORDER BY sequence_number ASC`,
      [establishmentId, orderIds]
    ),
    pool.query<{
      order_id: string;
      kitchen_printer_id: string | null;
      kitchen_printer_name: string | null;
      kitchen_printer_slug: string | null;
      kitchen_ticket_day_number: string | null;
    }>(
      `SELECT DISTINCT ON (
          (metadata->>'order_id'),
          COALESCE(metadata->>'kitchen_printer_slug', metadata->>'kitchen_printer_id', '')
        )
        metadata->>'order_id' AS order_id,
        metadata->>'kitchen_printer_id' AS kitchen_printer_id,
        metadata->>'kitchen_printer_name' AS kitchen_printer_name,
        metadata->>'kitchen_printer_slug' AS kitchen_printer_slug,
        metadata->>'kitchen_ticket_day_number' AS kitchen_ticket_day_number
       FROM printing_jobs
       WHERE establishment_id = $1
         AND document_type IN ('kitchen_order', 'kitchen_cancellation', 'order_pickup_number')
         AND (metadata->>'order_id')::int = ANY($2::int[])
       ORDER BY
         (metadata->>'order_id'),
         COALESCE(metadata->>'kitchen_printer_slug', metadata->>'kitchen_printer_id', ''),
         created_at DESC`,
      [establishmentId, orderIds]
    ),
    resolveCashiersForOrders(establishmentId, orderIds),
  ]);

  const legalByOrder = new Map<number, number>();
  for (const row of legalRows.rows) {
    if (!legalByOrder.has(row.order_id)) {
      legalByOrder.set(row.order_id, row.sequence_number);
    }
  }

  const printsByOrder = new Map<number, KitchenPrintTarget[]>();
  for (const row of printRows.rows) {
    const oid = parseInt(row.order_id, 10);
    if (!Number.isFinite(oid)) continue;
    const list = printsByOrder.get(oid) ?? [];
    const slug = row.kitchen_printer_slug ?? '';
    if (slug && list.some((p) => p.printer_slug === slug)) continue;
    list.push({
      printer_id: row.kitchen_printer_id ? parseInt(row.kitchen_printer_id, 10) : null,
      printer_name: row.kitchen_printer_name ?? slug ?? 'Imprimante',
      printer_slug: slug,
      kitchen_ticket_day_number: row.kitchen_ticket_day_number
        ? parseInt(row.kitchen_ticket_day_number, 10)
        : null,
    });
    printsByOrder.set(oid, list);
  }

  for (const order of orders) {
    const cashier = cashierByOrder.get(order.id);
    map.set(order.id, {
      legal_sequence_number: legalByOrder.get(order.id) ?? null,
      kitchen_ticket_day_number:
        order.kitchen_ticket_day_number != null
          ? Number(order.kitchen_ticket_day_number)
          : null,
      kitchen_print_targets: printsByOrder.get(order.id) ?? [],
      cashier_user_id: cashier?.userId ?? null,
      cashier_display_name: cashier?.displayName ?? null,
    });
  }

  return map;
}

async function resolveCashiersForOrders(
  establishmentId: string,
  orderIds: number[]
): Promise<Map<number, { userId: number | null; displayName: string | null }>> {
  const result = new Map<number, { userId: number | null; displayName: string | null }>();
  if (orderIds.length === 0) return result;

  const auditRows = await pool.query<{ resource_id: string; user_id: string | null }>(
    `SELECT DISTINCT ON (resource_id) resource_id, user_id
     FROM audit_trail
     WHERE establishment_id = $1
       AND resource_type = 'ORDER'
       AND action_type = 'ORDER_CREATED'
       AND resource_id = ANY($2::text[])
     ORDER BY resource_id, "timestamp" ASC`,
    [establishmentId, orderIds.map(String)]
  );

  const userIds = new Set<number>();
  for (const row of auditRows.rows) {
    const uid = parseUserId(row.user_id);
    if (uid != null) userIds.add(uid);
  }

  const namesById = await loadUserDisplayNames([...userIds]);

  for (const row of auditRows.rows) {
    const orderId = parseInt(row.resource_id, 10);
    if (!Number.isFinite(orderId)) continue;
    const uid = parseUserId(row.user_id);
    result.set(orderId, {
      userId: uid,
      displayName: uid != null ? namesById.get(uid) ?? `Utilisateur #${uid}` : row.user_id,
    });
  }

  return result;
}

function parseUserId(raw: string | null | undefined): number | null {
  if (raw == null || raw === '') return null;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function getOrderAuditActors(
  establishmentId: string,
  orderId: number
): Promise<
  Array<{
    user_id: string | null;
    display_name: string | null;
    action_type: string;
    timestamp: Date;
  }>
> {
  const entries = await AuditTrailModel.getOrderAuditEntries(establishmentId, orderId);
  const userIds = new Set<number>();
  for (const e of entries) {
    const uid = parseUserId(e.user_id);
    if (uid != null) userIds.add(uid);
  }
  const namesById = await loadUserDisplayNames([...userIds]);
  return entries.map((e) => {
    const uid = parseUserId(e.user_id);
    return {
      user_id: e.user_id ?? null,
      display_name:
        uid != null ? namesById.get(uid) ?? `Utilisateur #${uid}` : e.user_id ?? null,
      action_type: e.action_type,
      timestamp: e.timestamp,
    };
  });
}
