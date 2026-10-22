import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { parisDateTimeLocalToUtcIso } from '../../../utils/formatDate';
import { type PlanningDraftState } from '../planningDraft';
import { removeShiftFromDraft, upsertShiftInDraft } from './planningShiftDraft';
import {
  newShiftForm,
  shiftToForm,
  type ApplyTo,
  type DisplayShift,
  type PlanningStaffMember,
  type SeriesScopeAction,
  type ShiftForm,
} from './planningTypes';

type Args = {
  staff: PlanningStaffMember[];
  weekStart: Date;
  displayShifts: DisplayShift[];
  setDraft: Dispatch<SetStateAction<PlanningDraftState>>;
  setError: (value: string | null) => void;
};

export function usePlanningShiftDialog({
  staff,
  weekStart,
  displayShifts,
  setDraft,
  setError,
}: Args) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ShiftForm | null>(null);
  const [seriesScopeOpen, setSeriesScopeOpen] = useState(false);
  const [seriesScopeAction, setSeriesScopeAction] = useState<SeriesScopeAction | null>(null);

  const seriesSiblingCount = useMemo(() => {
    if (!form?.series_id) return 0;
    return displayShifts.filter((s) => s.series_id === form.series_id).length;
  }, [form?.series_id, displayShifts]);

  const closeForm = () => {
    setSeriesScopeOpen(false);
    setSeriesScopeAction(null);
    setOpen(false);
    setForm(null);
  };

  const openCreate = (day?: Date) => {
    const base = day ? new Date(day) : new Date(weekStart);
    setForm(newShiftForm(staff[0]?.id ?? 0, base));
    setOpen(true);
  };

  const openCreateForStaff = (userId: number, day: Date) => {
    setForm(newShiftForm(userId, day));
    setOpen(true);
  };

  const openShift = (next: ShiftForm) => {
    setForm(next);
    setOpen(true);
  };

  const persistShift = (applyTo: ApplyTo) => {
    if (!form?.user_id) return;
    setError(null);
    setDraft((prev) =>
      upsertShiftInDraft(
        prev,
        form,
        {
          starts_at: parisDateTimeLocalToUtcIso(form.starts_at),
          ends_at: parisDateTimeLocalToUtcIso(form.ends_at),
        },
        applyTo
      )
    );
    closeForm();
  };

  const removeShift = (applyTo: ApplyTo) => {
    const shiftId = form?.id;
    if (!shiftId) return;
    setError(null);
    setDraft((prev) => removeShiftFromDraft(prev, shiftId, applyTo));
    closeForm();
  };

  const requestSave = () => {
    if (!form?.user_id) return;
    if (form.id && form.id > 0 && form.series_id) {
      setSeriesScopeAction('save');
      setSeriesScopeOpen(true);
      return;
    }
    persistShift('one');
  };

  const requestDelete = () => {
    if (!form?.id) return;
    if (form.id > 0 && form.series_id) {
      setSeriesScopeAction('delete');
      setSeriesScopeOpen(true);
      return;
    }
    if (!window.confirm('Supprimer cette vacation ?')) return;
    removeShift('one');
  };

  const deleteShiftFromGrid = (shift: DisplayShift) => {
    if (shift.id > 0 && shift.series_id) {
      setForm(shiftToForm(shift));
      setSeriesScopeAction('delete');
      setSeriesScopeOpen(true);
      return;
    }
    if (!window.confirm('Supprimer cette vacation ?')) return;
    setDraft((prev) => removeShiftFromDraft(prev, shift.id, 'one'));
  };

  const closeSeriesScope = (busy: boolean) => {
    if (busy) return;
    setSeriesScopeOpen(false);
    setSeriesScopeAction(null);
  };

  return {
    open,
    setOpen,
    form,
    setForm,
    seriesScopeOpen,
    seriesScopeAction,
    seriesSiblingCount,
    openCreate,
    openCreateForStaff,
    openShift,
    persistShift,
    removeShift,
    requestSave,
    requestDelete,
    deleteShiftFromGrid,
    closeSeriesScope,
  };
}
