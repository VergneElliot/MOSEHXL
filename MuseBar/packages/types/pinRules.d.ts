/** Permissions that require an elevated (4–8 digit) PIN. */
export declare const ELEVATED_PIN_PERMISSIONS: readonly string[];
export declare const PIN_BASIC_LENGTH = 2;
export declare const PIN_ELEVATED_MIN_LENGTH = 4;
export declare const PIN_ELEVATED_MAX_LENGTH = 8;
export declare const PIN_VERIFY_MIN_LENGTH = 2;
export declare const PIN_VERIFY_MAX_LENGTH = 8;
export type PinKind = 'basic' | 'elevated';
export interface PinLengthRules {
    kind: PinKind;
    min_length: number;
    max_length: number;
}
export declare function userRequiresElevatedPin(input: {
    role: string;
    permissions: string[];
}): boolean;
export declare function resolvePinLengthRules(input: {
    role: string;
    permissions: string[];
}): PinLengthRules;
export declare function isValidPinFormatForVerify(pin: string): boolean;
export declare function isValidPinFormatForRules(pin: string, rules: PinLengthRules): boolean;
export declare function pinRulesErrorMessage(rules: PinLengthRules): string;
export declare function pinLengthHelperText(rules: PinLengthRules): string;
export declare function isPinLengthValid(pin: string, rules: PinLengthRules): boolean;
