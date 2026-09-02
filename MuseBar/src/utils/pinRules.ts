/** Re-exports shared PIN rules from @mosehxl/types plus French UI helpers. */
export {
  PIN_BASIC_LENGTH,
  PIN_ELEVATED_MIN_LENGTH,
  PIN_ELEVATED_MAX_LENGTH,
  PIN_VERIFY_MIN_LENGTH,
  PIN_VERIFY_MAX_LENGTH,
  type PinKind,
  type PinLengthRules,
  resolvePinLengthRules,
  pinLengthHelperText,
  isPinLengthValid,
} from '@mosehxl/types';
