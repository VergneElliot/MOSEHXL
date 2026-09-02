import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  TableRestaurant as TableIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import * as floorApi from '../../services/api/floor';

interface AssignOrderDialogProps {
  open: boolean;
  onClose: () => void;
  hasActiveTable: boolean;
  assignedWaiterDisplayName?: string | null;
  canReassignWaiter: boolean;
  pinActorToken: string | null;
  onAssignTable: () => void;
  onBeforeWaiterStep?: () => Promise<void>;
  onAssignWaiter: (userId: number, displayName: string) => void;
}

const AssignOrderDialog: React.FC<AssignOrderDialogProps> = ({
  open,
  onClose,
  hasActiveTable,
  assignedWaiterDisplayName,
  canReassignWaiter,
  pinActorToken,
  onAssignTable,
  onBeforeWaiterStep,
  onAssignWaiter,
}) => {
  const [step, setStep] = useState<'menu' | 'waiter'>('menu');
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staff, setStaff] = useState<floorApi.ServiceStaffMember[]>([]);
  const [staffError, setStaffError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStep('menu');
      setStaffError(null);
      return;
    }
    if (step !== 'waiter' || !pinActorToken) return;
    let cancelled = false;
    setLoadingStaff(true);
    setStaffError(null);
    void floorApi
      .listServiceStaff(pinActorToken)
      .then((rows) => {
        if (!cancelled) setStaff(rows);
      })
      .catch((err: unknown) => {
        const e = err as { message?: string };
        if (!cancelled) setStaffError(e.message || 'Impossible de charger l’équipe');
      })
      .finally(() => {
        if (!cancelled) setLoadingStaff(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, step, pinActorToken]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Assigner à</DialogTitle>
      <DialogContent>
        {step === 'menu' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              {hasActiveTable
                ? 'Déplacer cette addition vers une autre table.'
                : 'Assignez le panier à une table — les articles seront validés (envoi cuisine).'}
            </Typography>
            {hasActiveTable && assignedWaiterDisplayName ? (
              <Typography variant="caption" color="text.secondary">
                Serveur actuel : {assignedWaiterDisplayName}
              </Typography>
            ) : null}
            <Button
              variant="outlined"
              fullWidth
              startIcon={<TableIcon />}
              onClick={() => {
                onClose();
                onAssignTable();
              }}
              sx={{ justifyContent: 'flex-start', py: 1.25 }}
            >
              {hasActiveTable ? 'Changer de table' : 'Une table'}
            </Button>
            <Button
              variant="outlined"
              fullWidth
              disabled={!hasActiveTable || !canReassignWaiter}
              startIcon={<PersonIcon />}
              onClick={() => {
                void (async () => {
                  try {
                    await onBeforeWaiterStep?.();
                    setStep('waiter');
                  } catch {
                    /* cancelled or denied */
                  }
                })();
              }}
              sx={{ justifyContent: 'flex-start', py: 1.25 }}
            >
              Un serveur
            </Button>
            {!hasActiveTable && (
              <Typography variant="caption" color="text.secondary">
                L’assignation serveur nécessite une table active (pour la comptabilité Z).
              </Typography>
            )}
            {hasActiveTable && !canReassignWaiter && (
              <Typography variant="caption" color="text.secondary">
                Permission « Réassigner un serveur à une table » requise (profil manager).
              </Typography>
            )}
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Choisissez le serveur qui encaissera cette table.
            </Typography>
            {loadingStaff && (
              <Box display="flex" justifyContent="center" py={3}>
                <CircularProgress size={28} />
              </Box>
            )}
            {staffError && (
              <Typography color="error" variant="body2" sx={{ mb: 1 }}>
                {staffError}
              </Typography>
            )}
            {!loadingStaff && !staffError && (
              <List dense disablePadding>
                {staff.map((member, index) => (
                  <React.Fragment key={member.user_id}>
                    {index > 0 && <Divider component="li" />}
                    <ListItemButton
                      onClick={() => {
                        onAssignWaiter(member.user_id, member.display_name);
                        onClose();
                      }}
                    >
                      <ListItemText
                        primary={member.display_name}
                        secondary={member.role}
                      />
                    </ListItemButton>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {step === 'waiter' ? (
          <Button onClick={() => setStep('menu')}>Retour</Button>
        ) : null}
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AssignOrderDialog;
