/**
 * Paramètres → Imprimante: receipt bridge + kitchen/bar printers in one place.
 * Does not grow PrinterSetup.tsx (module-size baseline).
 */

import React from 'react';
import { Box, Divider, Typography } from '@mui/material';
import { PrinterSetup } from './PrinterSetup';
import KitchenPrintersPanel from './KitchenPrintersPanel';

interface PrinterSettingsPanelProps {
  embedded?: boolean;
}

export const PrinterSettingsPanel: React.FC<PrinterSettingsPanelProps> = ({
  embedded = true,
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h6" gutterBottom>
          Tickets de caisse
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Bridge local ou Epson Server Direct pour les reçus clients.
        </Typography>
        <PrinterSetup embedded={embedded} />
      </Box>

      <Divider />

      <Box>
        <Typography variant="h6" gutterBottom>
          Imprimantes cuisine / bar
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Configurez les imprimantes de commande ici, puis assignez-les aux produits dans
          Menu.
        </Typography>
        <KitchenPrintersPanel />
      </Box>
    </Box>
  );
};

export default PrinterSettingsPanel;
