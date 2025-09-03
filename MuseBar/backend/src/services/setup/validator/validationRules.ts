import { BusinessSetupRequest, SetupValidationError } from '../types';

export function validatePassword(password: string): SetupValidationError[] {
  const errors: SetupValidationError[] = [];
  if (!password) return errors;
  if (password.length < 8) errors.push({ field: 'password', message: 'Password must be at least 8 characters long' });
  if (!/(?=.*[a-z])/.test(password)) errors.push({ field: 'password', message: 'Password must contain at least one lowercase letter' });
  if (!(/(?=.*[A-Z])/.test(password))) errors.push({ field: 'password', message: 'Password must contain at least one uppercase letter' });
  if (!(/(?=.*\d)/.test(password))) errors.push({ field: 'password', message: 'Password must contain at least one number' });
  if (!(/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password))) errors.push({ field: 'password', message: 'Password must contain at least one special character' });
  return errors;
}

export function validateEmails(userEmail: string, contactEmail: string): SetupValidationError[] {
  const errors: SetupValidationError[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (userEmail && !emailRegex.test(userEmail)) errors.push({ field: 'email', message: 'Invalid email format' });
  if (contactEmail && !emailRegex.test(contactEmail)) errors.push({ field: 'contact_email', message: 'Invalid contact email format' });
  return errors;
}

export function validatePhone(phone: string): SetupValidationError[] {
  const errors: SetupValidationError[] = [];
  if (!phone) return errors;
  const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
  if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
    errors.push({ field: 'phone', message: 'Invalid French phone number format' });
  }
  return errors;
}

export function validateBusinessData(setupData: BusinessSetupRequest): SetupValidationError[] {
  const errors: SetupValidationError[] = [];
  if (setupData.business_name && setupData.business_name.length > 255) errors.push({ field: 'business_name', message: 'Business name must be less than 255 characters' });
  if (setupData.siret_number) errors.push(...validateSIRET(setupData.siret_number));
  if (setupData.tva_number) errors.push(...validateTVA(setupData.tva_number));
  if (setupData.address && setupData.address.length > 500) errors.push({ field: 'address', message: 'Address must be less than 500 characters' });
  return errors;
}

export function validateSIRET(siret: string): SetupValidationError[] {
  const errors: SetupValidationError[] = [];
  if (!siret) return errors;
  const cleanSiret = siret.replace(/\s/g, '');
  if (cleanSiret.length !== 14) return [{ field: 'siret_number', message: 'SIRET number must be exactly 14 digits' }];
  if (!/^\d{14}$/.test(cleanSiret)) return [{ field: 'siret_number', message: 'SIRET number must contain only digits' }];
  if (!validateLuhnAlgorithm(cleanSiret)) errors.push({ field: 'siret_number', message: 'Invalid SIRET number format' });
  return errors;
}

export function validateTVA(tva: string): SetupValidationError[] {
  const errors: SetupValidationError[] = [];
  if (!tva) return errors;
  const tvaRegex = /^FR[0-9A-Z]{2}[0-9]{9}$/;
  if (!tvaRegex.test(tva.toUpperCase().replace(/\s/g, ''))) errors.push({ field: 'tva_number', message: 'Invalid French TVA number format (should be FR + 2 characters + 9 digits)' });
  return errors;
}

export function validateInvitationToken(token: string): SetupValidationError[] {
  const errors: SetupValidationError[] = [];
  if (!token) return [{ field: 'invitation_token', message: 'Invitation token is required' }];
  const tokenRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  if (!tokenRegex.test(token)) errors.push({ field: 'invitation_token', message: 'Invalid invitation token format' });
  return errors;
}

export function validateLuhnAlgorithm(number: string): boolean {
  let sum = 0;
  let isEven = false;
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = parseInt(number[i], 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

export function validateSetupData(setupData: BusinessSetupRequest): SetupValidationError[] {
  const errors: SetupValidationError[] = [];
  const requiredFields = [
    { field: 'first_name', value: setupData.first_name, name: 'First name' },
    { field: 'last_name', value: setupData.last_name, name: 'Last name' },
    { field: 'email', value: setupData.email, name: 'Email' },
    { field: 'password', value: setupData.password, name: 'Password' },
    { field: 'business_name', value: setupData.business_name, name: 'Business name' },
    { field: 'contact_email', value: setupData.contact_email, name: 'Contact email' },
    { field: 'phone', value: setupData.phone, name: 'Phone' },
    { field: 'address', value: setupData.address, name: 'Address' },
    { field: 'invitation_token', value: setupData.invitation_token, name: 'Invitation token' }
  ];
  for (const field of requiredFields) {
    if (!field.value || field.value.trim() === '') errors.push({ field: field.field, message: `${field.name} is required` });
  }
  if (setupData.password !== setupData.confirm_password) errors.push({ field: 'confirm_password', message: 'Passwords do not match' });
  errors.push(...validatePassword(setupData.password));
  errors.push(...validateEmails(setupData.email, setupData.contact_email));
  errors.push(...validatePhone(setupData.phone));
  errors.push(...validateBusinessData(setupData));
  return errors;
}


