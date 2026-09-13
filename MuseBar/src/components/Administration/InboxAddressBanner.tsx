import React from 'react';
import { Alert } from '@mui/material';

/** True when contact email uses musebar.fr (no public MX → SendGrid Blocked). */
export function isDeadMusebarFrContact(email: string | null | undefined): boolean {
  return Boolean(email && /@musebar\.fr$/i.test(email));
}

type Props = {
  inboxAddress: string | null;
  contactEmail: string | null;
};

/** Shows slug@mosehxl.com inbox + venue contact used for copies / autoforward. */
const InboxAddressBanner: React.FC<Props> = ({ inboxAddress, contactEmail }) => (
  <>
    <Alert severity="info" sx={{ mb: 2 }}>
      Adresse établissement (Boîte mail) :{' '}
      <strong>{inboxAddress || 'slug non provisionné'}</strong>
      {contactEmail ? (
        <>
          {' '}
          · Copies venue / transfert : <strong>{contactEmail}</strong>
        </>
      ) : null}
    </Alert>
    {isDeadMusebarFrContact(contactEmail) && (
      <Alert severity="warning" sx={{ mb: 2 }}>
        L’email de contact <strong>{contactEmail}</strong> n’a pas de serveur mail joignable (MX
        manquant) — SendGrid bloque les copies « Nouvelle demande… ». Changez-le dans Paramètres →
        Infos établissement, ou désactivez le transfert ci-dessous.
      </Alert>
    )}
  </>
);

export default InboxAddressBanner;
