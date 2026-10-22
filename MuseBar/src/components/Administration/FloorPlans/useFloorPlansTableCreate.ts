import { useCallback, type Dispatch, type SetStateAction } from 'react';
import * as floorApi from '../../../services/api/floor';
import type { FloorCanvasTable } from '../../floor/FloorCanvasView';
import {
  SIZE_PRESETS,
  clampTableRect,
  gridPlacement,
  nextTableLabel,
  normalizeTableGeometry,
} from '../../floor/floorGeometry';

/** Labels are unique across the whole establishment, not only this plan. */
async function loadEstablishmentLabels(): Promise<string[]> {
  const all = await floorApi.listDiningTables();
  return all.map((t) => t.label);
}

export function useFloorPlansTableCreate(input: {
  selectedPlanId: number | null;
  tables: floorApi.DiningTableDto[];
  selectedTable: floorApi.DiningTableDto | null;
  selectedLocal: FloorCanvasTable | null;
  bulkCount: string;
  setSelectedTableId: Dispatch<SetStateAction<number | null>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setSaving: Dispatch<SetStateAction<boolean>>;
  reloadTables: (planId: number) => Promise<void>;
}) {
  const {
    selectedPlanId,
    tables,
    selectedTable,
    selectedLocal,
    bulkCount,
    setSelectedTableId,
    setError,
    setSaving,
    reloadTables,
  } = input;

  const syncAfterTableChange = useCallback(
    async (planId: number, keepId?: number) => {
      await reloadTables(planId);
      if (keepId != null) setSelectedTableId(keepId);
    },
    [reloadTables, setSelectedTableId]
  );

  const handleAddTable = useCallback(async () => {
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
  }, [selectedPlanId, tables.length, setSaving, setError, syncAfterTableChange]);

  const handleAddBulk = useCallback(async () => {
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
  }, [selectedPlanId, tables.length, bulkCount, setSaving, setError, syncAfterTableChange]);

  const handleDuplicateSelected = useCallback(async () => {
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
  }, [
    selectedTable,
    selectedLocal,
    selectedPlanId,
    tables.length,
    setSaving,
    setError,
    syncAfterTableChange,
  ]);

  return { handleAddTable, handleAddBulk, handleDuplicateSelected };
}
