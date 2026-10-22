import { useCallback, useEffect, useMemo, useState } from 'react';
import { PERMISSIONS } from '@mosehxl/types';
import type { User } from '../../../types/auth';
import { useStepUpAuth } from '../../../contexts/StepUpAuthContext';
import {
  deleteTimeEntry,
  getPayrollSummary,
  listTimeClockStaff,
  listTimeEntries,
  TimeClockStaffDto,
  TimeEntryDto,
  TimeHoursTotalDto,
  updateTimeEntry,
  type PayrollSummaryDto,
} from '../../../services/api/adminSpace';
import { endOfWeekIso, startOfWeekIso } from '../timeClockPanelDates';
import { fromLocalInputValue, toLocalInputValue } from './timeClockFormat';

export function useTimeClockPanel(user: User) {
  const { hasAccess } = useStepUpAuth();
  const canManage =
    hasAccess(PERMISSIONS.access_planning) || user.role === 'establishment_admin';

  const [tab, setTab] = useState(0);
  const [staff, setStaff] = useState<TimeClockStaffDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [from, setFrom] = useState(startOfWeekIso);
  const [to, setTo] = useState(endOfWeekIso);
  const [entries, setEntries] = useState<TimeEntryDto[]>([]);
  const [totals, setTotals] = useState<TimeHoursTotalDto[]>([]);
  const [payroll, setPayroll] = useState<PayrollSummaryDto | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const [editEntry, setEditEntry] = useState<TimeEntryDto | null>(null);
  const [editIn, setEditIn] = useState('');
  const [editOut, setEditOut] = useState('');
  const [editNote, setEditNote] = useState('');

  const refreshStaff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listTimeClockStaff();
      setStaff(data.staff);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement employés');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshReport = useCallback(async () => {
    if (!canManage) return;
    setReportLoading(true);
    try {
      const entriesData = await listTimeEntries(from, to);
      setEntries(entriesData.entries);
      setTotals(entriesData.totals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur rapport heures');
    } finally {
      setReportLoading(false);
    }
  }, [canManage, from, to]);

  const refreshPayroll = useCallback(async () => {
    if (!canManage) return;
    setReportLoading(true);
    try {
      const summary = await getPayrollSummary(from, to);
      setPayroll(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur synthèse paie');
    } finally {
      setReportLoading(false);
    }
  }, [canManage, from, to]);

  const refreshActiveTab = useCallback(async () => {
    if (tab === 1) await refreshReport();
    else if (tab === 2) await refreshPayroll();
  }, [tab, refreshReport, refreshPayroll]);

  useEffect(() => {
    void refreshStaff();
  }, [refreshStaff]);

  useEffect(() => {
    if (canManage && tab > 0) void refreshActiveTab();
  }, [refreshActiveTab, canManage, tab, from, to]);

  const currentlyIn = useMemo(() => staff.filter((s) => s.open_entry), [staff]);

  const openEdit = (entry: TimeEntryDto) => {
    setEditEntry(entry);
    setEditIn(toLocalInputValue(entry.clock_in_at));
    setEditOut(toLocalInputValue(entry.clock_out_at));
    setEditNote(entry.note || '');
  };

  const saveEdit = async () => {
    if (!editEntry) return;
    try {
      await updateTimeEntry(editEntry.id, {
        clock_in_at: fromLocalInputValue(editIn),
        clock_out_at: editOut ? fromLocalInputValue(editOut) : null,
        note: editNote,
      });
      setEditEntry(null);
      await refreshActiveTab();
      await refreshStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la modification');
    }
  };

  const removeEntry = async (id: number) => {
    if (!window.confirm('Supprimer ce pointage ?')) return;
    try {
      await deleteTimeEntry(id);
      await refreshActiveTab();
      await refreshStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la suppression');
    }
  };

  return {
    canManage,
    tab,
    setTab,
    staff,
    currentlyIn,
    loading,
    error,
    setError,
    message,
    setMessage,
    from,
    setFrom,
    to,
    setTo,
    entries,
    totals,
    payroll,
    reportLoading,
    editEntry,
    setEditEntry,
    editIn,
    setEditIn,
    editOut,
    setEditOut,
    editNote,
    setEditNote,
    refreshStaff,
    refreshReport,
    refreshPayroll,
    openEdit,
    saveEdit,
    removeEntry,
  };
}
