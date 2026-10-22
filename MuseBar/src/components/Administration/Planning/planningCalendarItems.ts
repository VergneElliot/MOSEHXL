import type { StaffLeaveDto } from '../../../services/api/adminSpace';
import { formatTime } from '../../../utils/formatDate';
import type { AdminCalendarItem } from '../AdminMonthCalendar';
import {
  colorOfStaff,
  isPendingShift,
  LEAVE_TYPE_LABELS,
  nameOfStaff,
  type DisplayShift,
  type PlanningStaffMember,
} from './planningTypes';

export function buildPlanningCalendarItems(
  displayShifts: DisplayShift[],
  leaves: StaffLeaveDto[],
  staff: PlanningStaffMember[]
): AdminCalendarItem[] {
  const shiftItems = displayShifts.map((s) => {
    const start = new Date(s.starts_at);
    const time = `${formatTime(s.starts_at)}–${formatTime(s.ends_at)}`;
    const pending = isPendingShift(s);
    return {
      id: s.id,
      startsAt: start,
      title: `${time} · ${nameOfStaff(staff, s.user_id)}${s.label ? ` · ${s.label}` : ''}${
        pending ? ' (en attente)' : ''
      }`,
      subtitle: pending
        ? s._draft
          ? 'Modification non enregistrée'
          : 'En attente de confirmation employé'
        : s.label || undefined,
      color: pending ? '#ED6C02' : colorOfStaff(staff, s.user_id),
    };
  });
  const leaveItems = leaves
    .filter((l) => l.status === 'approved' || l.status === 'pending')
    .map((l) => {
      const start = new Date(`${l.starts_on}T08:00:00`);
      const label = LEAVE_TYPE_LABELS[l.leave_type] ?? l.leave_type;
      const pending = l.status === 'pending';
      return {
        id: `leave-${l.id}`,
        startsAt: start,
        title: `${label} · ${nameOfStaff(staff, l.user_id)}${pending ? ' (demande)' : ''}`,
        subtitle: l.note || undefined,
        color: pending ? '#9c27b0' : '#2e7d32',
      };
    });
  return [...shiftItems, ...leaveItems];
}
