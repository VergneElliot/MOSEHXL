import { useCallback, useEffect, useState } from 'react';
import { DataService } from '../services/dataService';
import { KitchenPrinter } from '../types';
import type { KitchenPrinterFormInput } from '../services/api/kitchenPrinters';

export interface KitchenPrinterFormData {
  name: string;
  slug: string;
  connectionType: 'bridge' | 'network_escpos';
  host: string;
  port: string;
  bridgeTarget: string;
}

export const initialKitchenPrinterForm: KitchenPrinterFormData = {
  name: '',
  slug: '',
  connectionType: 'bridge',
  host: '',
  port: '9100',
  bridgeTarget: '',
};

function toFormInput(form: KitchenPrinterFormData): KitchenPrinterFormInput {
  if (form.connectionType === 'network_escpos') {
    return {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      connectionType: form.connectionType,
      connectionConfig: {
        host: form.host.trim(),
        port: parseInt(form.port, 10) || 9100,
      },
    };
  }

  return {
    name: form.name.trim(),
    slug: form.slug.trim() || undefined,
    connectionType: form.connectionType,
    connectionConfig: {
      bridgeTarget: form.bridgeTarget.trim() || form.slug.trim() || undefined,
    },
  };
}

export function useKitchenPrinters(
  showSuccess: (message: string) => void,
  showError: (message: string) => void
) {
  const dataService = DataService.getInstance();
  const [printers, setPrinters] = useState<KitchenPrinter[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPrinters = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await dataService.getKitchenPrinters();
      setPrinters(loaded);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      showError(`Erreur lors du chargement des imprimantes: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [dataService, showError]);

  useEffect(() => {
    void loadPrinters();
  }, [loadPrinters]);

  const createPrinter = useCallback(
    async (form: KitchenPrinterFormData) => {
      await dataService.createKitchenPrinter(toFormInput(form));
      showSuccess('Imprimante créée avec succès');
      await loadPrinters();
    },
    [dataService, loadPrinters, showSuccess]
  );

  const updatePrinter = useCallback(
    async (id: string, form: KitchenPrinterFormData) => {
      await dataService.updateKitchenPrinter(id, toFormInput(form));
      showSuccess('Imprimante mise à jour avec succès');
      await loadPrinters();
    },
    [dataService, loadPrinters, showSuccess]
  );

  const deletePrinter = useCallback(
    async (id: string) => {
      const result = await dataService.deleteKitchenPrinter(id);
      showSuccess(result.message || 'Imprimante supprimée');
      await loadPrinters();
    },
    [dataService, loadPrinters, showSuccess]
  );

  const testPrinter = useCallback(
    async (id: string) => {
      const result = await dataService.testKitchenPrinter(id);
      showSuccess(result.message || 'Ticket de test envoyé à la file d’impression');
    },
    [dataService, showSuccess]
  );

  return {
    printers,
    loading,
    loadPrinters,
    createPrinter,
    updatePrinter,
    deletePrinter,
    testPrinter,
  };
}

export function kitchenPrinterToForm(printer: KitchenPrinter): KitchenPrinterFormData {
  return {
    name: printer.name,
    slug: printer.slug,
    connectionType: printer.connectionType,
    host: printer.connectionConfig.host ?? '',
    port: String(printer.connectionConfig.port ?? 9100),
    bridgeTarget: printer.connectionConfig.bridgeTarget ?? printer.slug,
  };
}
