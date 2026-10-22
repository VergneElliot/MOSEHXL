import {
  findStaffShiftsByConfirmationToken,
  getStaffShiftById,
  listStaffShifts,
  listStaffShiftsBySeries,
} from './staffShiftReadModel';
import {
  createStaffShift,
  deleteAllStaffShifts,
  deleteStaffShift,
  deleteStaffShiftSeries,
  duplicateStaffShiftWeek,
  getOrCreateStaffPlanningIcsToken,
  setStaffShiftApprovalByToken,
  updateStaffShift,
  updateStaffShiftWithBypass,
} from './staffShiftWriteModel';
import {
  createStaffShiftSeries,
  updateStaffShiftSeriesFromAnchor,
} from './staffShiftSeries';

export type {
  ShiftApprovalStatus,
  ShiftRecurrence,
  StaffShift,
} from './staffShiftTypes';

export { applySeriesTimeDelta, isValidRecurrence } from './staffShiftTypes';

export const StaffShiftModel = {
  list: listStaffShifts,
  getById: getStaffShiftById,
  findByConfirmationToken: findStaffShiftsByConfirmationToken,
  create: createStaffShift,
  createSeries: createStaffShiftSeries,
  listBySeries: listStaffShiftsBySeries,
  update: updateStaffShift,
  updateSeriesFromAnchor: updateStaffShiftSeriesFromAnchor,
  deleteSeries: deleteStaffShiftSeries,
  deleteAll: deleteAllStaffShifts,
  updateWithBypass: updateStaffShiftWithBypass,
  setApprovalByToken: setStaffShiftApprovalByToken,
  delete: deleteStaffShift,
  duplicateWeek: duplicateStaffShiftWeek,
  getOrCreateIcsToken: getOrCreateStaffPlanningIcsToken,
};
