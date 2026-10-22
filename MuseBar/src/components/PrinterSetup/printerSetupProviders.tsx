import React from 'react';
import { Cloud as CloudIcon } from '@mui/icons-material';

export interface Printer {
  id: string;
  name: string;
  description?: string;
  capabilities?: string[];
  isDefault?: boolean;
  status?: string;
  provider?: string;
}

export interface PrintingConfig {
  provider: string;
  config: Record<string, unknown>;
  is_active: boolean;
  bridge_env?: string | null;
  bridge_poll_url?: string | null;
  bridge_key_header?: string | null;
}

export interface ProviderField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  default?: string | number;
}

export interface ProviderInfo {
  name: string;
  icon: React.ReactElement;
  description: string;
  fields: ProviderField[];
}

export type PrinterConfigValues = Record<string, unknown>;

export const providerInfo: Record<string, ProviderInfo> = {
  bridge: {
    name: 'MuseBar Bridge',
    icon: <CloudIcon />,
    description:
      'Recommended for cloud production: a small local bridge polls MuseBar Cloud and prints to your local Epson TM-m30II over the bar network.',
    fields: [
      { name: 'printerLabel', label: 'Printer display name (optional)', type: 'text', required: false },
    ],
  },
  'epson-server-direct': {
    name: 'Epson Server Direct Print',
    icon: <CloudIcon />,
    description:
      'TM-Intelligent Epson printers poll your MuseBar cloud URL for ePOS-Print jobs. Configure poll URL + x-epson-poll-key header in TMNet WebConfig.',
    fields: [{ name: 'printerLabel', label: 'Printer display name (optional)', type: 'text', required: false }],
  },
};

export function getProviderInfo(provider: string): ProviderInfo | undefined {
  return providerInfo[provider as keyof typeof providerInfo];
}

/** Returns the label of the first missing required field, or null when the config is complete. */
export function findMissingRequiredField(
  provider: string,
  config: PrinterConfigValues
): string | null {
  const info = getProviderInfo(provider);
  if (!info) return null;
  for (const field of info.fields) {
    if (field.required && !config[field.name]) return field.label;
  }
  return null;
}
