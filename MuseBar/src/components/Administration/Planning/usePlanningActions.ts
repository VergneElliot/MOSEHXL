import { useState } from 'react';
import {
  commitPlanningShifts,
  duplicatePlanningWeek,
  getStaffIcs,
  resetAllShifts,
} from '../../../services/api/adminSpace';
import { addDays, startOfMonth } from '../AdminMonthCalendar';
import {
  emptyPlanningDraft,
  type PlanningDraftState,
} from '../planningDraft';

type Args = {
  draft: PlanningDraftState;
  dirty: boolean;
  weekStart: Date;
  weekEnd: Date;
  setDraft: (value: PlanningDraftState | ((prev: PlanningDraftState) => PlanningDraftState)) => void;
  setWeekStart: (value: Date) => void;
  setMonth: (value: Date) => void;
  setError: (value: string | null) => void;
  setSaveMessage: (value: string | null) => void;
  refresh: () => Promise<void>;
};

export function usePlanningActions({
  draft,
  dirty,
  weekStart,
  weekEnd,
  setDraft,
  setWeekStart,
  setMonth,
  setError,
  setSaveMessage,
  refresh,
}: Args) {
  const [busy, setBusy] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const saveAllChanges = async () => {
    if (!dirty) return;
    setBusy(true);
    setError(null);
    setSaveMessage(null);
    try {
      const result = await commitPlanningShifts({
        creates: draft.creates.map((c) => ({
          user_id: c.user_id,
          starts_at: c.starts_at,
          ends_at: c.ends_at,
          label: c.label,
          recurrence: c.recurrence,
        })),
        updates: draft.updates,
        deletes: draft.deletes,
      });
      setDraft(emptyPlanningDraft());
      setSaveMessage(
        result.message ||
          `Enregistré : ${result.created_count} créées, ${result.updated_count} modifiées, ${result.deleted_count} supprimées.`
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setBusy(false);
    }
  };

  const discardChanges = () => {
    setDraft(emptyPlanningDraft());
    setDiscardOpen(false);
    setSaveMessage('Modifications locales annulées');
  };

  const duplicateWeek = async () => {
    const created = await duplicatePlanningWeek({
      source_from: weekStart.toISOString(),
      source_to: weekEnd.toISOString(),
      target_from: addDays(weekStart, 7).toISOString(),
    });
    alert(`${created.created} vacation(s) dupliquée(s) sur la semaine suivante.`);
    setWeekStart(addDays(weekStart, 7));
    setMonth(startOfMonth(addDays(weekStart, 7)));
  };

  const copyIcs = async (userId: number) => {
    const { url } = await getStaffIcs(userId);
    await navigator.clipboard.writeText(url);
    alert(`Lien ICS copié :\n${url}`);
  };

  const confirmReset = async () => {
    setBusy(true);
    try {
      setError(null);
      const result = await resetAllShifts();
      setDraft(emptyPlanningDraft());
      setResetConfirmOpen(false);
      alert(`${result.deleted} vacation(s) supprimée(s).`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Réinitialisation impossible');
    } finally {
      setBusy(false);
    }
  };

  return {
    busy,
    discardOpen,
    setDiscardOpen,
    resetConfirmOpen,
    setResetConfirmOpen,
    saveAllChanges,
    discardChanges,
    duplicateWeek,
    copyIcs,
    confirmReset,
  };
}
