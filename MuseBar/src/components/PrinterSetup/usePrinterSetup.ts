import { useCallback, useEffect, useState } from 'react';
import {
  fetchActivePrintingConfiguration,
  fetchPrinters,
  requestTestPrint,
  savePrintingConfiguration,
} from './printerSetupApi';
import {
  findMissingRequiredField,
  type Printer,
  type PrinterConfigValues,
  type PrintingConfig,
} from './printerSetupProviders';

export interface PrinterSetupState {
  activeStep: number;
  selectedProvider: string;
  config: PrinterConfigValues;
  loading: boolean;
  error: string | null;
  success: string | null;
  printers: Printer[];
  testPrintLoading: boolean;
  currentConfig: PrintingConfig | null;
}

export interface PrinterSetupActions {
  setActiveStep: (step: number) => void;
  selectProvider: (provider: string) => void;
  changeConfigField: (field: string, value: unknown) => void;
  testConfiguration: () => Promise<void>;
  saveConfiguration: () => Promise<void>;
}

export function usePrinterSetup(onClose?: () => void): [PrinterSetupState, PrinterSetupActions] {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState<string>('bridge');
  const [config, setConfig] = useState<PrinterConfigValues>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [testPrintLoading, setTestPrintLoading] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<PrintingConfig | null>(null);

  useEffect(() => {
    fetchActivePrintingConfiguration()
      .then((active) => {
        if (!active) return;
        setCurrentConfig(active);
        setSelectedProvider(active.provider);
        setConfig(active.config);
      })
      .catch(() => {
        // Non-blocking: setup UI remains usable with default state.
      });
  }, []);

  const selectProvider = useCallback((provider: string) => {
    setSelectedProvider(provider);
    setConfig({});
    setError(null);
    setSuccess(null);
  }, []);

  const changeConfigField = useCallback((field: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  }, []);

  const validateConfiguration = useCallback(() => {
    const missing = findMissingRequiredField(selectedProvider, config);
    if (missing) {
      setError(`${missing} is required`);
      return false;
    }
    return true;
  }, [selectedProvider, config]);

  const applySaved = useCallback((saved: PrintingConfig | null) => {
    if (!saved) return;
    setCurrentConfig(saved);
    setConfig(saved.config);
  }, []);

  const loadPrinters = useCallback(async () => {
    try {
      const list = await fetchPrinters();
      if (list) setPrinters(list);
    } catch {
      // Non-blocking: printer list is optional in setup wizard.
    }
  }, []);

  const testConfiguration = useCallback(async () => {
    if (!validateConfiguration()) return;
    setTestPrintLoading(true);
    setError(null);
    try {
      applySaved(await savePrintingConfiguration(selectedProvider, config));
      const result = await requestTestPrint();
      if (result.success) {
        setSuccess(
          selectedProvider === 'bridge'
            ? `Test print queued for MuseBar Bridge${result.printJobId ? ` (${result.printJobId})` : ''}. Start the local bridge to print it.`
            : 'Test print successful!'
        );
        void loadPrinters();
      } else {
        setError(result.message || 'Test print failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Test failed');
    } finally {
      setTestPrintLoading(false);
    }
  }, [validateConfiguration, applySaved, selectedProvider, config, loadPrinters]);

  const saveConfiguration = useCallback(async () => {
    if (!validateConfiguration()) return;
    setLoading(true);
    setError(null);
    try {
      applySaved(await savePrintingConfiguration(selectedProvider, config));
      setSuccess('Configuration saved successfully!');
      setActiveStep(3);
      if (onClose) {
        setTimeout(onClose, 2000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  }, [validateConfiguration, applySaved, selectedProvider, config, onClose]);

  return [
    {
      activeStep,
      selectedProvider,
      config,
      loading,
      error,
      success,
      printers,
      testPrintLoading,
      currentConfig,
    },
    { setActiveStep, selectProvider, changeConfigField, testConfiguration, saveConfiguration },
  ];
}
