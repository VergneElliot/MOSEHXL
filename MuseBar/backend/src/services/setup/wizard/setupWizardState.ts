import { PoolClient } from 'pg';
import { Logger } from '../../../utils/logger';
import {
  BusinessSetupRequest,
  InvitationValidation,
  SetupStatusResponse,
  SetupWizardState,
  SetupStep,
  SetupProgress,
} from '../types';
import { SetupDatabase } from '../setupDatabase';
import { SetupProgressTracker } from './SetupProgressTracker';
import { getSetupSteps } from './steps';

const logger = Logger.getInstance();

export function getWizardSetupSteps(): SetupStep[] {
  return getSetupSteps();
}

export async function getSetupWizardState(
  pool: { connect: () => Promise<PoolClient> },
  invitationToken: string
): Promise<SetupWizardState> {
  try {
    const steps = getWizardSetupSteps();
    const validation = await SetupDatabase.validateInvitation(pool, invitationToken);

    if (!validation.isValid) {
      return {
        currentStep: 0,
        totalSteps: steps.length,
        steps,
        data: {},
        errors: [{ field: 'invitation_token', message: validation.error || 'Invalid invitation' }]
      };
    }

    let currentStep = 1;
    if (validation.establishment?.id) {
      const status = await SetupDatabase.checkSetupStatus(pool, invitationToken);
      const isCompleted = status.success && status.data?.establishment?.status === 'active';
      if (isCompleted) {
        currentStep = steps.length;
        steps.forEach(step => step.completed = true);
      }
    }

    return {
      currentStep,
      totalSteps: steps.length,
      steps,
      data: {
        invitation_token: invitationToken,
        business_name: validation.establishment?.name || '',
        contact_email: validation.establishment?.email || ''
      },
      errors: []
    };

  } catch (error) {
    logger.error(
      'Error getting setup wizard state',
      error as Error,
      'SETUP_WIZARD'
    );

    return {
      currentStep: 0,
      totalSteps: getWizardSetupSteps().length,
      steps: getWizardSetupSteps(),
      data: {},
      errors: [{ field: 'general', message: 'Error loading setup state' }]
    };
  }
}

export function validateSetupStep(stepId: string, data: Partial<BusinessSetupRequest>) {
  void stepId;
  const errors: string[] = [];

  if (!data.email || !data.password || !data.business_name) {
    errors.push('Missing required fields');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export async function validateInvitation(
  pool: { connect: () => Promise<PoolClient> },
  token: string
): Promise<InvitationValidation> {
  return SetupDatabase.validateInvitation(pool, token);
}

export async function checkSetupStatus(
  pool: { connect: () => Promise<PoolClient> },
  token: string
): Promise<SetupStatusResponse> {
  const result = await SetupDatabase.checkSetupStatus(pool, token);

  if (result.success && result.data) {
    return {
      completed: result.data.establishment?.status === 'active',
      redirectUrl: undefined
    };
  }
  return {
    completed: false,
    error: result.error || 'Setup status check failed'
  };
}

export async function getSetupProgress(
  pool: { connect: () => Promise<PoolClient> },
  establishmentId: string
): Promise<SetupProgress | null> {
  return SetupProgressTracker.getSetupProgress(pool, establishmentId);
}
