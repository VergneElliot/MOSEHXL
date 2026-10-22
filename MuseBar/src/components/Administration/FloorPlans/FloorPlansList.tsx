import React from 'react';
import { Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import type * as floorApi from '../../../services/api/floor';

type Props = {
  plans: floorApi.FloorPlanDto[];
  selectedPlanId: number | null;
  loading: boolean;
  newPlanName: string;
  onNewPlanNameChange: (name: string) => void;
  onCreatePlan: () => void;
  onSelectPlan: (id: number) => void;
  onRename: (plan: { id: number; name: string }) => void;
  onToggleActive: (plan: floorApi.FloorPlanDto) => void;
  onDelete: (plan: floorApi.FloorPlanDto) => void;
};

const FloorPlansList: React.FC<Props> = ({
  plans,
  selectedPlanId,
  loading,
  newPlanName,
  onNewPlanNameChange,
  onCreatePlan,
  onSelectPlan,
  onRename,
  onToggleActive,
  onDelete,
}) => (
  <Paper sx={{ p: 1.5, overflow: 'auto' }}>
    <Typography variant="subtitle2" gutterBottom>
      Plans
    </Typography>
    <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
      <TextField
        size="small"
        label="Nouveau"
        value={newPlanName}
        onChange={(e) => onNewPlanNameChange(e.target.value)}
        fullWidth
      />
      <Button
        variant="contained"
        size="small"
        onClick={() => void onCreatePlan()}
        disabled={!newPlanName.trim()}
      >
        +
      </Button>
    </Stack>
    <Stack spacing={0.5}>
      {plans.map((plan) => (
        <Box
          key={plan.id}
          onClick={() => onSelectPlan(plan.id)}
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
                onRename({ id: plan.id, name: plan.name });
              }}
            >
              Renommer
            </Button>
            <Button
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                void onToggleActive(plan);
              }}
            >
              {plan.is_active ? 'Off' : 'On'}
            </Button>
            <Button
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                void onDelete(plan);
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
);

export default FloorPlansList;
