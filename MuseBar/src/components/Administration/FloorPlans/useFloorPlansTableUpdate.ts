import { useCallback, type Dispatch, type SetStateAction } from 'react';
import * as floorApi from '../../../services/api/floor';
import type { FloorCanvasTable } from '../../floor/FloorCanvasView';
import {
  SIZE_PRESETS,
  normalizeTableGeometry,
  type SizePreset,
  type TableShape,
} from '../../floor/floorGeometry';
import type { DiningTablePatch } from './floorPlansTypes';

export function useFloorPlansTableUpdate(input: {
  selectedPlanId: number | null;
  selectedTable: floorApi.DiningTableDto | null;
  selectedLocal: FloorCanvasTable | null;
  selectedTableId: number | null;
  setTables: Dispatch<SetStateAction<floorApi.DiningTableDto[]>>;
  setLocalTables: Dispatch<SetStateAction<FloorCanvasTable[]>>;
  setSelectedTableId: Dispatch<SetStateAction<number | null>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setSaving: Dispatch<SetStateAction<boolean>>;
  reloadTables: (planId: number) => Promise<void>;
}) {
  const {
    selectedPlanId,
    selectedTable,
    selectedLocal,
    selectedTableId,
    setTables,
    setLocalTables,
    setSelectedTableId,
    setError,
    setSaving,
    reloadTables,
  } = input;

  const handleGeometryCommit = useCallback(
    async (
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
    },
    [setTables, setLocalTables, setError, selectedPlanId, reloadTables]
  );

  const patchSelected = useCallback(
    async (patch: DiningTablePatch) => {
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
    },
    [selectedTableId, selectedPlanId, setSaving, setTables, setLocalTables, setError]
  );

  const handleDeleteSelected = useCallback(async () => {
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
  }, [selectedTable, selectedPlanId, setSelectedTableId, reloadTables, setError]);

  const applyPreset = useCallback(
    (preset: SizePreset) => {
      const size = SIZE_PRESETS[preset];
      void patchSelected({ width: size.width, height: size.height });
    },
    [patchSelected]
  );

  const applyShape = useCallback(
    (shape: TableShape) => {
      if (!selectedLocal) return;
      if (shape === 'square' || shape === 'circle') {
        const s = Math.max(selectedLocal.width, selectedLocal.height);
        void patchSelected({ shape, width: s, height: s });
      } else {
        void patchSelected({ shape });
      }
    },
    [selectedLocal, patchSelected]
  );

  return {
    handleGeometryCommit,
    patchSelected,
    handleDeleteSelected,
    applyPreset,
    applyShape,
  };
}
