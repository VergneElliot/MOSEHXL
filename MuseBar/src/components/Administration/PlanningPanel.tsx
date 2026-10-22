import React from 'react';
import { Alert, Box } from '@mui/material';
import { addDays } from './AdminMonthCalendar';
import PlanningDiscardDialog from './Planning/PlanningDiscardDialog';
import PlanningLeaveDialog from './Planning/PlanningLeaveDialog';
import PlanningLeavePending from './Planning/PlanningLeavePending';
import PlanningMonthCalendar from './Planning/PlanningMonthCalendar';
import PlanningResetDialog from './Planning/PlanningResetDialog';
import PlanningSeriesScopeDialog from './Planning/PlanningSeriesScopeDialog';
import PlanningShiftDialog from './Planning/PlanningShiftDialog';
import PlanningToolbar from './Planning/PlanningToolbar';
import PlanningWeekGrid from './Planning/PlanningWeekGrid';
import { usePlanningActions } from './Planning/usePlanningActions';
import { usePlanningData } from './Planning/usePlanningData';
import { usePlanningLeave } from './Planning/usePlanningLeave';
import { usePlanningShiftDialog } from './Planning/usePlanningShiftDialog';

const PlanningPanel: React.FC = () => {
  const data = usePlanningData();
  const actions = usePlanningActions({
    draft: data.draft,
    dirty: data.dirty,
    weekStart: data.weekStart,
    weekEnd: data.weekEnd,
    setDraft: data.setDraft,
    setWeekStart: data.setWeekStart,
    setMonth: data.setMonth,
    setError: data.setError,
    setSaveMessage: data.setSaveMessage,
    refresh: data.refresh,
  });
  const shiftDialog = usePlanningShiftDialog({
    staff: data.staff,
    weekStart: data.weekStart,
    displayShifts: data.displayShifts,
    setDraft: data.setDraft,
    setError: data.setError,
  });
  const leave = usePlanningLeave({
    staff: data.staff,
    setError: data.setError,
    refresh: data.refresh,
  });

  return (
    <Box>
      {data.error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => data.setError(null)}>
          {data.error}
        </Alert>
      )}
      {data.saveMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => data.setSaveMessage(null)}>
          {data.saveMessage}
        </Alert>
      )}
      <PlanningToolbar
        dirty={data.dirty}
        dirtyCount={data.dirtyCount}
        busy={actions.busy}
        onOpenCreate={() => shiftDialog.openCreate()}
        onSave={() => void actions.saveAllChanges()}
        onOpenLeave={leave.openLeave}
        onDuplicateWeek={() => void actions.duplicateWeek()}
        onReset={() => actions.setResetConfirmOpen(true)}
        onDiscard={() => actions.setDiscardOpen(true)}
      />
      <PlanningMonthCalendar
        month={data.month}
        items={data.calendarItems}
        displayShifts={data.displayShifts}
        onMonthChange={data.setMonth}
        onWeekStartChange={data.setWeekStart}
        onOpenCreate={(day) => shiftDialog.openCreate(day)}
        onOpenShift={shiftDialog.openShift}
      />
      <PlanningWeekGrid
        staff={data.staff}
        days={data.days}
        weekStart={data.weekStart}
        onPrevWeek={() => data.setWeekStart(addDays(data.weekStart, -7))}
        onNextWeek={() => data.setWeekStart(addDays(data.weekStart, 7))}
        onOpenCreate={(day) => shiftDialog.openCreate(day)}
        onOpenCreateForStaff={shiftDialog.openCreateForStaff}
        onCopyIcs={(userId) => void actions.copyIcs(userId)}
        onDeleteShift={shiftDialog.deleteShiftFromGrid}
        nameOf={data.nameOf}
        colorOf={data.colorOf}
        shiftsFor={data.shiftsFor}
      />
      <PlanningLeavePending
        leaves={data.leaves}
        nameOf={data.nameOf}
        onApprove={(id) => void leave.setLeaveStatus(id, 'approved')}
        onReject={(id) => void leave.setLeaveStatus(id, 'rejected')}
      />
      <PlanningLeaveDialog
        open={leave.leaveOpen}
        leaveForm={leave.leaveForm}
        leavePreview={leave.leavePreview}
        staff={data.staff}
        nameOf={data.nameOf}
        onClose={leave.closeLeave}
        onChange={leave.setLeaveForm}
        onSubmit={() => void leave.submitLeave()}
      />
      <PlanningShiftDialog
        open={shiftDialog.open}
        form={shiftDialog.form}
        staff={data.staff}
        busy={actions.busy}
        seriesSiblingCount={shiftDialog.seriesSiblingCount}
        nameOf={data.nameOf}
        onClose={() => shiftDialog.setOpen(false)}
        onChange={shiftDialog.setForm}
        onSave={shiftDialog.requestSave}
        onDelete={shiftDialog.requestDelete}
      />
      <PlanningSeriesScopeDialog
        open={shiftDialog.seriesScopeOpen}
        busy={actions.busy}
        seriesScopeAction={shiftDialog.seriesScopeAction}
        seriesSiblingCount={shiftDialog.seriesSiblingCount}
        onClose={() => shiftDialog.closeSeriesScope(actions.busy)}
        onApplyOne={() =>
          shiftDialog.seriesScopeAction === 'delete'
            ? shiftDialog.removeShift('one')
            : shiftDialog.persistShift('one')
        }
        onApplySeries={() =>
          shiftDialog.seriesScopeAction === 'delete'
            ? shiftDialog.removeShift('series')
            : shiftDialog.persistShift('series')
        }
      />
      <PlanningDiscardDialog
        open={actions.discardOpen}
        dirtyCount={data.dirtyCount}
        onClose={() => actions.setDiscardOpen(false)}
        onConfirm={actions.discardChanges}
      />
      <PlanningResetDialog
        open={actions.resetConfirmOpen}
        busy={actions.busy}
        onClose={() => actions.setResetConfirmOpen(false)}
        onConfirm={() => void actions.confirmReset()}
      />
    </Box>
  );
};

export default PlanningPanel;
