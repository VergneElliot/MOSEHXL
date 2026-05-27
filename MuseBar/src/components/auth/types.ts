export interface InvitationPrefill {
  firstName?: string;
  lastName?: string;
}

export interface InvitationData {
  email: string;
  establishmentName: string;
  role: string;
  inviterName: string;
  expiresAt: string;
  prefill: InvitationPrefill;
}
