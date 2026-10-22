import { useEffect, useState } from 'react';
import {
  createLeave,
  previewLeaveCount,
  updateLeaveStatus,
  type LeaveCountPreviewDto,
} from '../../../services/api/adminSpace';
import { emptyLeaveForm, type LeaveForm, type PlanningStaffMember } from './planningTypes';

type Args = {
  staff: PlanningStaffMember[];
  setError: (value: string | null) => void;
  refresh: () => Promise<void>;
};

export function usePlanningLeave({ staff, setError, refresh }: Args) {
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState<LeaveForm | null>(null);
  const [leavePreview, setLeavePreview] = useState<LeaveCountPreviewDto | null>(null);

  useEffect(() => {
    if (!leaveOpen || !leaveForm?.starts_on || !leaveForm?.ends_on) {
      setLeavePreview(null);
      return;
    }
    if (leaveForm.ends_on < leaveForm.starts_on) {
      setLeavePreview(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void previewLeaveCount({
        starts_on: leaveForm.starts_on,
        ends_on: leaveForm.ends_on,
        half_day_start: leaveForm.half_day_start,
        half_day_end: leaveForm.half_day_end,
      })
        .then(setLeavePreview)
        .catch(() => setLeavePreview(null));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [
    leaveOpen,
    leaveForm?.starts_on,
    leaveForm?.ends_on,
    leaveForm?.half_day_start,
    leaveForm?.half_day_end,
  ]);

  const openLeave = () => {
    setLeaveForm(emptyLeaveForm(staff[0]?.id ?? 0));
    setLeavePreview(null);
    setLeaveOpen(true);
  };

  const closeLeave = () => setLeaveOpen(false);

  const submitLeave = async () => {
    if (!leaveForm?.user_id) return;
    try {
      await createLeave({
        ...leaveForm,
        auto_approve: true,
      });
      setLeaveOpen(false);
      setLeaveForm(null);
      setLeavePreview(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible');
    }
  };

  const setLeaveStatus = async (id: number, status: 'approved' | 'rejected') => {
    await updateLeaveStatus(id, { status });
    await refresh();
  };

  return {
    leaveOpen,
    leaveForm,
    leavePreview,
    setLeaveForm,
    openLeave,
    closeLeave,
    submitLeave,
    setLeaveStatus,
  };
}
