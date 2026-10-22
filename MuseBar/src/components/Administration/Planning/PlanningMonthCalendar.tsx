import React from 'react';
import AdminMonthCalendar, { type AdminCalendarItem } from '../AdminMonthCalendar';
import { startOfWeek, shiftToForm, type DisplayShift } from './planningTypes';

type Props = {
  month: Date;
  items: AdminCalendarItem[];
  displayShifts: DisplayShift[];
  onMonthChange: (month: Date) => void;
  onWeekStartChange: (weekStart: Date) => void;
  onOpenCreate: (day: Date) => void;
  onOpenShift: (form: ReturnType<typeof shiftToForm>) => void;
};

const PlanningMonthCalendar: React.FC<Props> = ({
  month,
  items,
  displayShifts,
  onMonthChange,
  onWeekStartChange,
  onOpenCreate,
  onOpenShift,
}) => (
  <AdminMonthCalendar
    month={month}
    onMonthChange={(m) => {
      onMonthChange(m);
      onWeekStartChange(startOfWeek(m));
    }}
    items={items}
    onDayClick={(day) => {
      onWeekStartChange(startOfWeek(day));
      onOpenCreate(day);
    }}
    onItemClick={(item) => {
      if (typeof item.id === 'string' && item.id.startsWith('leave-')) return;
      const shift = displayShifts.find((s) => s.id === item.id);
      if (!shift) return;
      const start = new Date(shift.starts_at);
      onWeekStartChange(startOfWeek(start));
      onOpenShift(shiftToForm(shift));
    }}
  />
);

export default PlanningMonthCalendar;
