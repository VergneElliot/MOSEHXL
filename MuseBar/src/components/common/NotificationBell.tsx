import React, { useCallback, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Typography,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import {
  getNotificationUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotificationDto,
} from '../../services/api/admin/notifications';
import { useVisibleInterval } from '../../hooks/useVisibleInterval';
import { requestOpenAdmin } from '../../utils/adminNavigate';

function hrefToSection(
  href: unknown
): 'inbox' | 'reservations' | null {
  if (href === 'admin:reservations') return 'reservations';
  if (href === 'admin:inbox') return 'inbox';
  return null;
}

export const NotificationBell: React.FC = () => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<AppNotificationDto[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      setCount(await getNotificationUnreadCount());
    } catch {
      /* header is best-effort */
    }
  }, []);

  useVisibleInterval(() => {
    void refreshCount();
  }, 45_000, true);

  React.useEffect(() => {
    void refreshCount();
  }, [refreshCount]);

  const openPopover = async (el: HTMLElement) => {
    setAnchor(el);
    setLoading(true);
    try {
      const data = await listNotifications();
      setItems(data);
      setCount(data.filter((n) => !n.is_read).length);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const onClickItem = async (n: AppNotificationDto) => {
    try {
      if (!n.is_read) await markNotificationRead(n.id);
    } catch {
      /* ignore */
    }
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    setCount((c) => Math.max(0, c - (n.is_read ? 0 : 1)));
    const section = hrefToSection(n.payload?.href);
    if (section) {
      requestOpenAdmin({
        section,
        reservationId:
          typeof n.payload?.reservation_id === 'number' ? n.payload.reservation_id : null,
      });
    }
    setAnchor(null);
  };

  const onMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
      setCount(0);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <IconButton
        color="inherit"
        size="small"
        aria-label="Notifications"
        onClick={(e) => void openPopover(e.currentTarget)}
      >
        <Badge badgeContent={count > 99 ? '99+' : count} color="error" max={99}>
          <NotificationsIcon fontSize="small" />
        </Badge>
      </IconButton>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 360, maxHeight: 420 } }}
      >
        <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ flex: 1 }}>
            Notifications
          </Typography>
          <Button size="small" onClick={() => void onMarkAll()} disabled={count === 0}>
            Tout lu
          </Button>
        </Box>
        <Divider />
        {loading ? (
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={22} />
          </Box>
        ) : (
          <List dense disablePadding>
            {items.length === 0 && (
              <ListItemText
                sx={{ px: 2, py: 2 }}
                primary="Aucune notification"
                primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
              />
            )}
            {items.map((n) => (
              <ListItemButton
                key={n.id}
                onClick={() => void onClickItem(n)}
                sx={{ bgcolor: n.is_read ? undefined : 'action.hover' }}
              >
                <ListItemText
                  primary={n.title}
                  secondary={n.body || undefined}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: n.is_read ? 400 : 600 }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Popover>
    </>
  );
};
