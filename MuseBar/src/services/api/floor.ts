import { request } from './core';
import type { OrderItem } from '../../types';
import { mapOrderItemOptionsToApiPayload } from '../../utils/orderItemOptions';
import { saleLines } from '../../hooks/usePOSOrderTotals';

export interface PinVerifyResult {
  user_id: number;
  email: string;
  role: string;
  display_name: string;
  permissions: string[];
  pin_actor_token: string;
}

export interface FloorPlanDto {
  id: number;
  establishment_id: string;
  name: string;
  display_order: number;
  is_active: boolean;
}

export interface DiningTableStatusDto {
  id: number;
  establishment_id: string;
  floor_plan_id: number;
  label: string;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  capacity: number | null;
  shape: string;
  sort_order: number;
  is_active: boolean;
  open_ticket_id: number | null;
  open_ticket_updated_at: string | null;
  opened_by_user_id: number | null;
  last_served_by_user_id: number | null;
  /** True when the open ticket has at least one validated line (service en cours). */
  has_validated_items: boolean;
}

export interface OpenTicketDto {
  id: number;
  establishment_id: string;
  dining_table_id: number;
  status: 'open' | 'closed' | 'cancelled';
  opened_by_user_id: number | null;
  last_served_by_user_id: number | null;
  covers: number | null;
  notes: string | null;
  order_id: number | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface OpenTicketItemDto {
  id: number;
  open_ticket_id: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate: number;
  tax_amount: number;
  happy_hour_applied: boolean;
  happy_hour_discount_amount: number;
  is_manual_happy_hour: boolean;
  description: string;
  options_json: unknown;
  kitchen_printer_ids_snapshot: unknown;
  print_pickup_slip_snapshot: boolean;
  sort_order: number;
  line_status?: 'draft' | 'validated' | 'cancelled';
  validated_at?: string | null;
  kitchen_sent_at?: string | null;
}

function pinHeaders(pinActorToken: string): Record<string, string> {
  return { 'x-pin-actor-token': pinActorToken };
}

export async function verifyPin(pin: string): Promise<PinVerifyResult> {
  return request<PinVerifyResult>('/auth/pin/verify', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });
}

export async function setPin(pin: string, userId?: number): Promise<{ success: boolean; user_id: number }> {
  return request('/auth/pin/set', {
    method: 'POST',
    body: JSON.stringify({ pin, ...(userId != null ? { user_id: userId } : {}) }),
  });
}

export async function clearPin(userId: number): Promise<{ success: boolean; user_id: number }> {
  return request(`/auth/pin/${userId}`, { method: 'DELETE' });
}

export async function getPinStatus(userId: number): Promise<{
  user_id: number;
  has_pin: boolean;
  pin_kind?: 'basic' | 'elevated';
  min_length?: number;
  max_length?: number;
}> {
  return request(`/auth/pin/status/${userId}`);
}

export async function listFloorPlans(): Promise<FloorPlanDto[]> {
  const res = await request<{ plans: FloorPlanDto[] }>('/floor/plans');
  return res.plans;
}

