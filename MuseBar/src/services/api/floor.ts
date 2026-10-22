// Floor API barrel: resource modules live in ./floor*Api.ts; callers keep importing `floorApi.*`.
export {
  verifyPin,
  setPin,
  clearPin,
  getPinStatus,
  listActivePinSessions,
  closePinSession,
  type PinVerifyResult,
  type ActivePinSessionDto,
} from './pin';

export * from './floorPlansApi';
export * from './floorTablesApi';
export * from './floorStatusApi';
export * from './floorTicketTypes';
export * from './floorTicketsApi';
export * from './floorTicketTransfersApi';
export * from './floorStaffApi';
export * from './floorKitchenApi';
export { mapTicketItemsToOrderItems } from './floorTicketMappers';
