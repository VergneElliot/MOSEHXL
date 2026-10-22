import {
  getOpenTicket,
  getOpenTicketForTable,
  listActiveOpenTicketItems,
  listOpenTicketItems,
} from './openTicketReadModel';
import {
  abandonOpenTicket,
  assignOpenTicketWaiter,
  closeOpenTicketWithOrder,
  createOpenTicket,
  touchOpenTicketActivity,
} from './openTicketWriteModel';
import {
  cancelOpenTicketValidatedLines,
  discardOpenTicketDraftItems,
  syncOpenTicketDraftItems,
  validateOpenTicketDraftItems,
} from './openTicketLineModel';
import { mergeOpenTicketInto, moveOpenTicketLines } from './openTicketTransferModel';

export type {
  OpenTicket,
  OpenTicketItem,
  OpenTicketItemInput,
  OpenTicketLineStatus,
  OpenTicketStatus,
} from './openTicketTypes';

export const OpenTicketModel = {
  get: getOpenTicket,
  getOpenForTable: getOpenTicketForTable,
  listItems: listOpenTicketItems,
  listActiveItems: listActiveOpenTicketItems,

  create: createOpenTicket,
  touchActivity: touchOpenTicketActivity,
  abandon: abandonOpenTicket,
  closeWithOrder: closeOpenTicketWithOrder,
  assignWaiter: assignOpenTicketWaiter,

  syncDraftItems: syncOpenTicketDraftItems,
  replaceItems: syncOpenTicketDraftItems,
  validateDraftItems: validateOpenTicketDraftItems,
  discardDraftItems: discardOpenTicketDraftItems,
  cancelValidatedLines: cancelOpenTicketValidatedLines,

  moveLines: moveOpenTicketLines,
  mergeInto: mergeOpenTicketInto,
};
