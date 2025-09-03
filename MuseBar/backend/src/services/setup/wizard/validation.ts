import { BusinessSetupRequest, SetupValidationError } from '../types';

export function validateSetupStep(stepId: string, data: Partial<BusinessSetupRequest>): { isValid: boolean; errors: any[] } {
  const errors: any[] = [];

  switch (stepId) {
    case 'invitation':
      if (!data.invitation_token) {
        errors.push({ field: 'invitation_token', message: 'Invitation token is required' });
      }
      break;
    case 'user_info':
      if (!data.first_name) errors.push({ field: 'first_name', message: 'First name is required' });
      if (!data.last_name) errors.push({ field: 'last_name', message: 'Last name is required' });
      if (!data.email) errors.push({ field: 'email', message: 'Email is required' });
      if (!data.password) errors.push({ field: 'password', message: 'Password is required' });
      if (data.password !== data.confirm_password) {
        errors.push({ field: 'confirm_password', message: 'Passwords do not match' });
      }
      break;
    case 'business_info':
      if (!data.business_name) errors.push({ field: 'business_name', message: 'Business name is required' });
      if (!data.contact_email) errors.push({ field: 'contact_email', message: 'Contact email is required' });
      if (!data.phone) errors.push({ field: 'phone', message: 'Phone is required' });
      if (!data.address) errors.push({ field: 'address', message: 'Address is required' });
      break;
    default:
      break;
  }

  return { isValid: errors.length === 0, errors };
}


