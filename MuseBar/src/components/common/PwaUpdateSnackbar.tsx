/**
 * Snackbar when a new service-worker build is waiting: reload to activate.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Button, Snackbar } from '@mui/material';
import { registerPwaUpdate } from '../../pwa/registerPwaUpdate';

export const PwaUpdateSnackbar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const applyRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return registerPwaUpdate({
      onNeedRefresh: (applyUpdate) => {
        applyRef.current = applyUpdate;
        setOpen(true);
      },
    });
  }, []);

  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      message="Une mise à jour est prête"
      action={
        <Button
          color="inherit"
          size="small"
          onClick={() => {
            setOpen(false);
            applyRef.current?.();
          }}
        >
          Recharger
        </Button>
      }
    />
  );
};
