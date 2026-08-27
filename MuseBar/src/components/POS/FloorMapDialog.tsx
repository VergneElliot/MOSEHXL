import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Chip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tabs,
  Tab,
} from '@mui/material';
import { TableRestaurant as TableIcon } from '@mui/icons-material';
import * as floorApi from '../../services/api/floor';
import FloorCanvasView, { type FloorCanvasTable } from '../floor/FloorCanvasView';
import { SIZE_PRESETS, gridPlacement } from '../floor/floorGeometry';

type MapMode = 'select' | 'transfer' | 'merge';

interface FloorMapDialogProps {
  open: boolean;
  onClose: () => void;
  activeTicketId: number | null;
  onSelectFree: (table: floorApi.DiningTableStatusDto) => void;
  onSelectOccupied: (table: floorApi.DiningTableStatusDto) => void;
  onTransferTo: (table: floorApi.DiningTableStatusDto) => void;
  onMergeInto: (table: floorApi.DiningTableStatusDto) => void;
  onAbandon: (ticketId: number) => void;
  onDetach: () => void;
  onTakeover: () => void;
  canManageFloor: boolean;
}

export const FloorMapDialog: React.FC<FloorMapDialogProps> = ({
  open,
  onClose,
  activeTicketId,
  onSelectFree,
  onSelectOccupied,
  onTransferTo,
  onMergeInto,
  onAbandon,
  onDetach,
  onTakeover,
  canManageFloor,
}) => {
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState<floorApi.DiningTableStatusDto[]>([]);
  const [plans, setPlans] = useState<floorApi.FloorPlanDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [mode, setMode] = useState<MapMode>('select');
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [status, planList] = await Promise.all([
        floorApi.getFloorStatus(),
        floorApi.listFloorPlans(),
      ]);
      setTables(status);
      setPlans(planList);
      setSelectedPlanId((prev) => {
        const active = planList.filter((p) => p.is_active);
        if (prev != null && active.some((p) => p.id === prev)) return prev;
        return active[0]?.id ?? planList[0]?.id ?? null;
      });
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Impossible de charger le plan de salle');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setMode('select');
      void reload();
    }
  }, [open, reload]);

  const byPlan = useMemo(() => {
    const map = new Map<number, floorApi.DiningTableStatusDto[]>();
    for (const t of tables) {
      const list = map.get(t.floor_plan_id) ?? [];
      list.push(t);
      map.set(t.floor_plan_id, list);
    }
    return map;
  }, [tables]);

  const activePlans = useMemo(() => plans.filter((p) => p.is_active), [plans]);
  const planTables = selectedPlanId != null ? byPlan.get(selectedPlanId) ?? [] : [];

  const canvasTables: FloorCanvasTable[] = useMemo(
    () =>
      planTables.map((t) => {
        const occupied = t.open_ticket_id != null;
        const isActive = activeTicketId != null && t.open_ticket_id === activeTicketId;
        const disabled =
          (mode === 'transfer' && occupied) ||
          (mode === 'merge' && (!occupied || isActive));
        return {
          id: t.id,
          label: t.label,
          pos_x: t.pos_x ?? 40,
          pos_y: t.pos_y ?? 40,
          width: t.width || SIZE_PRESETS.M.width,
          height: t.height || SIZE_PRESETS.M.height,
          shape: t.shape || 'rectangle',
          capacity: t.capacity,
          occupied,
          isActive,
          disabled,
        };
      }),
    [planTables, activeTicketId, mode]
  );

  const createQuickPlan = useCallback(async () => {
    setCreating(true);
    setError(null);
    try {
      const plan = await floorApi.createFloorPlan('Salle');
      const size = SIZE_PRESETS.M;
      for (let i = 1; i <= 12; i += 1) {
        const place = gridPlacement(i - 1);
        await floorApi.createDiningTable({
          floor_plan_id: plan.id,
          label: String(i),
          pos_x: place.pos_x,
          pos_y: place.pos_y,
          width: size.width,
          height: size.height,
          shape: 'rectangle',
          sort_order: i,
        });
      }
      await reload();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Création du plan impossible (permission manage_floor_plan ?)');
    } finally {
      setCreating(false);
    }
  }, [reload]);

  const handleTableSelect = (id: number | null) => {
    if (id == null) return;
    const table = planTables.find((t) => t.id === id);
    if (!table) return;
    const occupied = table.open_ticket_id != null;
    if (mode === 'transfer') {
      if (occupied) return;
      onTransferTo(table);
      return;
    }
    if (mode === 'merge') {
      if (!occupied || table.open_ticket_id === activeTicketId) return;
      onMergeInto(table);
      return;
    }
    if (occupied) onSelectOccupied(table);
    else onSelectFree(table);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TableIcon />
        Plan de salle
      </DialogTitle>
      <DialogContent dividers>
        {activeTicketId != null && (
          <Box sx={{ mb: 2 }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={mode}
              onChange={(_e, next: MapMode | null) => {
                if (next) setMode(next);
              }}
            >
              <ToggleButton value="select">Ouvrir / charger</ToggleButton>
              <ToggleButton value="transfer">Transférer</ToggleButton>
              <ToggleButton value="merge">Fusionner</ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
              {mode === 'transfer' && 'Choisissez une table libre.'}
              {mode === 'merge' && 'Choisissez une autre table occupée (cible).'}
              {mode === 'select' && 'Touchez une table libre ou occupée.'}
            </Typography>
          </Box>
        )}
        {loading && (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        {!loading && tables.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography sx={{ mb: 2 }}>Aucune table configurée.</Typography>
            {canManageFloor ? (
              <Button variant="contained" onClick={() => void createQuickPlan()} disabled={creating}>
                {creating ? 'Création…' : 'Créer un plan « Salle » (tables 1–12)'}
              </Button>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Demandez à un administrateur de créer le plan de salle.
              </Typography>
            )}
          </Box>
        )}
        {!loading && tables.length > 0 && activePlans.length > 1 && (
          <Tabs
            value={selectedPlanId ?? false}
            onChange={(_e, value: number) => setSelectedPlanId(value)}
            variant="scrollable"
            allowScrollButtonsMobile
            sx={{ mb: 2, minHeight: 40 }}
          >
            {activePlans.map((plan) => (
              <Tab
                key={plan.id}
                value={plan.id}
                label={plan.name}
                sx={{ textTransform: 'none', minHeight: 40 }}
              />
            ))}
          </Tabs>
        )}
        {!loading && tables.length > 0 && (
          <Box sx={{ mb: 2 }}>
            {activePlans.length === 1 && (
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                {activePlans[0]?.name}
              </Typography>
            )}
            <Box sx={{ height: 480 }}>
              <FloorCanvasView
                tables={canvasTables}
                mode="select"
                snapEnabled={false}
                onSelect={handleTableSelect}
              />
            </Box>
            {planTables.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Aucune table active sur ce plan.
              </Typography>
            )}
          </Box>
        )}
        <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
          <Chip size="small" color="success" variant="outlined" label="Libre" />
          <Chip size="small" color="warning" variant="outlined" label="Occupée" />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          {activeTicketId != null && (
            <>
              <Button color="inherit" onClick={onTakeover}>
                Prendre en charge
              </Button>
              <Button color="inherit" onClick={onDetach}>
                Laisser ouverte
              </Button>
              <Button color="error" onClick={() => onAbandon(activeTicketId)}>
                Abandonner
              </Button>
            </>
          )}
        </Box>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
};

export default FloorMapDialog;
