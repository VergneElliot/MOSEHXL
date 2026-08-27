import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import * as floorApi from '../../services/api/floor';
import FloorCanvasView, { type FloorCanvasTable } from '../floor/FloorCanvasView';
import { SIZE_PRESETS, normalizeTableGeometry } from '../floor/floorGeometry';

/**
 * Top-level Plan de salle: consult floor status (mutations stay on POS / elevated PIN later).
 */
const FloorPlanConsultPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<floorApi.DiningTableStatusDto[]>([]);
  const [plans, setPlans] = useState<floorApi.FloorPlanDto[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [detail, setDetail] = useState<floorApi.DiningTableStatusDto | null>(null);

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
    void reload();
    const t = window.setInterval(() => void reload(), 15000);
    return () => window.clearInterval(t);
  }, [reload]);

  const activePlans = useMemo(() => plans.filter((p) => p.is_active), [plans]);
  const planTables = useMemo(
    () => (selectedPlanId != null ? tables.filter((t) => t.floor_plan_id === selectedPlanId) : []),
    [tables, selectedPlanId]
  );

  const canvasTables: FloorCanvasTable[] = useMemo(
    () =>
      planTables.map((t) => {
        const occupied = t.open_ticket_id != null;
        return {
          id: t.id,
          label: t.label,
          ...normalizeTableGeometry(t),
          shape: t.shape || 'rectangle',
          capacity: t.capacity,
          occupied,
          width: t.width || SIZE_PRESETS.M.width,
          height: t.height || SIZE_PRESETS.M.height,
        };
      }),
    [planTables]
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%', minHeight: 0 }}>
      <Box>
        <Typography variant="h5">Plan de salle</Typography>
        <Typography variant="body2" color="text.secondary">
          Consultation des tables et de leur occupation. Pour ouvrir ou modifier une addition,
          utilisez la Caisse (session PIN).
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && tables.length === 0 ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : tables.length === 0 ? (
        <Alert severity="info">Aucune table configurée — créez un plan dans Administration.</Alert>
      ) : (
        <>
          {activePlans.length > 1 && (
            <Tabs
              value={selectedPlanId ?? false}
              onChange={(_e, value: number) => setSelectedPlanId(value)}
              variant="scrollable"
              allowScrollButtonsMobile
            >
              {activePlans.map((plan) => (
                <Tab key={plan.id} value={plan.id} label={plan.name} sx={{ textTransform: 'none' }} />
              ))}
            </Tabs>
          )}
          {activePlans.length === 1 && (
            <Typography variant="subtitle1" fontWeight={600}>
              {activePlans[0]?.name}
            </Typography>
          )}
          <Box sx={{ flex: 1, minHeight: 420 }}>
            <FloorCanvasView
              tables={canvasTables}
              mode="select"
              snapEnabled={false}
              onSelect={(id) => {
                if (id == null) return;
                setDetail(planTables.find((t) => t.id === id) ?? null);
              }}
            />
          </Box>
          <Stack direction="row" spacing={1}>
            <Chip size="small" color="success" variant="outlined" label="Libre" />
            <Chip size="small" color="warning" variant="outlined" label="Occupée" />
          </Stack>
        </>
      )}

      <Dialog open={detail != null} onClose={() => setDetail(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Table {detail?.label}</DialogTitle>
        <DialogContent>
          {detail && (
            <Stack spacing={1} sx={{ pt: 1 }}>
              <Typography variant="body2">
                Statut :{' '}
                <strong>{detail.open_ticket_id != null ? 'Occupée' : 'Libre'}</strong>
              </Typography>
              {detail.capacity != null && (
                <Typography variant="body2">Couverts (capacité) : {detail.capacity}</Typography>
              )}
              {detail.open_ticket_id != null && (
                <>
                  <Typography variant="body2">Ticket #{detail.open_ticket_id}</Typography>
                  {detail.opened_by_user_id != null && (
                    <Typography variant="body2">
                      Ouvert par utilisateur #{detail.opened_by_user_id}
                    </Typography>
                  )}
                  {detail.last_served_by_user_id != null && (
                    <Typography variant="body2">
                      Dernier service : utilisateur #{detail.last_served_by_user_id}
                    </Typography>
                  )}
                  {detail.open_ticket_updated_at && (
                    <Typography variant="caption" color="text.secondary">
                      MAJ : {new Date(detail.open_ticket_updated_at).toLocaleString('fr-FR')}
                    </Typography>
                  )}
                </>
              )}
              <Typography variant="caption" color="text.secondary">
                Consultation seule — actions sur la Caisse.
              </Typography>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default FloorPlanConsultPanel;
