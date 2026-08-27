import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import * as floorApi from '../../services/api/floor';

/**
 * Light Admin CRUD for floor plans + dining tables (forms only, no drag canvas).
 */
const FloorPlansPanel: React.FC = () => {
  const [plans, setPlans] = useState<floorApi.FloorPlanDto[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [tables, setTables] = useState<floorApi.DiningTableDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPlanName, setNewPlanName] = useState('');
  const [tableDialog, setTableDialog] = useState<{
    mode: 'create' | 'edit';
    table?: floorApi.DiningTableDto;
  } | null>(null);
  const [tableLabel, setTableLabel] = useState('');
  const [tableCapacity, setTableCapacity] = useState('');
  const [tableSort, setTableSort] = useState('0');
  const [tableActive, setTableActive] = useState(true);
  const [renamePlan, setRenamePlan] = useState<{ id: number; name: string } | null>(null);

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
    else setTables([]);
  }, [selectedPlanId, reloadTables]);

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

  const openCreateTable = () => {
    setTableLabel('');
    setTableCapacity('');
    setTableSort(String((tables.length + 1) * 10));
    setTableActive(true);
    setTableDialog({ mode: 'create' });
  };

  const openEditTable = (table: floorApi.DiningTableDto) => {
    setTableLabel(table.label);
    setTableCapacity(table.capacity != null ? String(table.capacity) : '');
    setTableSort(String(table.sort_order));
    setTableActive(table.is_active);
    setTableDialog({ mode: 'edit', table });
  };

  const handleSaveTable = async () => {
    if (!selectedPlanId || !tableLabel.trim()) return;
    const capacity = tableCapacity.trim() === '' ? null : Number(tableCapacity);
    const sort_order = Number(tableSort) || 0;
    try {
      if (tableDialog?.mode === 'edit' && tableDialog.table) {
        await floorApi.updateDiningTable(tableDialog.table.id, {
          label: tableLabel.trim(),
          capacity: Number.isFinite(capacity as number) ? capacity : null,
          sort_order,
          is_active: tableActive,
        });
      } else {
        await floorApi.createDiningTable({
          floor_plan_id: selectedPlanId,
          label: tableLabel.trim(),
          capacity: Number.isFinite(capacity as number) ? capacity : null,
          sort_order,
        });
      }
      setTableDialog(null);
      await reloadTables(selectedPlanId);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Enregistrement de la table impossible');
    }
  };

  const handleDeleteTable = async (table: floorApi.DiningTableDto) => {
    if (!window.confirm(`Supprimer la table « ${table.label} » ?`)) return;
    try {
      await floorApi.deleteDiningTable(table.id);
      if (selectedPlanId != null) await reloadTables(selectedPlanId);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Suppression impossible (table occupée ?)');
    }
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h5">Plans de tables</Typography>
      <Typography variant="body2" color="text.secondary">
        Créez des salles et des tables (libellé, capacité, ordre). L’éditeur graphique
        glisser-déposer arrive plus tard — le POS affiche déjà ces tables.
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>
          Plans
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
          <TextField
            size="small"
            label="Nouveau plan"
            value={newPlanName}
            onChange={(e) => setNewPlanName(e.target.value)}
          />
          <Button variant="contained" onClick={() => void handleCreatePlan()} disabled={!newPlanName.trim()}>
            Créer
          </Button>
        </Stack>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Actif</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {plans.map((plan) => (
                <TableRow
                  key={plan.id}
                  hover
                  selected={plan.id === selectedPlanId}
                  onClick={() => setSelectedPlanId(plan.id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{plan.name}</TableCell>
                  <TableCell>{plan.is_active ? 'Oui' : 'Non'}</TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Button size="small" onClick={() => setRenamePlan({ id: plan.id, name: plan.name })}>
                      Renommer
                    </Button>
                    <Button size="small" onClick={() => void handleTogglePlanActive(plan)}>
                      {plan.is_active ? 'Désactiver' : 'Activer'}
                    </Button>
                    <Button size="small" color="error" onClick={() => void handleDeletePlan(plan)}>
                      Supprimer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && plans.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>Aucun plan — créez-en un ci-dessus.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {selectedPlan && (
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle1">Tables — {selectedPlan.name}</Typography>
            <Button variant="contained" size="small" onClick={openCreateTable}>
              Ajouter une table
            </Button>
          </Stack>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Libellé</TableCell>
                  <TableCell>Capacité</TableCell>
                  <TableCell>Ordre</TableCell>
                  <TableCell>Active</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tables.map((table) => (
                  <TableRow key={table.id}>
                    <TableCell>{table.label}</TableCell>
                    <TableCell>{table.capacity ?? '—'}</TableCell>
                    <TableCell>{table.sort_order}</TableCell>
                    <TableCell>{table.is_active ? 'Oui' : 'Non'}</TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => openEditTable(table)}>
                        Modifier
                      </Button>
                      <Button size="small" color="error" onClick={() => void handleDeleteTable(table)}>
                        Supprimer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {tables.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>Aucune table sur ce plan.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

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

      <Dialog open={tableDialog != null} onClose={() => setTableDialog(null)}>
        <DialogTitle>
          {tableDialog?.mode === 'edit' ? 'Modifier la table' : 'Nouvelle table'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Libellé"
            value={tableLabel}
            onChange={(e) => setTableLabel(e.target.value)}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Capacité"
            value={tableCapacity}
            onChange={(e) => setTableCapacity(e.target.value.replace(/\D/g, ''))}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Ordre d’affichage"
            value={tableSort}
            onChange={(e) => setTableSort(e.target.value.replace(/\D/g, ''))}
          />
          {tableDialog?.mode === 'edit' && (
            <FormControlLabel
              control={
                <Checkbox checked={tableActive} onChange={(e) => setTableActive(e.target.checked)} />
              }
              label="Table active"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTableDialog(null)}>Annuler</Button>
          <Button
            variant="contained"
            disabled={!tableLabel.trim()}
            onClick={() => void handleSaveTable()}
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FloorPlansPanel;
