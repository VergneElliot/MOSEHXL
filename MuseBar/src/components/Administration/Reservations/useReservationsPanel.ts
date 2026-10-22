import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getReservationClosedDates,
  getReservationsIcs,
  getReservationsPublicLink,
  listReservations,
  setReservationDayClosed,
  updateReservation,
  type ReservationDto,
} from '../../../services/api/adminSpace';
import {
  addMonths,
  startOfMonth,
  toLocalDateInputValue,
  type AdminCalendarItem,
} from '../AdminMonthCalendar';
import { formatTime, utcToParisDateTimeLocal } from '../../../utils/formatDate';
import { resolveInboxByReservation } from '../../../services/api/adminInboxApi';
import { saveReservationEdit } from '../saveReservationEdit';
import { localDateKey, STATUSES, STATUS_COLOR } from './reservationConstants';
import type { CommentDialogState } from './ReservationCommentDialog';

type Args = {
  onOpenConversation?: (reservationId: number) => void;
};

export function useReservationsPanel({ onOpenConversation }: Args) {
  const [rows, setRows] = useState<ReservationDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [icsUrl, setIcsUrl] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [hoursConfigured, setHoursConfigured] = useState(true);
  const [open, setOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState(0);
  const [dayContext, setDayContext] = useState<Date | null>(null);
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [dayStatusBusy, setDayStatusBusy] = useState(false);
  const [edit, setEdit] = useState<Partial<ReservationDto> | null>(null);
  const [commentDialog, setCommentDialog] = useState<CommentDialogState | null>(null);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [conversationBusy, setConversationBusy] = useState(false);

  const range = useMemo(() => {
    const from = addMonths(month, -1);
    const to = addMonths(month, 2);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [month]);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [data, closed] = await Promise.all([
        listReservations(range),
        getReservationClosedDates().catch(() => ({ dates: [] as string[] })),
      ]);
      setRows(data.reservations);
      setClosedDates(closed.dates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible');
    }
  }, [range]);

  useEffect(() => {
    void refresh();
    void getReservationsIcs()
      .then((r) => setIcsUrl(r.url))
      .catch(() => undefined);
    void getReservationsPublicLink()
      .then((r) => {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const url = r.slug && origin ? `${origin}/reserve/${r.slug}` : r.url;
        setPublicUrl(url);
        setHoursConfigured(r.opening_hours_configured);
      })
      .catch(() => undefined);
  }, [refresh]);

  const calendarItems: AdminCalendarItem[] = useMemo(
    () =>
      rows.map((r) => {
        const start = new Date(r.starts_at);
        const time = formatTime(r.starts_at);
        return {
          id: r.id,
          startsAt: start,
          title: `${time} · ${r.customer_name} (${r.party_size})`,
          subtitle: STATUSES.find((s) => s.id === r.status)?.label,
          color: STATUS_COLOR[r.status] || '#1976d2',
        };
      }),
    [rows]
  );

  const upcomingRows = useMemo(() => {
    const now = Date.now();
    return rows
      .filter((r) => new Date(r.starts_at).getTime() >= now)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }, [rows]);

  const openCreate = (day?: Date) => {
    const alreadyClosed = day ? closedDates.includes(localDateKey(day)) : false;
    setDayContext(day || null);
    setDialogTab(day && alreadyClosed ? 1 : 0);
    if (day) {
      setEdit({
        customer_name: '',
        party_size: 2,
        starts_at: toLocalDateInputValue(day, 19, 0),
        status: 'requested',
        status_reason: null,
      });
    } else {
      const starts = new Date();
      starts.setMinutes(0, 0, 0);
      starts.setHours(starts.getHours() + 2);
      setEdit({
        customer_name: '',
        party_size: 2,
        starts_at: toLocalDateInputValue(starts, starts.getHours(), starts.getMinutes()),
        status: 'requested',
        status_reason: null,
      });
    }
    setOpen(true);
  };

  const openEdit = (r: ReservationDto) => {
    setDayContext(null);
    setDialogTab(0);
    setEdit({
      ...r,
      starts_at: utcToParisDateTimeLocal(r.starts_at),
    });
    setOpen(true);
  };

  const selectedDayKey = dayContext ? localDateKey(dayContext) : null;
  const selectedDayClosed = selectedDayKey ? closedDates.includes(selectedDayKey) : false;

  const toggleDayClosed = async (closed: boolean) => {
    if (!selectedDayKey) return;
    setDayStatusBusy(true);
    try {
      setError(null);
      const result = await setReservationDayClosed(selectedDayKey, closed);
      setClosedDates(result.dates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour du jour impossible');
    } finally {
      setDayStatusBusy(false);
    }
  };

  const applyQuickStatus = async (id: number, status: string, status_reason?: string) => {
    try {
      setError(null);
      await updateReservation(id, { status, status_reason: status_reason ?? null });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible');
    }
  };

  const copyPublicLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
    } catch {
      /* ignore */
    }
  };

  const saveEdit = async () => {
    if (!edit) return;
    const { emailWarning } = await saveReservationEdit(edit);
    if (emailWarning) setError(emailWarning);
    setOpen(false);
    setEdit(null);
    await refresh();
  };

  const submitComment = async () => {
    if (!commentDialog) return;
    await applyQuickStatus(
      commentDialog.id,
      commentDialog.status,
      commentDialog.commentaire.trim() || undefined
    );
    setCommentDialog(null);
  };

  const openConversation = async () => {
    if (!edit?.id || !onOpenConversation) return;
    setConversationBusy(true);
    try {
      setError(null);
      const hit = await resolveInboxByReservation(edit.id);
      setOpen(false);
      onOpenConversation(edit.id);
      void hit;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Aucune conversation trouvée pour cette réservation'
      );
    } finally {
      setConversationBusy(false);
    }
  };

  return {
    rows,
    error,
    setError,
    icsUrl,
    publicUrl,
    hoursConfigured,
    open,
    dialogTab,
    setDialogTab,
    dayContext,
    closedDates,
    dayStatusBusy,
    edit,
    setEdit,
    commentDialog,
    setCommentDialog,
    month,
    setMonth,
    conversationBusy,
    calendarItems,
    upcomingRows,
    selectedDayClosed,
    openCreate,
    openEdit,
    toggleDayClosed,
    copyPublicLink,
    saveEdit,
    submitComment,
    openConversation,
    closeDialog: () => {
      setOpen(false);
      setDayContext(null);
      setDialogTab(0);
    },
  };
}
