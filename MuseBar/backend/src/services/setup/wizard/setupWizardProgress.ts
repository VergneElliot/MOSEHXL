import { PoolClient } from 'pg';
import { BusinessSetupRequest, SetupProgress } from '../types';
import { SetupDatabase } from '../setupDatabase';
import { SetupProgressTracker } from './SetupProgressTracker';

export const BUSINESS_SETUP_STEPS = [
  'validate_data',
  'validate_invitation',
  'create_user',
  'update_establishment',
  'initialize_schema',
  'create_defaults',
  'complete_invitation',
  'create_audit'
] as const;

export async function updateProgressForStep(
  stepId: string,
  progress: SetupProgress,
  client: PoolClient,
  setupData: BusinessSetupRequest
): Promise<void> {
  switch (stepId) {
    case 'validate_data':
    case 'validate_invitation':
      progress.invitation_validated = true;
      break;
    case 'create_user':
      progress.user_created = true;
      break;
    case 'update_establishment':
      progress.establishment_updated = true;
      break;
    case 'initialize_schema':
      progress.schema_initialized = true;
      break;
    case 'create_defaults':
      progress.default_data_created = true;
      break;
    case 'create_audit':
      progress.audit_logged = true;
      break;
  }

  const invitation = await SetupDatabase.validateInvitation(
    client as unknown as { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> },
    setupData.invitation_token
  );
  if (invitation.isValid && invitation.establishment?.id) {
    await SetupProgressTracker.logSetupProgress(
      client,
      invitation.establishment.id,
      progress
    );
  }
}
