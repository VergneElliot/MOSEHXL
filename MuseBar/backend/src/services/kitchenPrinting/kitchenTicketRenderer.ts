import { ESC_POS } from '../printing/types';
import type { KitchenTicketLine } from './kitchenTicketTypes';

function normalizeThermalText(content: string): string {
  const replaced = content
    .replace(/€/g, 'EUR')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'AE')
    .replace(/ß/g, 'ss')
    .replace(/°/g, ' deg ')
    .replace(/\u00a0/g, ' ');

  const withoutDiacritics = replaced.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  return Array.from(withoutDiacritics)
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code <= 0x1f || (code >= 0x20 && code <= 0x7e)) {
        return char;
      }
      return '?';
    })
    .join('');
}

function formatTimestamp(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('fr-FR');
}

function formatOptionLine(option: KitchenTicketLine['options'][number]): string | null {
  const freeText = option.free_text?.trim();
  if (freeText) return `   ${freeText}`;
  const choice = option.choice_label?.trim();
  if (choice) return `   ${option.group_name}: ${choice}`;
  return null;
}

export function renderKitchenOrderTicket(input: {
  orderId: number;
  createdAt: Date | string;
  printerName: string;
  lines: KitchenTicketLine[];
}): string {
  const parts = [
    ESC_POS.INIT,
    ESC_POS.CENTER,
    ESC_POS.BOLD_ON,
    ESC_POS.DOUBLE_SIZE,
    `COMMANDE #${input.orderId}`,
    ESC_POS.NORMAL_SIZE,
    ESC_POS.BOLD_OFF,
    ESC_POS.LEFT,
    '',
    normalizeThermalText(input.printerName),
    normalizeThermalText(formatTimestamp(input.createdAt)),
    '================================',
    '',
  ];

  for (const line of input.lines) {
    parts.push(`${line.quantity}x ${normalizeThermalText(line.product_name)}`);
    for (const option of line.options) {
      const rendered = formatOptionLine(option);
      if (rendered) parts.push(normalizeThermalText(rendered));
    }
    parts.push('');
  }

  parts.push('--------------------------------', '', ESC_POS.PARTIAL_CUT);
  return parts.join('\n');
}
