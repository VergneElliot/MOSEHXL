import { request } from './core';

export interface TimeClockNetworkDto {
  allowed_ips: string[];
  client_ip: string | null;
  on_venue_network?: boolean;
  ipv6_prefix_suggestion?: string | null;
}

export async function getTimeClockNetwork() {
  return request<TimeClockNetworkDto>('/admin/time-clock/network');
}

export async function updateTimeClockNetwork(payload: {
  allowed_ips?: string[];
  capture_current?: boolean;
  /** When capturing an IPv6 address, store /64 prefix (default true on server). */
  capture_as_prefix?: boolean;
}) {
  return request<TimeClockNetworkDto>('/admin/time-clock/network', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
