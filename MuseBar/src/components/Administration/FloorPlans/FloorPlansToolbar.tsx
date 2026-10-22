import React from 'react';
import {
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

type Props = {
  selectedPlanId: number | null;
  selectedPlanName: string | null;
  tableCount: number;
  saving: boolean;
  bulkCount: string;
  snapEnabled: boolean;
  onBulkCountChange: (value: string) => void;
  onSnapEnabledChange: (enabled: boolean) => void;
  onAddTable: () => void;
  onAddBulk: () => void;
};

const FloorPlansToolbar: React.FC<Props> = ({
  selectedPlanId,
  selectedPlanName,
  tableCount,
  saving,
  bulkCount,
  snapEnabled,
  onBulkCountChange,
  onSnapEnabledChange,
  onAddTable,
  onAddBulk,
}) => (
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
      onClick={() => void onAddTable()}
    >
      + Table
    </Button>
    <TextField
      size="small"
      label="N"
      value={bulkCount}
      onChange={(e) => onBulkCountChange(e.target.value.replace(/\D/g, ''))}
      sx={{ width: 64 }}
    />
    <Button
      size="small"
      variant="outlined"
      disabled={!selectedPlanId || saving}
      onClick={() => void onAddBulk()}
    >
      + N tables
    </Button>
    <Tooltip title="Aligne automatiquement position et taille sur une grille de 20 px pour des tables bien alignées. Désactivez pour un placement libre au pixel près.">
      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={snapEnabled}
            onChange={(e) => onSnapEnabledChange(e.target.checked)}
          />
        }
        label="Aligner sur la grille"
      />
    </Tooltip>
    {selectedPlanId != null && selectedPlanName != null && (
      <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
        {selectedPlanName} · {tableCount} table{tableCount === 1 ? '' : 's'}
      </Typography>
    )}
  </Stack>
);

export default FloorPlansToolbar;
