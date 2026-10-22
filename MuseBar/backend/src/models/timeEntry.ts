import {
  getOpenTimeEntry,
  getOpenTimeEntryAnyEstablishment,
  getTimeEntryById,
  listCurrentlyClockedIn,
  listTimeEntries,
} from './timeEntryReadModel';
import {
  adminUpdateTimeEntry,
  clockInTimeEntry,
  clockOutTimeEntry,
  deleteTimeEntry,
} from './timeEntryWriteModel';
import { totalsByUser } from './timeEntryReports';

export type {
  TimeClockSource,
  TimeEntry,
  TimeEntryWithUser,
  UserHoursTotal,
} from './timeEntryTypes';

export {
  TimeClockNetworkSettingsModel,
  isIpAllowed,
  isValidIpOrCidr,
  normalizeAllowedIps,
  type TimeClockNetworkSettings,
} from './timeClockNetworkSettings';

export class TimeEntryModel {
  static getOpenEntry = getOpenTimeEntry;
  static getOpenEntryAnyEstablishment = getOpenTimeEntryAnyEstablishment;
  static clockIn = clockInTimeEntry;
  static clockOut = clockOutTimeEntry;
  static getById = getTimeEntryById;
  static list = listTimeEntries;
  static totalsByUser = totalsByUser;
  static adminUpdate = adminUpdateTimeEntry;
  static delete = deleteTimeEntry;
  static listCurrentlyClockedIn = listCurrentlyClockedIn;
}
