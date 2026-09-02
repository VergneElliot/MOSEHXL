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
  Tabs,
  Tab,
} from '@mui/material';
import { TableRestaurant as TableIcon } from '@mui/icons-material';
import * as floorApi from '../../services/api/floor';
import FloorCanvasView, { type FloorCanvasTable } from '../floor/FloorCanvasView';
import { SIZE_PRESETS, gridPlacement, normalizeTableGeometry } from '../floor/floorGeometry';

interface FloorMapDialogProps {
  open: boolean;
  onClose: () => void;
  mapPurpose?: 'default' | 'validate' | 'assign' | 'move-table';
  activeTicketId: number | null;
  onSelectFree: (table: floorApi.DiningTableStatusDto) => void;
  onSelectOccupied: (table: floorApi.DiningTableStatusDto) => void;
  /** Used when mapPurpose is move-table (partial/full move via Assigner à). */
  onTransferTo?: (table: floorApi.DiningTableStatusDto) => void;
  onMergeInto?: (table: floorApi.DiningTableStatusDto) => void;
  canManageFloor: boolean;
}

export const FloorMapDialog: React.FC<FloorMapDialogProps> = ({
  open,
  onClose,
  mapPurpose = 'default',
  activeTicketId,
  onSelectFree,
  onSelectOccupied,
  onTransferTo,
  onMergeInto,
  canManageFloor,
}) => {
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState<floorApi.DiningTableStatusDto[]>([]);
  const [plans, setPlans] = useState<floorApi.FloorPlanDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
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
    if (open) void reload();
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
        const occupied = t.has_validated_items === true;
        const isActive = activeTicketId != null && t.open_ticket_id === activeTicketId;
        return {
          id: t.id,
          label: t.label,
          ...normalizeTableGeometry(t),
          shape: t.shape || 'rectangle',
          capacity: t.capacity != null ? Number(t.capacity) : null,
          occupied,
          isActive,
          disabled: mapPurpose === 'move-table' ? isActive : false,
        };
      }),
    [planTables, activeTicketId, mapPurpose]
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
    const hasOpenTicket = table.open_ticket_id != null;
    if (mapPurpose === 'move-table') {
      if (table.open_ticket_id === activeTicketId) return;
      if (hasOpenTicket) onMergeInto?.(table);
      else onTransferTo?.(table);
      return;
    }
    if (hasOpenTicket) onSelectOccupied(table);
    else onSelectFree(table);
  };

  const purposeHint =
    mapPurpose === 'validate'
      ? 'Choisissez la table pour valider cette commande.'
      : mapPurpose === 'move-table'
        ? 'Choisissez la table de destination — addition déplacée (libre) ou fusionnée (occupée).'
        : mapPurpose === 'assign'
          ? 'Choisissez la table — la commande sera assignée et validée (cuisine).'
          : 'Touchez une table pour l’ouvrir dans votre session.';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TableIcon />
        {mapPurpose === 'default' ? 'Sélectionner une table' : 'Plan de salle'}
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {purposeHint}
        </Typography>
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
      <DialogActions sx={{ px: 2 }}>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
};

export default FloorMapDialog;
