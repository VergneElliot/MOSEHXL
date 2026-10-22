/**
 * Administration space API client — reservations, closed dates, public link.
 */

import { request } from '../core';

export interface GuestReliabilityDto {
  flagged: boolean;
  flag_count: number;
  first_flagged_at: string | null;
  last_flagged_at: string | null;
  matched_on: Array<'email' | 'phone'>;
}

export interface ReservationDto {
  id: number;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  party_size: number;
  starts_at: string;
  ends_at: string | null;
  status: string;
  status_reason?: string | null;
  notes: string | null;
  source: string;
  inbox_message_id: number | null;
  guest_reliability?: GuestReliabilityDto | null;
}

export async function listReservations(params?: { from?: string; to?: string; status?: string }) {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  if (params?.status) qs.set('status', params.status);
  const suffix = qs.toString() ? `?${qs}` : '';
  return request<{ reservations: ReservationDto[] }>(`/admin/reservations${suffix}`);
}

export async function createReservation(payload: Partial<ReservationDto> & {
  customer_name: string;
  starts_at: string;
  party_size: number;
}) {
  return request<{ reservation: ReservationDto }>('/admin/reservations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateReservation(id: number, payload: Partial<ReservationDto>) {
  return request<{ reservation: ReservationDto }>(`/admin/reservations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteReservation(id: number) {
  return request(`/admin/reservations/${id}`, { method: 'DELETE' });
}

export async function getReservationsIcs() {
  return request<{ token: string; url: string }>('/admin/reservations/ics/token');
}

export async function getReservationsPublicLink() {
  return request<{
    slug: string | null;
    url: string | null;
    opening_hours_configured: boolean;
    establishment_name: string | null;
  }>('/admin/reservations/public-link');
}

export async function getReservationClosedDates() {
  return request<{ dates: string[] }>('/admin/reservations/closed-dates');
}

export async function setReservationDayClosed(date: string, closed: boolean) {
  return request<{ dates: string[] }>(`/admin/reservations/closed-dates/${date}`, {
    method: 'PUT',
    body: JSON.stringify({ closed }),
  });
}
