import React from 'react';
import {
  Box,
  Button,
  Checkbox,
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
  Typography,
} from '@mui/material';
import type * as floorApi from '../../../services/api/floor';
import type { FloorCanvasTable } from '../../floor/FloorCanvasView';
import type { SizePreset, TableShape } from '../../floor/floorGeometry';
import type { DiningTablePatch } from './floorPlansTypes';

type Props = {
  selectedTable: floorApi.DiningTableDto | null;
  selectedLocal: FloorCanvasTable | null;
  saving: boolean;
  sizePreset: SizePreset | 'custom';
  onPatch: (patch: DiningTablePatch) => void;
  onApplyShape: (shape: TableShape) => void;
  onApplyPreset: (preset: SizePreset) => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

const FloorPlansTableInspector: React.FC<Props> = ({
  selectedTable,
  selectedLocal,
  saving,
  sizePreset,
  onPatch,
  onApplyShape,
  onApplyPreset,
  onDuplicate,
  onDelete,
}) => (
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
            if (v && v !== selectedTable.label) void onPatch({ label: v });
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
              void onPatch({
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
            onChange={(e) => onApplyShape(e.target.value as TableShape)}
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
              if (v) onApplyPreset(v);
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
              onChange={(e) => void onPatch({ is_active: e.target.checked })}
            />
          }
          label="Table active"
        />
        <Button
          variant="outlined"
          size="small"
          disabled={saving}
          onClick={() => void onDuplicate()}
        >
          Dupliquer la table
        </Button>
        <Button color="error" size="small" onClick={() => void onDelete()}>
          Supprimer la table
        </Button>
        <Typography variant="caption" color="text.secondary">
          Les libellés sont uniques dans tout l’établissement (tous plans confondus).
        </Typography>
      </Stack>
    )}
  </Paper>
);

export default FloorPlansTableInspector;
