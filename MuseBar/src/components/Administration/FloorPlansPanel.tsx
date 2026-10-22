import React from 'react';
import { Alert, Box, Typography } from '@mui/material';
import FloorPlanRenameDialog from './FloorPlans/FloorPlanRenameDialog';
import FloorPlansCanvasPane from './FloorPlans/FloorPlansCanvasPane';
import FloorPlansList from './FloorPlans/FloorPlansList';
import FloorPlansTableInspector from './FloorPlans/FloorPlansTableInspector';
import { useFloorPlansEditor } from './FloorPlans/useFloorPlansEditor';

/**
 * Admin visual floor editor: plan list + canvas + table properties.
 */
const FloorPlansPanel: React.FC = () => {
  const editor = useFloorPlansEditor();

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

      {editor.error && (
        <Alert severity="error" onClose={() => editor.setError(null)}>
          {editor.error}
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
        <FloorPlansList
          plans={editor.plans}
          selectedPlanId={editor.selectedPlanId}
          loading={editor.loading}
          newPlanName={editor.newPlanName}
          onNewPlanNameChange={editor.setNewPlanName}
          onCreatePlan={() => void editor.handleCreatePlan()}
          onSelectPlan={editor.setSelectedPlanId}
          onRename={editor.setRenamePlan}
          onToggleActive={editor.handleTogglePlanActive}
          onDelete={editor.handleDeletePlan}
        />
        <FloorPlansCanvasPane
          selectedPlanId={editor.selectedPlan ? editor.selectedPlanId : null}
          selectedPlanName={editor.selectedPlan?.name ?? null}
          tableCount={editor.tables.length}
          localTables={editor.localTables}
          selectedTableId={editor.selectedTableId}
          saving={editor.saving}
          bulkCount={editor.bulkCount}
          snapEnabled={editor.snapEnabled}
          onLocalTablesChange={editor.setLocalTables}
          onSelectTable={editor.setSelectedTableId}
          onGeometryCommit={editor.handleGeometryCommit}
          onBulkCountChange={editor.setBulkCount}
          onSnapEnabledChange={editor.setSnapEnabled}
          onAddTable={editor.handleAddTable}
          onAddBulk={editor.handleAddBulk}
        />
        <FloorPlansTableInspector
          selectedTable={editor.selectedTable}
          selectedLocal={editor.selectedLocal}
          saving={editor.saving}
          sizePreset={editor.sizePreset}
          onPatch={editor.patchSelected}
          onApplyShape={editor.applyShape}
          onApplyPreset={editor.applyPreset}
          onDuplicate={editor.handleDuplicateSelected}
          onDelete={editor.handleDeleteSelected}
        />
      </Box>

      <FloorPlanRenameDialog
        renamePlan={editor.renamePlan}
        onChangeName={(name) =>
          editor.setRenamePlan((prev) => (prev ? { ...prev, name } : prev))
        }
        onClose={() => editor.setRenamePlan(null)}
        onSave={editor.handleSaveRename}
      />
    </Box>
  );
};

export default FloorPlansPanel;
