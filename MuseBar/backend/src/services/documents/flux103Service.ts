/**
 * Flux 10.3 (B2C e-reporting) XML groundwork from closure bulletin aggregates.
 *
 * Semantic mapping follows DGFiP Spécifications externes v3.2 / Annexe 6
 * (TT-77..TT-88) as documented by Avalara / Sovos samples:
 *   CategoryCode TPS1 = taxable services (on-site bar default)
 *   Amounts HT + TVA by rate from closure vat_breakdown
 *
 * This is a read-only export for accountant mail / future PA (COMP-9).
 * Full XSD validation against the official package is a follow-up once the
 * vendor ZIP is filed under docs/legal/.
 */

import type { ClosureBulletinData } from '../printing/types';

export type Flux103CategoryCode = 'TPS1' | 'TLB1' | 'TNT1' | 'TMA1';

export type Flux103Options = {
  /** Default TPS1 (on-site services) for MuseBar-style venues. */
  categoryCode?: Flux103CategoryCode;
  /** UNTDID tax due date type; 3 = encaissements (common for bars). */
  taxDueDateTypeCode?: string;
};

function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return Number.isFinite(n) ? n : 0;
}

function round2(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Format as AAAAMMJJ */
export function formatFlux103Date(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date for Flux 10.3: ${String(isoOrDate)}`);
  }
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function formatAmount(amount: number): string {
  return round2(amount).toFixed(2);
}

function formatDateTimeCompact(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${day}${hh}${mm}${ss}`;
}

function sirenFromBusiness(data: ClosureBulletinData): string {
  const siret = String(data.business_info.siret ?? '').replace(/\D/g, '');
  if (siret.length >= 9) return siret.slice(0, 9);
  const vat = String(data.business_info.tax_identification ?? '').replace(/\D/g, '');
  if (vat.length >= 9) return vat.slice(-9);
  return '000000000';
}

type VatLine = { percent: number; taxableAmount: number; taxTotal: number };

function collectVatLines(data: ClosureBulletinData): VatLine[] {
  const lines: VatLine[] = [];
  const v10 = data.vat_breakdown?.vat_10;
  const v20 = data.vat_breakdown?.vat_20;

  if (v10) {
    const taxable = round2(toNumber(v10.amount));
    const tax = round2(toNumber(v10.vat));
    if (taxable !== 0 || tax !== 0) {
      lines.push({ percent: 10, taxableAmount: taxable, taxTotal: tax });
    }
  }
  if (v20) {
    const taxable = round2(toNumber(v20.amount));
    const tax = round2(toNumber(v20.vat));
    if (taxable !== 0 || tax !== 0) {
      lines.push({ percent: 20, taxableAmount: taxable, taxTotal: tax });
    }
  }

  if (lines.length === 0) {
    const totalTtc = round2(toNumber(data.total_amount));
    const totalVat = round2(toNumber(data.total_vat));
    const ht = round2(totalTtc - totalVat);
    lines.push({ percent: 20, taxableAmount: ht, taxTotal: totalVat });
  }

  return lines;
}

/**
 * Build a Flux 10.3–shaped Report XML for one closure bulletin (B2C aggregate).
 */
export function buildFlux103Xml(
  data: ClosureBulletinData,
  options: Flux103Options = {}
): string {
  const categoryCode = options.categoryCode ?? 'TPS1';
  const taxDueDateTypeCode = options.taxDueDateTypeCode ?? '3';
  const vatLines = collectVatLines(data);
  const taxExclusive = round2(vatLines.reduce((sum, line) => sum + line.taxableAmount, 0));
  const taxTotal = round2(vatLines.reduce((sum, line) => sum + line.taxTotal, 0));

  const startDate = formatFlux103Date(data.period_start);
  const endDate = formatFlux103Date(data.period_end);
  // Daily ticket-Z style: report the business day (period start). Multi-period
  // bulletins still emit one aggregate Transactions block dated on period end.
  const transactionsDate = data.closure_type === 'DAILY' ? startDate : endDate;

  const siren = sirenFromBusiness(data);
  const issuerName = escapeXml(data.business_info.name || 'Etablissement');
  const issuerEmail = escapeXml(data.business_info.email || 'noreply@mosehxl.com');
  const reportId = escapeXml(`MOSEHXL-CLOSURE-${data.id}-${transactionsDate}`);
  const reportName = escapeXml(
    `Bulletin ${data.closure_type} #${data.id} — Flux 10.3 B2C`
  );

  const subtotalsXml = vatLines
    .map(
      (line) => `			<TaxSubtotal>
				<TaxPercent>${line.percent}</TaxPercent>
				<TaxableAmount>${formatAmount(line.taxableAmount)}</TaxableAmount>
				<TaxTotal>${formatAmount(line.taxTotal)}</TaxTotal>
			</TaxSubtotal>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- MOSEHXL Flux 10.3 groundwork (DGFiP e-reporting B2C aggregates). Category default TPS1. -->
<Report xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<ReportDocument>
		<Id>${reportId}</Id>
		<Name>${reportName}</Name>
		<IssueDateTime>
			<DateTimeString>${formatDateTimeCompact()}</DateTimeString>
		</IssueDateTime>
		<TypeCode>IN</TypeCode>
		<Issuer>
			<Id schemeId="0002">${siren}</Id>
			<Name>${issuerName}</Name>
			<RoleCode>SE</RoleCode>
			<URIUniversalCommunication>
				<URIID>${issuerEmail}</URIID>
			</URIUniversalCommunication>
		</Issuer>
	</ReportDocument>
	<TransactionsReport>
		<ReportPeriod>
			<StartDate>${startDate}</StartDate>
			<EndDate>${endDate}</EndDate>
		</ReportPeriod>
		<Transactions>
			<Date>${transactionsDate}</Date>
			<TransactionsCurrency>EUR</TransactionsCurrency>
			<TaxDueDateTypeCode>${escapeXml(taxDueDateTypeCode)}</TaxDueDateTypeCode>
			<CategoryCode>${categoryCode}</CategoryCode>
			<TaxExclusiveAmount>${formatAmount(taxExclusive)}</TaxExclusiveAmount>
			<TaxTotal>${formatAmount(taxTotal)}</TaxTotal>
			<TransactionsCount>${Math.max(0, Math.trunc(toNumber(data.total_transactions)))}</TransactionsCount>
${subtotalsXml}
		</Transactions>
	</TransactionsReport>
</Report>
`;
}

export function buildFlux103Filename(data: ClosureBulletinData): string {
  const day = formatFlux103Date(data.period_start);
  return `flux103-closure-${data.id}-${day}.xml`;
}

export function buildFlux103Attachment(
  data: ClosureBulletinData,
  options?: Flux103Options
): { buffer: Buffer; filename: string; contentType: string } {
  const xml = buildFlux103Xml(data, options);
  return {
    buffer: Buffer.from(xml, 'utf8'),
    filename: buildFlux103Filename(data),
    contentType: 'application/xml',
  };
}
