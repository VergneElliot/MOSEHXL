import React, { Suspense, useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { useFloorPlanManagement } from '../../hooks/useFloorPlanManagement';
import { resolvePinLengthRules } from '../../utils/pinRules';
import FloorCanvasView, { type FloorCanvasTable } from './FloorCanvasView';
import { SIZE_PRESETS, normalizeTableGeometry } from './floorGeometry';
import TableResumeDialog from './TableResumeDialog';
import { TableDropActionDialog } from './TableDropActionDialog';
import { tableHasActiveOrder } from './tableOccupancy';

const LazyPinPadDialog = React.lazy(() => import('../POS/PinPadDialog'));

interface FloorPlanConsultPanelProps {
  onSwitchToPos?: () => void;
}

const FloorPlanConsultPanel: React.FC<FloorPlanConsultPanelProps> = ({ onSwitchToPos }) => {
  const { user, permissions } = useAuth();
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const onInfo = useCallback((message: string) => {
    setSnackbar({ open: true, message, severity: 'success' });
  }, []);

  const onError = useCallback((message: string) => {
    setSnackbar({ open: true, message, severity: 'error' });
  }, []);

  const floor = useFloorPlanManagement({ onInfo, onError, onSwitchToPos });

  const canvasTables: FloorCanvasTable[] = useMemo(
    () =>
      floor.planTables.map((t) => {
        const occupied = tableHasActiveOrder(t);
        const isActive = floor.focusTableId === t.id;
        const disabled =
          floor.mode === 'transfer'
            ? occupied
            : floor.mode === 'merge'
              ? !occupied || t.open_ticket_id === floor.activeTicketId
              : false;
        return {
          id: t.id,
          label: t.label,
          ...normalizeTableGeometry(t),
          shape: t.shape || 'rectangle',
          capacity: t.capacity != null ? Number(t.capacity) : null,
          occupied,
          isActive,
          disabled,
          width: t.width || SIZE_PRESETS.M.width,
          height: t.height || SIZE_PRESETS.M.height,
        };
      }),
    [floor.planTables, floor.focusTableId, floor.activeTicketId, floor.mode]
  );

  const bannerTable = floor.focusTable ?? floor.activeTable;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%', minHeight: 0 }}>
      <Box>
        <Typography variant="h5">Plan de salle</Typography>
        <Typography variant="body2" color="text.secondary">
          Gestion des tables : ouvrir, transférer, fusionner ou abandonner une addition. Une session
          PIN est requise. Glissez une table sur une autre pour transférer ou fusionner.
        </Typography>
      </Box>

      {!floor.pinActor ? (
        <Alert
          severity="info"
          action={
            <Button color="inherit" size="small" onClick={floor.requirePin}>
              Badge
            </Button>
          }
        >
          Ouvrez une session PIN pour agir sur les tables.
        </Alert>
      ) : (
        <Alert severity="success" sx={{ py: 0.5 }}>
          Session : <strong>{floor.pinActor.displayName}</strong>
          {bannerTable ? (
            <>
              {' '}
              — table active : <strong>{bannerTable.label}</strong>
              {floor.activeTable?.id === floor.focusTableId &&
                floor.activeTable.assignedWaiterDisplayName && (
                  <> (serveur : {floor.activeTable.assignedWaiterDisplayName})</>
                )}
              {floor.focusTable && !tableHasActiveOrder(floor.focusTable) && <> (libre)</>}
            </>
          ) : (
            <> — aucune table active (touchez une table pour la sélectionner)</>
          )}
        </Alert>
      )}

      {floor.showTransferMergeModes && (
        <Box>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={floor.mode}
            onChange={(_e, next) => {
              if (next) floor.setMode(next);
            }}
          >
            <ToggleButton value="select">Ouvrir / charger</ToggleButton>
            <ToggleButton value="transfer">Transférer</ToggleButton>
            <ToggleButton value="merge">Fusionner</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
            {floor.mode === 'transfer' && 'Choisissez une table libre (destination).'}
            {floor.mode === 'merge' && 'Choisissez une autre table occupée (cible).'}
            {floor.mode === 'select' &&
              'Touchez une table pour le résumé, ou glissez-la sur une autre pour déplacer l’addition.'}
          </Typography>
        </Box>
      )}

      {floor.loading && floor.tables.length === 0 ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : floor.tables.length === 0 ? (
        <Alert severity="info">Aucune table configurée — créez un plan dans Administration.</Alert>
      ) : (
        <>
          {floor.activePlans.length > 1 && (
            <Tabs
              value={floor.selectedPlanId ?? false}
              onChange={(_e, value: number) => floor.setSelectedPlanId(value)}
              variant="scrollable"
              allowScrollButtonsMobile
            >
              {floor.activePlans.map((plan) => (
                <Tab key={plan.id} value={plan.id} label={plan.name} sx={{ textTransform: 'none' }} />
              ))}
            </Tabs>
          )}
          {floor.activePlans.length === 1 && (
            <Typography variant="subtitle1" fontWeight={600}>
              {floor.activePlans[0]?.name}
            </Typography>
          )}
          <Box sx={{ flex: 1, minHeight: 420 }}>
            <FloorCanvasView
              tables={canvasTables}
              mode="select"
              snapEnabled={false}
              onSelect={(id) => {
                if (id == null) return;
                const table = floor.planTables.find((t) => t.id === id);
                if (table) floor.handleTableSelect(table);
              }}
              onTableDrop={floor.handleTableDrop}
            />
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" color="success" variant="outlined" label="Libre" />
            <Chip size="small" color="warning" variant="outlined" label="Occupée" />
            <Chip size="small" color="primary" variant="outlined" label="Sélectionnée" />
          </Stack>
        </>
      )}

      {floor.activeTicketId != null && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ pt: 1 }}>
          <Button color="inherit" variant="outlined" onClick={() => void floor.detachFromTable()}>
            Laisser ouverte
          </Button>
          <Button
            color="error"
            variant="outlined"
            onClick={() => void floor.abandonActiveTicket()}
          >
            Abandonner
          </Button>
        </Stack>
      )}

      {floor.pinDialogOpen && (
        <Suspense fallback={null}>
          <LazyPinPadDialog
            open={floor.pinDialogOpen}
            mode={floor.pinDialogMode}
            setRules={resolvePinLengthRules({
              role: user?.role ?? 'staff',
              permissions: permissions ?? user?.permissions ?? [],
            })}
            onClose={() => floor.setPinDialogOpen(false)}
            onVerify={floor.badgeIn}
            onSetPin={async (pin) => {
              await import('../../services/api/floor').then((m) => m.setPin(pin));
              onInfo('PIN enregistré');
              floor.setPinDialogMode('verify');
            }}
            onSwitchToSet={() => floor.setPinDialogMode('set')}
            onSwitchToVerify={() => floor.setPinDialogMode('verify')}
          />
        </Suspense>
      )}

      <TableResumeDialog
        open={floor.resumeTable != null}
        table={floor.resumeTable}
        onClose={floor.clearResumeTable}
        onOpenInPos={(table) => void floor.openTableInSession(table)}
      />

      <TableDropActionDialog
        open={floor.dropPrompt != null}
        prompt={floor.dropPrompt?.prompt ?? null}
        onClose={floor.clearDropPrompt}
        onTransfer={() => void floor.confirmDropTransfer()}
        onMerge={() => void floor.confirmDropMerge()}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FloorPlanConsultPanel;
