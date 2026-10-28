import { request } from '../core';

export type AppNotificationDto = {
  id: number;
  type: string;
  severity: string;
  title: string;
  body: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  is_read?: boolean;
};

export async function listNotifications(): Promise<AppNotificationDto[]> {
  const res = await request<{ success: boolean; data: AppNotificationDto[] }>(
    '/admin/notifications'
  );
  return res.data ?? [];
}

export async function getNotificationUnreadCount(): Promise<number> {
  const res = await request<{ success: boolean; count: number }>(
    '/admin/notifications/unread-count'
  );
  return Number(res.count) || 0;
}

export async function markNotificationRead(id: number): Promise<void> {
  await request(`/admin/notifications/${id}/read`, { method: 'POST' });
}

export async function markAllNotificationsRead(): Promise<void> {
  await request('/admin/notifications/read-all', { method: 'POST' });
}
