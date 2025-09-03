import { SetupWizardState, SetupStep } from '../types';
import { getSetupSteps } from './steps';

export function buildInitialState(invitationToken: string, businessName?: string, contactEmail?: string): SetupWizardState {
  const steps = getSetupSteps();
  return {
    currentStep: 1,
    totalSteps: steps.length,
    steps,
    data: {
      invitation_token: invitationToken,
      business_name: businessName || '',
      contact_email: contactEmail || ''
    },
    errors: []
  };
}

export function markAllCompleted(steps: SetupStep[]): void {
  steps.forEach(step => (step.completed = true));
}


