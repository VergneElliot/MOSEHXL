import { useState } from 'react';
import { apiCore, printingApi } from '../../services/api';
import type { ClosurePreviewData } from './closurePreviewTotals';

interface PrintClosureActionsArgs {
  bulletinId: number | null;
  hasValidId: boolean;
  preview: ClosurePreviewData | null;
  email: string;
  setError: (message: string | null) => void;
  setSuccess: (message: string | null) => void;
  onClose: () => void;
  onPrintSuccess: (message: string) => void;
  onPrintError: (message: string) => void;
}

export interface PrintClosureBusy {
  printing: boolean;
  exporting: boolean;
  exportingPdf: boolean;
  exportingXlsx: boolean;
  exportingFlux103: boolean;
  emailing: boolean;
}

export interface PrintClosureActions {
  handlePrint: () => Promise<void>;
  handleExportJson: () => Promise<void>;
  handleExportPdf: () => Promise<void>;
  handleExportXlsx: () => Promise<void>;
  handleExportFlux103: () => Promise<void>;
  handleSendEmail: () => Promise<void>;
}

function downloadJson(payload: string, filename: string) {
  const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

export function usePrintClosureActions(
  args: PrintClosureActionsArgs
): [PrintClosureBusy, PrintClosureActions] {
  const { bulletinId, hasValidId, preview, email, setError, setSuccess, onClose, onPrintSuccess, onPrintError } = args;
  const [printing, setPrinting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);
  const [exportingFlux103, setExportingFlux103] = useState(false);
  const [emailing, setEmailing] = useState(false);

  const fail = (e: unknown, fallback: string) => {
    const message = e instanceof Error ? e.message : fallback;
    setError(message);
    onPrintError(message);
  };

  const runExport = async (
    setBusy: (busy: boolean) => void,
    exportFn: (id: number) => Promise<unknown>,
    successMessage: string,
    fallback: string
  ) => {
    if (!hasValidId || bulletinId == null) return;
    try {
      setBusy(true);
      setError(null);
      await exportFn(bulletinId);
      onPrintSuccess(successMessage);
    } catch (e) {
      fail(e, fallback);
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = async () => {
    if (!hasValidId || bulletinId == null) {
      setError('Identifiant de bulletin invalide.');
      return;
    }
    try {
      setPrinting(true);
      setError(null);
      await apiCore.request(`/printing/closure/${bulletinId}`, { method: 'POST' });
      onPrintSuccess('Impression du bulletin envoyée à la file avec succès.');
      onClose();
    } catch (e) {
      fail(e, 'Échec de la mise en file de l’impression');
    } finally {
      setPrinting(false);
    }
  };

  const handleExportJson = async () => {
    if (!preview) return;
    try {
      setExporting(true);
      downloadJson(JSON.stringify(preview, null, 2), `closure-bulletin-${preview.id}.json`);
      onPrintSuccess('Export du bulletin téléchargé (.json).');
    } catch {
      onPrintError('Échec de l’export du bulletin.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () =>
    runExport(setExportingPdf, printingApi.exportClosureBulletinPdf, 'Export PDF du bulletin téléchargé.', 'Échec export PDF');

  const handleExportXlsx = () =>
    runExport(setExportingXlsx, printingApi.exportClosureBulletinXlsx, 'Export Excel du récapitulatif téléchargé.', 'Échec export Excel');

  const handleExportFlux103 = () =>
    runExport(setExportingFlux103, printingApi.exportClosureBulletinFlux103, 'Export Flux 10.3 XML du bulletin téléchargé.', 'Échec export Flux 10.3');

  const handleSendEmail = async () => {
    if (!hasValidId || bulletinId == null) return;
    const recipients = email
      .split(/[,;\n]+/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (recipients.length === 0) {
      setError('Au moins une adresse email destinataire est requise.');
      return;
    }
    try {
      setEmailing(true);
      setError(null);
      setSuccess(null);
      const result = await printingApi.emailClosureBulletin(bulletinId, recipients);
      setSuccess(result.message);
      onPrintSuccess(result.message);
    } catch (e) {
      fail(e, 'Échec envoi email');
    } finally {
      setEmailing(false);
    }
  };

  return [
    { printing, exporting, exportingPdf, exportingXlsx, exportingFlux103, emailing },
    { handlePrint, handleExportJson, handleExportPdf, handleExportXlsx, handleExportFlux103, handleSendEmail },
  ];
}