export async function createFloorPlan(name: string): Promise<FloorPlanDto> {
  const res = await request<{ plan: FloorPlanDto }>('/floor/plans', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return res.plan;
}

export async function updateFloorPlan(
  id: number,
  patch: Partial<Pick<FloorPlanDto, 'name' | 'display_order' | 'is_active'>>
): Promise<FloorPlanDto> {
  const res = await request<{ plan: FloorPlanDto }>(`/floor/plans/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return res.plan;
}

export async function deleteFloorPlan(id: number): Promise<void> {
  await request(`/floor/plans/${id}`, { method: 'DELETE' });
}

export interface DiningTableDto {
  id: number;
  establishment_id: string;
  floor_plan_id: number;
  label: string;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  capacity: number | null;
  shape: string;
  sort_order: number;
  is_active: boolean;
}

function coerceGeomNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeDiningTable<T extends DiningTableDto>(table: T): T {
  return {
    ...table,
    pos_x: coerceGeomNumber(table.pos_x, 0),
    pos_y: coerceGeomNumber(table.pos_y, 0),
    width: coerceGeomNumber(table.width, 80),
    height: coerceGeomNumber(table.height, 80),
    capacity: table.capacity == null ? null : coerceGeomNumber(table.capacity, 0),
    sort_order: coerceGeomNumber(table.sort_order, 0),
  };
}

export async function listDiningTables(floorPlanId?: number): Promise<DiningTableDto[]> {
  const q = floorPlanId != null ? `?plan_id=${floorPlanId}` : '';
  const res = await request<{ tables: DiningTableDto[] }>(`/floor/tables${q}`);
  return res.tables.map((t) => normalizeDiningTable(t));
}

export async function createDiningTable(input: {
  floor_plan_id: number;
  label: string;
  pos_x?: number;
  pos_y?: number;
  width?: number;
  height?: number;
  capacity?: number | null;
  shape?: string;
  sort_order?: number;
}): Promise<DiningTableDto> {
  const res = await request<{ table: DiningTableDto }>('/floor/tables', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return normalizeDiningTable(res.table);
}

export async function updateDiningTable(
  id: number,
  patch: Partial<{
    label: string;
    capacity: number | null;
    sort_order: number;
    is_active: boolean;
    pos_x: number;
    pos_y: number;
    width: number;
    height: number;
    shape: string;
  }>
): Promise<DiningTableDto> {
  const res = await request<{ table: DiningTableDto }>(`/floor/tables/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return normalizeDiningTable(res.table);
}

export async function deleteDiningTable(id: number): Promise<void> {
  await request(`/floor/tables/${id}`, { method: 'DELETE' });
}

export async function getFloorStatus(): Promise<DiningTableStatusDto[]> {
  const res = await request<{ tables: DiningTableStatusDto[] }>('/floor/status');
  return res.tables.map(
    (t) =>
      ({
        ...normalizeDiningTable(t),
        open_ticket_id: t.open_ticket_id ?? null,
        open_ticket_updated_at: t.open_ticket_updated_at ?? null,
        opened_by_user_id: t.opened_by_user_id ?? null,
        last_served_by_user_id: t.last_served_by_user_id ?? null,
        has_validated_items: t.has_validated_items === true,
      }) as DiningTableStatusDto
  );
}

export interface OngoingOrderItemDto {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  line_status: 'draft' | 'validated';
  kitchen_sent_at: string | null;
  validated_at: string | null;
  fulfillment_status: 'pending_validation' | 'validated' | 'kitchen_sent';
}

export interface OngoingOrderDto {
  ticket_id: number;
  table_id: number;
  table_label: string;
  waiter_user_id: number | null;
  waiter_display_name: string | null;
  updated_at: string;
  validated_line_count: number;
  draft_line_count: number;
  total_amount: number;
  items: OngoingOrderItemDto[];
}

export async function listOngoingOrders(): Promise<OngoingOrderDto[]> {
  const res = await request<{ orders: OngoingOrderDto[] }>('/floor/ongoing-orders');
  return res.orders ?? [];
}

export async function openTicket(
  diningTableId: number,
  pinActorToken: string
): Promise<{ ticket: OpenTicketDto; items: OpenTicketItemDto[] }> {
  return request('/floor/tickets', {
    method: 'POST',
    headers: pinHeaders(pinActorToken),
    body: JSON.stringify({ dining_table_id: diningTableId }),
  });
}

export async function getTicket(
  ticketId: number
): Promise<{ ticket: OpenTicketDto; items: OpenTicketItemDto[]; served_by_display_name?: string | null }> {
  return request(`/floor/tickets/${ticketId}`);
}

export async function replaceTicketItems(
  ticketId: number,
  items: OrderItem[],
  pinActorToken: string
): Promise<{ ticket: OpenTicketDto; items: OpenTicketItemDto[] }> {
  const payload = saleLines(items)
    .filter((item) => item.tableLineStatus !== 'validated')
    .map((item, index) => mapOrderItemToTicketPayload(item, index));

  return request(`/floor/tickets/${ticketId}/items`, {
    method: 'PUT',
    headers: pinHeaders(pinActorToken),
    body: JSON.stringify({ items: payload }),
  });
}

export async function validateTicket(
  ticketId: number,
  pinActorToken: string,
  lineIds?: number[]
): Promise<{ ticket: OpenTicketDto; items: OpenTicketItemDto[]; print: { enqueued: number; failures: number } }> {
  return request(`/floor/tickets/${ticketId}/validate`, {
    method: 'POST',
    headers: pinHeaders(pinActorToken),
    body: JSON.stringify(lineIds?.length ? { line_ids: lineIds } : {}),
  });
}

export async function moveTicketLines(
  ticketId: number,
  targetDiningTableId: number,
  lineIds: number[],
  pinActorToken: string
): Promise<{
  source: OpenTicketDto;
  target: OpenTicketDto;
  target_table_label: string | null;
  served_by_display_name?: string | null;
  source_items: OpenTicketItemDto[];
  target_items: OpenTicketItemDto[];
  moved_line_ids: number[];
}> {
  return request(`/floor/tickets/${ticketId}/move-lines`, {
    method: 'POST',
    headers: pinHeaders(pinActorToken),
    body: JSON.stringify({
      target_dining_table_id: targetDiningTableId,
      line_ids: lineIds,
    }),
  });
}

export async function discardDraftTicketItems(
  ticketId: number,
  pinActorToken: string
): Promise<{ ticket: OpenTicketDto; items: OpenTicketItemDto[] }> {
  return request(`/floor/tickets/${ticketId}/discard-drafts`, {
    method: 'POST',
    headers: pinHeaders(pinActorToken),
    body: JSON.stringify({}),
  });
}

export async function cancelTicketLines(
  ticketId: number,
  lineIds: number[],
  pinActorToken: string
): Promise<{
  ticket: OpenTicketDto;
  items: OpenTicketItemDto[];
  print: { enqueued: number; failures: number };
}> {
  return request(`/floor/tickets/${ticketId}/cancel-lines`, {
    method: 'POST',
    headers: pinHeaders(pinActorToken),
    body: JSON.stringify({ line_ids: lineIds }),
  });
}

function mapOrderItemToTicketPayload(item: OrderItem, index: number) {
  return {
    product_id: item.productId
      ? Number.isNaN(parseInt(String(item.productId), 10))
        ? null
        : parseInt(String(item.productId), 10)
      : null,
    product_name: item.productName,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
    tax_rate: item.taxRate,
    tax_amount: item.taxAmount ?? (item.totalPrice * item.taxRate) / (1 + item.taxRate),
    happy_hour_applied: item.isHappyHourApplied,
    happy_hour_discount_amount: item.isHappyHourApplied
      ? item.originalPrice
        ? (item.originalPrice - item.unitPrice) * item.quantity
        : 0
      : 0,
    is_manual_happy_hour: item.isHappyHourApplied === true && item.isManualHappyHour === true,
    description: item.description || '',
    options_json: mapOrderItemOptionsToApiPayload(item.options) ?? [],
    sort_order: index,
  };
}

export async function abandonTicket(
  ticketId: number,
  pinActorToken: string
): Promise<{ ticket: OpenTicketDto }> {
  return request(`/floor/tickets/${ticketId}/abandon`, {
    method: 'POST',
    headers: pinHeaders(pinActorToken),
    body: JSON.stringify({}),
  });
}

export async function closeTicket(
  ticketId: number,
  orderId: number,
  pinActorToken: string
): Promise<{ ticket: OpenTicketDto }> {
  return request(`/floor/tickets/${ticketId}/close`, {
    method: 'POST',
    headers: pinHeaders(pinActorToken),
    body: JSON.stringify({ order_id: orderId }),
  });
}

export async function transferTicket(
  ticketId: number,
  diningTableId: number,
  pinActorToken: string
): Promise<{ ticket: OpenTicketDto }> {
  return request(`/floor/tickets/${ticketId}/transfer`, {
    method: 'POST',
    headers: pinHeaders(pinActorToken),
    body: JSON.stringify({ dining_table_id: diningTableId }),
  });
}

export async function takeoverTicket(
  ticketId: number,
  pinActorToken: string
): Promise<{ ticket: OpenTicketDto; served_by_display_name?: string | null }> {
  return request(`/floor/tickets/${ticketId}/takeover`, {
    method: 'POST',
    headers: pinHeaders(pinActorToken),
    body: JSON.stringify({}),
  });
}

export interface ServiceStaffMember {
  user_id: number;
  display_name: string;
  email: string;
  role: string;
}

export async function listServiceStaff(pinActorToken: string): Promise<ServiceStaffMember[]> {
  const res = await request<{ staff: ServiceStaffMember[] }>('/floor/service-staff', {
    headers: pinHeaders(pinActorToken),
  });
  return res.staff;
}

export async function assignTicketWaiter(
  ticketId: number,
  userId: number,
  pinActorToken: string
): Promise<{ ticket: OpenTicketDto; served_by_display_name?: string | null }> {
  return request(`/floor/tickets/${ticketId}/assign-waiter`, {
    method: 'POST',
    headers: pinHeaders(pinActorToken),
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function mergeTickets(
  sourceTicketId: number,
  targetTicketId: number,
  pinActorToken: string
): Promise<{ source: OpenTicketDto; target: OpenTicketDto }> {
  return request(`/floor/tickets/${sourceTicketId}/merge`, {
    method: 'POST',
    headers: pinHeaders(pinActorToken),
    body: JSON.stringify({ target_ticket_id: targetTicketId }),
  });
}

export async function printSuivreForTicket(
  ticketId: number,
  pinActorToken: string,
  itemIds?: number[]
): Promise<{ enqueued: number; failures: number }> {
  return request(`/floor/tickets/${ticketId}/print-suivre`, {
    method: 'POST',
    headers: pinHeaders(pinActorToken),
    body: JSON.stringify(itemIds?.length ? { item_ids: itemIds } : {}),
  });
}

export async function printSuivreFromCart(
  items: Array<{ product_id: number | null; product_name: string; quantity: number }>,
  pinActorToken: string,
  tableLabel?: string | null
): Promise<{ enqueued: number; failures: number }> {
  return request('/floor/print-suivre', {
    method: 'POST',
    headers: pinHeaders(pinActorToken),
    body: JSON.stringify({ items, table_label: tableLabel ?? null }),
  });
}

export async function listOrderWaiters(): Promise<
  Array<{ waiter_user_id: number; waiter_display_name: string }>
> {
  const res = await request<{ waiters: Array<{ waiter_user_id: number; waiter_display_name: string }> }>(
    '/orders/waiters'
  );
  return res.waiters;
}

export function mapTicketItemsToOrderItems(items: OpenTicketItemDto[]): OrderItem[] {
  return items.map((item) => {
    const optionsRaw = Array.isArray(item.options_json) ? item.options_json : [];
    const lineStatus =
      item.line_status === 'validated' || item.line_status === 'draft'
        ? item.line_status
        : 'validated';
    return {
      id: `ticket-line-${item.id}`,
      ticketLineId: item.id,
      tableLineStatus: lineStatus,
      productId: item.product_id != null ? String(item.product_id) : null,
      productName: item.product_name,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      totalPrice: Number(item.total_price),
      taxRate: Number(item.tax_rate),
      taxAmount: Number(item.tax_amount),
      isHappyHourApplied: item.happy_hour_applied === true,
      isManualHappyHour: item.is_manual_happy_hour === true,
      description: item.description || undefined,
      options: optionsRaw.map((opt: unknown, optIndex: number) => {
        const row = (opt && typeof opt === 'object' ? opt : {}) as Record<string, unknown>;
        return {
          groupId: row.group_id != null ? String(row.group_id) : row.groupId != null ? String(row.groupId) : undefined,
          groupName: String(row.group_name ?? row.groupName ?? 'Option'),
          choiceId: row.choice_id != null ? String(row.choice_id) : row.choiceId != null ? String(row.choiceId) : null,
          choiceLabel:
            row.choice_label != null
              ? String(row.choice_label)
              : row.choiceLabel != null
                ? String(row.choiceLabel)
                : null,
          freeText:
            row.free_text != null ? String(row.free_text) : row.freeText != null ? String(row.freeText) : null,
          displayOrder: typeof row.display_order === 'number' ? row.display_order : optIndex,
        };
      }),
    };
  });
}
