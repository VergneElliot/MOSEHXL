/**
 * Establishment Management Component
 * System administrator interface for managing establishments and sending invitations
 * 
 * REFACTORED: This component has been modularized into smaller, focused components.
 * The original 557-line monolithic component has been broken down into:
 * - EstablishmentStats (statistics cards)
 * - EstablishmentTable (data table with actions)
 * - CreateEstablishmentDialog (creation form)
 * - InviteEstablishmentDialog (invitation form)
 * - useEstablishmentManagement (custom hook for state/logic)
 * - EstablishmentManagementContainer (main orchestrator)
 */

import React from 'react';
import { EstablishmentManagementContainer } from './EstablishmentManagement/EstablishmentManagementContainer';

interface EstablishmentManagementProps {
  token: string;
}

const EstablishmentManagement: React.FC<EstablishmentManagementProps> = ({ token }) => {
  return <EstablishmentManagementContainer token={token} />;
};

export default EstablishmentManagement;