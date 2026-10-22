import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listLeaves,
  listPlanningStaff,
  listShifts,
  type StaffLeaveDto,
  type StaffShiftDto,
} from '../../../services/api/adminSpace';
import { addDays, addMonths, startOfMonth } from '../AdminMonthCalendar';
import {
  applyPlanningDraftToShifts,
  emptyPlanningDraft,
  planningDraftCount,
  planningDraftIsDirty,
  setPlanningUiDirty,
  type PlanningDraftState,
} from '../planningDraft';
import { buildPlanningCalendarItems } from './planningCalendarItems';
import {
  colorOfStaff,
  nameOfStaff,
  shiftsForDay,
  startOfWeek,
  type DisplayShift,
  type PlanningStaffMember,
} from './planningTypes';

export function usePlanningData() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [staff, setStaff] = useState<PlanningStaffMember[]>([]);
  const [shifts, setShifts] = useState<StaffShiftDto[]>([]);
  const [draft, setDraft] = useState<PlanningDraftState>(() => emptyPlanningDraft());
  const [leaves, setLeaves] = useState<StaffLeaveDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const loadRange = useMemo(() => {
    const from = addMonths(month, -1);
    const to = addMonths(month, 2);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [month]);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [staffRes, shiftsRes, leavesRes] = await Promise.all([
        listPlanningStaff(),
        listShifts(loadRange.from, loadRange.to),
        listLeaves(loadRange.from, loadRange.to),
      ]);
      setStaff(staffRes.staff);
      setShifts(shiftsRes.shifts);
      setLeaves(leavesRes.leaves);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible');
    }
  }, [loadRange]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const dirty = planningDraftIsDirty(draft);
  const dirtyCount = planningDraftCount(draft);

  useEffect(() => {
    setPlanningUiDirty(dirty);
    return () => setPlanningUiDirty(false);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const displayShifts = useMemo(
    () => applyPlanningDraftToShifts(shifts, draft) as DisplayShift[],
    [shifts, draft]
  );

  const calendarItems = useMemo(
    () => buildPlanningCalendarItems(displayShifts, leaves, staff),
    [displayShifts, leaves, staff]
  );

  const nameOf = (id: number) => nameOfStaff(staff, id);
  const colorOf = (id: number) => colorOfStaff(staff, id);
  const shiftsFor = (userId: number, day: Date) => shiftsForDay(displayShifts, userId, day);

  return {
    month,
    setMonth,
    weekStart,
    setWeekStart,
    weekEnd,
    days,
    staff,
    leaves,
    draft,
    setDraft,
    error,
    setError,
    saveMessage,
    setSaveMessage,
    refresh,
    dirty,
    dirtyCount,
    displayShifts,
    calendarItems,
    nameOf,
    colorOf,
    shiftsFor,
  };
}
