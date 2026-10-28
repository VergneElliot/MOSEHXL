export const NOTIFICATION_TYPES = {
  inbox_message: 'inbox_message',
  reservation_request: 'reservation_request',
  reservation_day: 'reservation_day',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export type NotificationAudience = 'permission' | 'user' | 'all_members';

export type NotificationSeverity = 'info' | 'warning' | 'urgent';
