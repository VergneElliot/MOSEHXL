import { request } from './core';
import { pinHeaders } from './floorApiHeaders';
import type { OpenTicketDto } from './floorTicketTypes';

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

export async function listOrderWaiters(): Promise<
  Array<{ waiter_user_id: number; waiter_display_name: string }>
> {
  const res = await request<{ waiters: Array<{ waiter_user_id: number; waiter_display_name: string }> }>(
    '/orders/waiters'
  );
  return res.waiters;
}
