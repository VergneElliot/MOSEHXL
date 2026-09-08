"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PIN_VERIFY_MAX_LENGTH = exports.PIN_VERIFY_MIN_LENGTH = exports.PIN_ELEVATED_MAX_LENGTH = exports.PIN_ELEVATED_MIN_LENGTH = exports.PIN_BASIC_LENGTH = exports.ELEVATED_PIN_PERMISSIONS = void 0;
exports.userRequiresElevatedPin = userRequiresElevatedPin;
exports.resolvePinLengthRules = resolvePinLengthRules;
exports.isValidPinFormatForVerify = isValidPinFormatForVerify;
exports.isValidPinFormatForRules = isValidPinFormatForRules;
exports.pinRulesErrorMessage = pinRulesErrorMessage;
exports.pinLengthHelperText = pinLengthHelperText;
exports.isPinLengthValid = isPinLengthValid;
const permissions_1 = require("./permissions");
/**
 * Permissions that require an elevated (4–8 digit) PIN. Derived from the tier table so a
 * new specific permission can never silently stay reachable with a 2-digit PIN.
 */
exports.ELEVATED_PIN_PERMISSIONS = permissions_1.SPECIFIC_PERMISSIONS;
exports.PIN_BASIC_LENGTH = 2;
exports.PIN_ELEVATED_MIN_LENGTH = 4;
exports.PIN_ELEVATED_MAX_LENGTH = 8;
exports.PIN_VERIFY_MIN_LENGTH = 2;
exports.PIN_VERIFY_MAX_LENGTH = 8;
function userRequiresElevatedPin(input) {
    if (input.role === 'establishment_admin' || input.role === 'system_admin') {
        return true;
    }
    return input.permissions.some((p) => exports.ELEVATED_PIN_PERMISSIONS.includes(p));
}
function resolvePinLengthRules(input) {
    if (userRequiresElevatedPin(input)) {
        return {
            kind: 'elevated',
            min_length: exports.PIN_ELEVATED_MIN_LENGTH,
            max_length: exports.PIN_ELEVATED_MAX_LENGTH,
        };
    }
    return {
        kind: 'basic',
        min_length: exports.PIN_BASIC_LENGTH,
        max_length: exports.PIN_BASIC_LENGTH,
    };
}
function isValidPinFormatForVerify(pin) {
    return new RegExp(`^\\d{${exports.PIN_VERIFY_MIN_LENGTH},${exports.PIN_VERIFY_MAX_LENGTH}}$`).test(pin);
}
function isValidPinFormatForRules(pin, rules) {
    if (!/^\d+$/.test(pin))
        return false;
    return pin.length >= rules.min_length && pin.length <= rules.max_length;
}
function pinRulesErrorMessage(rules) {
    if (rules.kind === 'basic') {
        return 'Basic staff PIN must be exactly 2 digits';
    }
    return `Elevated PIN must be ${rules.min_length}–${rules.max_length} digits`;
}
function pinLengthHelperText(rules) {
    if (rules.kind === 'basic') {
        return 'Personnel de base : PIN à exactement 2 chiffres (identification / Z). Unique dans l’établissement.';
    }
    return `Permissions élevées : PIN de ${rules.min_length} à ${rules.max_length} chiffres. Unique dans l’établissement.`;
}
function isPinLengthValid(pin, rules) {
    return isValidPinFormatForRules(pin, rules);
}
