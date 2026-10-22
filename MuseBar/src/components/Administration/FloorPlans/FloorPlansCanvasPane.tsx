import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import FloorCanvasView, { type FloorCanvasTable } from '../../floor/FloorCanvasView';
import FloorPlansToolbar from './FloorPlansToolbar';

type Props = {
  selectedPlanId: number | null;
  selectedPlanName: string | null;
  tableCount: number;
  localTables: FloorCanvasTable[];
  selectedTableId: number | null;
  saving: boolean;
  bulkCount: string;
  snapEnabled: boolean;
  onLocalTablesChange: (tables: FloorCanvasTable[]) => void;
  onSelectTable: (id: number | null) => void;
  onGeometryCommit: (
    id: number,
    geometry: { pos_x: number; pos_y: number; width: number; height: number }
  ) => void;
  onBulkCountChange: (value: string) => void;
  onSnapEnabledChange: (enabled: boolean) => void;
  onAddTable: () => void;
  onAddBulk: () => void;
};

const FloorPlansCanvasPane: React.FC<Props> = ({
  selectedPlanId,
  selectedPlanName,
  tableCount,
  localTables,
  selectedTableId,
  saving,
  bulkCount,
  snapEnabled,
  onLocalTablesChange,
  onSelectTable,
  onGeometryCommit,
  onBulkCountChange,
  onSnapEnabledChange,
  onAddTable,
  onAddBulk,
}) => (
  <Paper sx={{ p: 1, display: 'flex', flexDirection: 'column', minHeight: 420 }}>
    <FloorPlansToolbar
      selectedPlanId={selectedPlanId}
      selectedPlanName={selectedPlanName}
      tableCount={tableCount}
      saving={saving}
      bulkCount={bulkCount}
      snapEnabled={snapEnabled}
      onBulkCountChange={onBulkCountChange}
      onSnapEnabledChange={onSnapEnabledChange}
      onAddTable={onAddTable}
      onAddBulk={onAddBulk}
    />
    {selectedPlanId ? (
      <Box sx={{ flex: 1, minHeight: 400 }}>
        <FloorCanvasView
          tables={localTables}
          localTables={localTables}
          onLocalTablesChange={onLocalTablesChange}
          mode="edit"
          selectedId={selectedTableId}
          onSelect={onSelectTable}
          onGeometryCommit={(id, geo) => void onGeometryCommit(id, geo)}
          snapEnabled={snapEnabled}
        />
      </Box>
    ) : (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Sélectionnez ou créez un plan.</Typography>
      </Box>
    )}
  </Paper>
);

export default FloorPlansCanvasPane;
