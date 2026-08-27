import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import * as floorApi from '../../services/api/floor';
import FloorCanvasView, { type FloorCanvasTable } from '../floor/FloorCanvasView';
import {
  SIZE_PRESETS,
  clampTableRect,
  detectSizePreset,
  gridPlacement,
  nextTableLabel,
  normalizeTableGeometry,
  type SizePreset,
  type TableShape,
} from '../floor/floorGeometry';

function toCanvasTables(tables: floorApi.DiningTableDto[]): FloorCanvasTable[] {
  return tables.map((t) => ({
    id: t.id,
    label: t.label,
    ...normalizeTableGeometry(t),
    shape: t.shape || 'rectangle',
    capacity: t.capacity != null ? Number(t.capacity) : null,
  }));
}

/**
 * Admin visual floor editor: plan list + canvas + table properties.
 */
const FloorPlansPanel: React.FC = () => {
  const [plans, setPlans] = useState<floorApi.FloorPlanDto[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [tables, setTables] = useState<floorApi.DiningTableDto[]>([]);
  const [localTables, setLocalTables] = useState<FloorCanvasTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [newPlanName, setNewPlanName] = useState('');
  const [renamePlan, setRenamePlan] = useState<{ id: number; name: string } | null>(null);
  const [bulkCount, setBulkCount] = useState('4');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const planList = await floorApi.listFloorPlans();
      setPlans(planList);
      setSelectedPlanId((prev) => {
        if (prev != null && planList.some((p) => p.id === prev)) return prev;
        return planList[0]?.id ?? null;
      });
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Impossible de charger les plans');
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadTables = useCallback(async (planId: number) => {
    try {
      const list = await floorApi.listDiningTables(planId);
      setTables(list);
      setLocalTables(toCanvasTables(list));
      setSelectedTableId((prev) =>
        prev != null && list.some((t) => t.id === prev) ? prev : null
      );
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Impossible de charger les tables');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (selectedPlanId != null) void reloadTables(selectedPlanId);
    else {
      setTables([]);
      setLocalTables([]);
      setSelectedTableId(null);
    }
  }, [selectedPlanId, reloadTables]);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
  const selectedTable = useMemo(
    () => tables.find((t) => t.id === selectedTableId) ?? null,
    [tables, selectedTableId]
  );
  const selectedLocal = useMemo(
    () => localTables.find((t) => t.id === selectedTableId) ?? null,
    [localTables, selectedTableId]
  );

  const handleCreatePlan = async () => {
    const name = newPlanName.trim();
    if (!name) return;
    try {
      const plan = await floorApi.createFloorPlan(name);
      setNewPlanName('');
      await reload();
      setSelectedPlanId(plan.id);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Création du plan impossible');
    }
  };

  const handleSaveRename = async () => {
    if (!renamePlan) return;
    try {
      await floorApi.updateFloorPlan(renamePlan.id, { name: renamePlan.name.trim() });
      setRenamePlan(null);
      await reload();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Renommage impossible');
    }
  };

  const handleTogglePlanActive = async (plan: floorApi.FloorPlanDto) => {
    try {
      await floorApi.updateFloorPlan(plan.id, { is_active: !plan.is_active });
      await reload();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Mise à jour impossible');
    }
  };

  const handleDeletePlan = async (plan: floorApi.FloorPlanDto) => {
    if (!window.confirm(`Supprimer le plan « ${plan.name} » et ses tables ?`)) return;
    try {
      await floorApi.deleteFloorPlan(plan.id);
      await reload();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Suppression impossible (tables encore liées ?)');
    }
  };

  const syncAfterTableChange = async (planId: number, keepId?: number) => {
    await reloadTables(planId);
    if (keepId != null) setSelectedTableId(keepId);
  };

  /** Labels are unique across the whole establishment, not only this plan. */
  const loadEstablishmentLabels = async (): Promise<string[]> => {
    const all = await floorApi.listDiningTables();
    return all.map((t) => t.label);
  };

  const handleAddTable = async () => {
    if (!selectedPlanId) return;
    setSaving(true);
    try {
      const label = nextTableLabel(await loadEstablishmentLabels());
      const place = gridPlacement(tables.length);
      const size = SIZE_PRESETS.M;
      const created = await floorApi.createDiningTable({
        floor_plan_id: selectedPlanId,
        label,
        pos_x: place.pos_x,
        pos_y: place.pos_y,
        width: size.width,
        height: size.height,
        shape: 'rectangle',
        sort_order: tables.length + 1,
      });
      await syncAfterTableChange(selectedPlanId, created.id);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Ajout de table impossible');
    } finally {
      setSaving(false);
    }
  };

  const handleAddBulk = async () => {
    if (!selectedPlanId) return;
    const n = Math.min(40, Math.max(1, parseInt(bulkCount, 10) || 1));
    setSaving(true);
    try {
      let labels = await loadEstablishmentLabels();
      let count = tables.length;
      let lastId: number | undefined;
      for (let i = 0; i < n; i += 1) {
        const label = nextTableLabel(labels);
        labels = [...labels, label];
        const place = gridPlacement(count);
        const size = SIZE_PRESETS.M;
        const created = await floorApi.createDiningTable({
          floor_plan_id: selectedPlanId,
          label,
          pos_x: place.pos_x,
          pos_y: place.pos_y,
          width: size.width,
          height: size.height,
          shape: 'rectangle',
          sort_order: count + 1,
        });
        lastId = created.id;
        count += 1;
      }
      await syncAfterTableChange(selectedPlanId, lastId);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Ajout en masse impossible');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicateSelected = async () => {
    if (!selectedTable || !selectedLocal || !selectedPlanId) return;
    setSaving(true);
    try {
      const label = nextTableLabel(await loadEstablishmentLabels());
      const geo = normalizeTableGeometry(selectedLocal);
      const offset = clampTableRect(geo.pos_x + 24, geo.pos_y + 24, geo.width, geo.height);
      const created = await floorApi.createDiningTable({
        floor_plan_id: selectedPlanId,
        label,
        pos_x: offset.pos_x,
        pos_y: offset.pos_y,
        width: geo.width,
        height: geo.height,
        capacity: selectedTable.capacity,
        shape: selectedTable.shape || 'rectangle',
        sort_order: tables.length + 1,
      });
      await syncAfterTableChange(selectedPlanId, created.id);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Duplication impossible');
    } finally {
      setSaving(false);
    }
  };

  const handleGeometryCommit = async (
    id: number,
    geometry: { pos_x: number; pos_y: number; width: number; height: number }
  ) => {
    try {
      const updated = await floorApi.updateDiningTable(id, geometry);
      setTables((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
      setLocalTables((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                ...normalizeTableGeometry(updated),
              }
            : t
        )
      );
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Enregistrement de la position impossible');
      if (selectedPlanId != null) void reloadTables(selectedPlanId);
    }
  };

  const patchSelected = async (
    patch: Partial<{
      label: string;
      capacity: number | null;
      shape: string;
      width: number;
      height: number;
      is_active: boolean;
    }>
  ) => {
    if (!selectedTableId || !selectedPlanId) return;
    setSaving(true);
    try {
      const updated = await floorApi.updateDiningTable(selectedTableId, patch);
      setTables((prev) => prev.map((t) => (t.id === selectedTableId ? { ...t, ...updated } : t)));
      setLocalTables((prev) =>
        prev.map((t) =>
          t.id === selectedTableId
            ? {
                ...t,
                label: updated.label,
                capacity: updated.capacity != null ? Number(updated.capacity) : null,
                shape: updated.shape,
                ...normalizeTableGeometry(updated),
              }
            : t
        )
      );
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Mise à jour impossible');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedTable || !selectedPlanId) return;
    if (!window.confirm(`Supprimer la table « ${selectedTable.label} » ?`)) return;
    try {
      await floorApi.deleteDiningTable(selectedTable.id);
      setSelectedTableId(null);
      await reloadTables(selectedPlanId);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Suppression impossible (table occupée ?)');
    }
  };

  const applyPreset = (preset: SizePreset) => {
    const size = SIZE_PRESETS[preset];
    void patchSelected({ width: size.width, height: size.height });
  };

  const applyShape = (shape: TableShape) => {
    if (!selectedLocal) return;
    if (shape === 'square' || shape === 'circle') {
      const s = Math.max(selectedLocal.width, selectedLocal.height);
      void patchSelected({ shape, width: s, height: s });
    } else {
      void patchSelected({ shape });
    }
  };

  const sizePreset = selectedLocal
    ? detectSizePreset(selectedLocal.width, selectedLocal.height)
    : 'custom';

  return (
    <Box
      sx={{
        p: 2,
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      <Typography variant="h5">Plans de tables</Typography>
      <Typography variant="body2" color="text.secondary">
        Glissez les tables sur le plan. La géométrie s’enregistre automatiquement. Le POS utilise
        le même positionnement.
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          flex: 1,
          minHeight: 480,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '220px 1fr 260px' },
          gap: 1.5,
        }}
      >
        {/* Left: plans */}
        <Paper sx={{ p: 1.5, overflow: 'auto' }}>
          <Typography variant="subtitle2" gutterBottom>
            Plans
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
            <TextField
              size="small"
              label="Nouveau"
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              fullWidth
            />
            <Button
              variant="contained"
              size="small"
              onClick={() => void handleCreatePlan()}
              disabled={!newPlanName.trim()}
            >
              +
            </Button>
          </Stack>
          <Stack spacing={0.5}>
            {plans.map((plan) => (
              <Box
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                sx={{
                  p: 1,
                  borderRadius: 1,
                  cursor: 'pointer',
                  bgcolor: plan.id === selectedPlanId ? 'action.selected' : 'transparent',
                  border: '1px solid',
                  borderColor: plan.id === selectedPlanId ? 'primary.main' : 'divider',
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {plan.name}
                  {!plan.is_active && (
                    <Typography component="span" variant="caption" color="text.secondary">
                      {' '}
                      (inactif)
                    </Typography>
                  )}
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenamePlan({ id: plan.id, name: plan.name });
                    }}
                  >
                    Renommer
                  </Button>
                  <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleTogglePlanActive(plan);
                    }}
                  >
                    {plan.is_active ? 'Off' : 'On'}
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDeletePlan(plan);
                    }}
                  >
                    Suppr.
                  </Button>
                </Stack>
              </Box>
            ))}
            {!loading && plans.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Aucun plan — créez-en un.
              </Typography>
            )}
          </Stack>
        </Paper>

        {/* Center: canvas */}
        <Paper sx={{ p: 1, display: 'flex', flexDirection: 'column', minHeight: 420 }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mb: 1, flexWrap: 'wrap' }}
            useFlexGap
          >
            <Button
              variant="contained"
              size="small"
              disabled={!selectedPlanId || saving}
              onClick={() => void handleAddTable()}
            >
              + Table
            </Button>
            <TextField
              size="small"
              label="N"
              value={bulkCount}
              onChange={(e) => setBulkCount(e.target.value.replace(/\D/g, ''))}
              sx={{ width: 64 }}
            />
            <Button
              size="small"
              variant="outlined"
              disabled={!selectedPlanId || saving}
              onClick={() => void handleAddBulk()}
            >
              + N tables
            </Button>
            <Tooltip title="Aligne automatiquement position et taille sur une grille de 20 px pour des tables bien alignées. Désactivez pour un placement libre au pixel près.">
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={snapEnabled}
                    onChange={(e) => setSnapEnabled(e.target.checked)}
                  />
                }
                label="Aligner sur la grille"
              />
            </Tooltip>
            {selectedPlan && (
              <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                {selectedPlan.name} · {tables.length} table{tables.length === 1 ? '' : 's'}
              </Typography>
            )}
          </Stack>
          {selectedPlan ? (
            <Box sx={{ flex: 1, minHeight: 400 }}>
              <FloorCanvasView
                tables={localTables}
                localTables={localTables}
                onLocalTablesChange={setLocalTables}
                mode="edit"
                selectedId={selectedTableId}
                onSelect={setSelectedTableId}
                onGeometryCommit={(id, geo) => void handleGeometryCommit(id, geo)}
                snapEnabled={snapEnabled}
              />
            </Box>
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">Sélectionnez ou créez un plan.</Typography>
            </Box>
          )}
        </Paper>

        {/* Right: properties */}
        <Paper sx={{ p: 1.5, overflow: 'auto' }}>
          <Typography variant="subtitle2" gutterBottom>
            Propriétés
          </Typography>
          {!selectedTable || !selectedLocal ? (
            <Typography variant="body2" color="text.secondary">
              Sélectionnez une table sur le plan.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              <TextField
                size="small"
                label="Libellé"
                defaultValue={selectedTable.label}
                key={`label-${selectedTable.id}-${selectedTable.label}`}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== selectedTable.label) void patchSelected({ label: v });
                }}
              />
              <TextField
                size="small"
                label="Couverts"
                defaultValue={selectedTable.capacity ?? ''}
                key={`cap-${selectedTable.id}-${selectedTable.capacity}`}
                onBlur={(e) => {
                  const raw = e.target.value.trim();
                  const capacity = raw === '' ? null : Number(raw);
                  if (capacity !== selectedTable.capacity) {
                    void patchSelected({
                      capacity: Number.isFinite(capacity as number) ? capacity : null,
                    });
                  }
                }}
              />
              <FormControl size="small" fullWidth>
                <InputLabel>Forme</InputLabel>
                <Select
                  label="Forme"
                  value={(selectedLocal.shape as TableShape) || 'rectangle'}
                  onChange={(e) => applyShape(e.target.value as TableShape)}
                >
                  <MenuItem value="rectangle">Rectangle</MenuItem>
                  <MenuItem value="square">Carré</MenuItem>
                  <MenuItem value="circle">Rond</MenuItem>
                </Select>
              </FormControl>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Taille
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  fullWidth
                  value={sizePreset === 'custom' ? null : sizePreset}
                  onChange={(_e, v: SizePreset | null) => {
                    if (v) applyPreset(v);
                  }}
                  sx={{ mt: 0.5 }}
                >
                  <ToggleButton value="S">S</ToggleButton>
                  <ToggleButton value="M">M</ToggleButton>
                  <ToggleButton value="L">L</ToggleButton>
                </ToggleButtonGroup>
                {sizePreset === 'custom' && (
                  <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                    {Math.round(selectedLocal.width)}×{Math.round(selectedLocal.height)} (perso.)
                  </Typography>
                )}
              </Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={selectedTable.is_active}
                    onChange={(e) => void patchSelected({ is_active: e.target.checked })}
                  />
                }
                label="Table active"
              />
              <Button
                variant="outlined"
                size="small"
                disabled={saving}
                onClick={() => void handleDuplicateSelected()}
              >
                Dupliquer la table
              </Button>
              <Button color="error" size="small" onClick={() => void handleDeleteSelected()}>
                Supprimer la table
              </Button>
              <Typography variant="caption" color="text.secondary">
                Les libellés sont uniques dans tout l’établissement (tous plans confondus).
              </Typography>
            </Stack>
          )}
        </Paper>
      </Box>

      <Dialog open={renamePlan != null} onClose={() => setRenamePlan(null)}>
        <DialogTitle>Renommer le plan</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Nom"
            value={renamePlan?.name ?? ''}
            onChange={(e) =>
              setRenamePlan((prev) => (prev ? { ...prev, name: e.target.value } : prev))
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenamePlan(null)}>Annuler</Button>
          <Button variant="contained" onClick={() => void handleSaveRename()}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FloorPlansPanel;
