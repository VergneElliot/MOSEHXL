import { useEffect, useMemo, useState } from 'react';
import { apiCore } from '../../services/api';
import { parisTodayYmd } from '../../utils/formatDate';
import {
  parseEmailRecipients,
  parseFondDeCaisse,
  type ClosureType,
  type DailyClosureMode,
  type DailyClosurePreview,
} from './createClosureTypes';

type Args = {
  open: boolean;
  selectedDate: string;
  selectedClosureType: ClosureType;
  onDateChange: (date: string) => void;
  defaultFondDeCaisse?: number | null;
};

export function useCreateClosureDialog({
  open,
  selectedDate,
  selectedClosureType,
  onDateChange,
  defaultFondDeCaisse = null,
}: Args) {
  const todayISO = useMemo(() => parisTodayYmd(), []);
  const [forceCreation, setForceCreation] = useState(false);
  const [fondDeCaisse, setFondDeCaisse] = useState<string>('');
  const [emailRecipients, setEmailRecipients] = useState('');
  const [dailyMode, setDailyMode] = useState<DailyClosureMode>('close_now');
  const [cutTime, setCutTime] = useState('02:00');
  const [preview, setPreview] = useState<DailyClosurePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const initial = defaultFondDeCaisse ?? 0;
    setFondDeCaisse(String(initial));
    setDailyMode('close_now');

    let cancelled = false;
    (async () => {
      try {
        const settingsRes = await apiCore.request<{
          settings?: { accounting_emails?: string[]; daily_closure_time?: string };
          daily_closure_time?: string;
        }>('/legal/closure-settings', { method: 'GET' });
        if (cancelled) return;
        const defaults = settingsRes?.settings?.accounting_emails;
        setEmailRecipients(Array.isArray(defaults) && defaults.length > 0 ? defaults.join(', ') : '');
        const time =
          settingsRes?.settings?.daily_closure_time ||
          settingsRes?.daily_closure_time ||
          '02:00';
        setCutTime(time);
      } catch {
        if (!cancelled) {
          setEmailRecipients('');
          setCutTime('02:00');
        }
      }

      try {
        const suggestion = await apiCore.request<{ date?: string }>(
          '/legal/closure/suggest-business-day-date',
          { method: 'GET' }
        );
        if (!cancelled && suggestion?.date) {
          onDateChange(suggestion.date);
        }
      } catch {
        // Keep whatever date the parent already has.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, defaultFondDeCaisse, onDateChange]);

  useEffect(() => {
    if (!open || selectedClosureType !== 'DAILY' || dailyMode !== 'business_day') return;
    let cancelled = false;
    (async () => {
      try {
        const suggestion = await apiCore.request<{ date?: string }>(
          '/legal/closure/suggest-business-day-date',
          { method: 'GET' }
        );
        if (!cancelled && suggestion?.date) {
          onDateChange(suggestion.date);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, selectedClosureType, dailyMode, onDateChange]);

  useEffect(() => {
    if (!open || selectedClosureType !== 'DAILY') {
      setPreview(null);
      return;
    }
    if (dailyMode === 'business_day' && !selectedDate) {
      setPreview(null);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);

    const params = new URLSearchParams({ mode: dailyMode });
    if (dailyMode === 'business_day') params.set('date', selectedDate);
    if (forceCreation) params.set('force', 'true');

    (async () => {
      try {
        const res = await apiCore.request<DailyClosurePreview>(
          `/legal/closure/daily-preview?${params.toString()}`,
          { method: 'GET' }
        );
        if (!cancelled) setPreview(res ?? null);
      } catch {
        if (!cancelled) setPreview(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, selectedClosureType, dailyMode, selectedDate, forceCreation]);

  const fondDeCaisseNumber = useMemo(() => parseFondDeCaisse(fondDeCaisse), [fondDeCaisse]);
  const parsedEmails = useMemo(() => parseEmailRecipients(emailRecipients), [emailRecipients]);

  const isDaily = selectedClosureType === 'DAILY';
  const needsDate = !isDaily || dailyMode === 'business_day';
  const previewBlocks = isDaily && preview !== null && preview.ok === false;
  const previewIsEmpty = isDaily && preview?.ok === true && preview.total_transactions === 0;

  return {
    todayISO,
    forceCreation,
    setForceCreation,
    fondDeCaisse,
    setFondDeCaisse,
    emailRecipients,
    setEmailRecipients,
    dailyMode,
    setDailyMode,
    cutTime,
    preview,
    previewLoading,
    fondDeCaisseNumber,
    parsedEmails,
    isDaily,
    needsDate,
    previewBlocks,
    previewIsEmpty,
  };
}
