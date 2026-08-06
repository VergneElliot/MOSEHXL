import React, { useMemo } from 'react';
import { Box, Button, IconButton, Typography } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function toLocalDateInputValue(d: Date, hour = 19, minute = 0): string {
  const x = new Date(d);
  x.setHours(hour, minute, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export interface AdminCalendarItem {
  id: number | string;
  startsAt: Date;
  title: string;
  subtitle?: string;
  color?: string;
}

interface AdminMonthCalendarProps {
  month: Date;
  onMonthChange: (month: Date) => void;
  items: AdminCalendarItem[];
  onDayClick: (day: Date) => void;
  onItemClick?: (item: AdminCalendarItem) => void;
  maxItemsPerDay?: number;
  /** When true for a day, click is ignored and the cell is visually muted. */
  dayDisabled?: (day: Date) => boolean;
  /** Visual “closed to bookings” mark — still clickable (admin day status). */
  dayClosed?: (day: Date) => boolean;
  hideFooterHint?: boolean;
}

/**
 * Month grid for Administration calendars (reservations / planning).
 * Click empty day space → onDayClick; click an event chip → onItemClick when provided.
 */
const AdminMonthCalendar: React.FC<AdminMonthCalendarProps> = ({
  month,
  onMonthChange,
  items,
  onDayClick,
  onItemClick,
  maxItemsPerDay = 3,
  dayDisabled,
  dayClosed,
  hideFooterHint = false,
}) => {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const cells = useMemo(() => {
    const first = startOfMonth(month);
    const mondayOffset = (first.getDay() + 6) % 7;
    const gridStart = addDays(first, -mondayOffset);
    return Array.from({ length: 42 }, (_, i) => {
      const day = addDays(gridStart, i);
      day.setHours(0, 0, 0, 0);
      return day;
    });
  }, [month]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, AdminCalendarItem[]>();
    for (const item of items) {
      const key = item.startsAt.toDateString();
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    }
    return map;
  }, [items]);

  const inCurrentMonth = (day: Date) => day.getMonth() === month.getMonth();

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <IconButton aria-label="Mois précédent" onClick={() => onMonthChange(addMonths(month, -1))}>
          <ChevronLeft />
        </IconButton>
        <Typography variant="h6" sx={{ flex: 1, textAlign: 'center', textTransform: 'capitalize' }}>
          {month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </Typography>
        <Button size="small" onClick={() => onMonthChange(startOfMonth(new Date()))}>
          Aujourd&apos;hui
        </Button>
        <IconButton aria-label="Mois suivant" onClick={() => onMonthChange(addMonths(month, 1))}>
          <ChevronRight />
        </IconButton>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 0.5,
          mb: 0.5,
        }}
      >
        {WEEKDAYS.map((d) => (
          <Typography
            key={d}
            variant="caption"
            sx={{ textAlign: 'center', fontWeight: 700, color: 'text.secondary' }}
          >
            {d}
          </Typography>
        ))}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 0.5,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          p: 0.5,
          bgcolor: 'background.paper',
        }}
      >
        {cells.map((day) => {
          const dayItems = itemsByDay.get(day.toDateString()) ?? [];
          const overflow = Math.max(0, dayItems.length - maxItemsPerDay);
          const isToday = sameDay(day, today);
          const muted = !inCurrentMonth(day);
          const disabled = dayDisabled?.(day) === true;
          const closed = !disabled && dayClosed?.(day) === true;

          return (
            <Box
              key={day.toISOString()}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-disabled={disabled}
              onClick={() => {
                if (!disabled) onDayClick(day);
              }}
              onKeyDown={(e) => {
                if (disabled) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onDayClick(day);
                }
              }}
              sx={{
                minHeight: { xs: 72, sm: 96 },
                p: 0.5,
                borderRadius: 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
                bgcolor: disabled
                  ? 'action.disabledBackground'
                  : closed
                    ? 'warning.50'
                    : isToday
                      ? 'action.selected'
                      : muted
                        ? 'action.hover'
                        : 'transparent',
                opacity: disabled ? 0.35 : muted ? 0.55 : 1,
                border: '1px solid',
                borderColor: closed
                  ? 'warning.light'
                  : isToday && !disabled
                    ? 'primary.main'
                    : 'transparent',
                '&:hover': disabled
                  ? undefined
                  : {
                      bgcolor: closed ? 'warning.100' : 'action.hover',
                      borderColor: 'primary.light',
                    },
                display: 'flex',
                flexDirection: 'column',
                gap: 0.25,
                overflow: 'hidden',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: isToday ? 700 : 600,
                  color: isToday ? 'primary.main' : 'text.primary',
                  alignSelf: 'flex-end',
                  lineHeight: 1.2,
                }}
              >
                {day.getDate()}
              </Typography>
              {closed && (
                <Typography
                  variant="caption"
                  color="warning.dark"
                  sx={{ fontWeight: 700, fontSize: '0.65rem', lineHeight: 1.1 }}
                >
                  Fermé
                </Typography>
              )}
              {dayItems.slice(0, maxItemsPerDay).map((item) => (
                <Box
                  key={String(item.id)}
                  component="button"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onItemClick?.(item);
                  }}
                  title={[item.title, item.subtitle].filter(Boolean).join(' — ')}
                  sx={{
                    all: 'unset',
                    display: 'block',
                    width: '100%',
                    boxSizing: 'border-box',
                    bgcolor: item.color || 'primary.main',
                    color: 'primary.contrastText',
                    borderRadius: 0.5,
                    px: 0.5,
                    py: 0.15,
                    fontSize: 10,
                    lineHeight: 1.25,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    cursor: onItemClick ? 'pointer' : 'default',
                  }}
                >
                  {item.title}
                </Box>
              ))}
              {overflow > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                  +{overflow} autre{overflow > 1 ? 's' : ''}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>
      {!hideFooterHint && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Cliquez sur un jour pour ajouter · cliquez sur un événement pour le modifier
        </Typography>
      )}
    </Box>
  );
};

export default AdminMonthCalendar;
