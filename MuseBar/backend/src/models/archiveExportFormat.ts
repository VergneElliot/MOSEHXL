import PDFDocument from 'pdfkit';
import { getRegisterIdForEstablishment } from '../utils/registerId';

export function convertArchiveToXML(data: {
  export_type?: string;
  compliance_info?: { legal_reference?: string; export_timestamp?: string; register_id?: string };
  closure_data?: { total_transactions: number; total_amount: number; total_vat: number; period_start: string; period_end: string };
  period?: { start: string; end: string };
  summary?: { total_transactions: number; total_amount: number; total_vat: number };
}): string {
  const xmlDeclaration = '<?xml version="1.0" encoding="UTF-8"?>';
  const rootElement = '<musebar_export>';
  const closingRoot = '</musebar_export>';
  
  let xmlContent = xmlDeclaration + '\n' + rootElement + '\n';
  
  // Add compliance header
  xmlContent += '  <compliance_info>\n';
  xmlContent += `    <legal_reference>${data.compliance_info?.legal_reference || 'Article 286-I-3 bis du CGI'}</legal_reference>\n`;
  xmlContent += `    <export_timestamp>${data.compliance_info?.export_timestamp || new Date().toISOString()}</export_timestamp>\n`;
  xmlContent += `    <register_id>${data.compliance_info?.register_id || getRegisterIdForEstablishment()}</register_id>\n`;
  xmlContent += '  </compliance_info>\n';
  
  // Add export data
  if (data.export_type === 'DAILY' && data.closure_data) {
    xmlContent += '  <daily_closure>\n';
    xmlContent += `    <total_transactions>${data.closure_data.total_transactions}</total_transactions>\n`;
    xmlContent += `    <total_amount>${data.closure_data.total_amount}</total_amount>\n`;
    xmlContent += `    <total_vat>${data.closure_data.total_vat}</total_vat>\n`;
    xmlContent += `    <period_start>${data.closure_data.period_start}</period_start>\n`;
    xmlContent += `    <period_end>${data.closure_data.period_end}</period_end>\n`;
    xmlContent += '  </daily_closure>\n';
  }
  
  xmlContent += closingRoot;
  return xmlContent;
}

export function convertArchiveToCSV(data: {
  export_type?: string;
  compliance_info?: { export_timestamp?: string };
  closure_data?: { total_transactions: number; total_amount: number; total_vat: number; period_start: string; period_end: string };
  period?: { start: string; end: string };
  summary?: { total_transactions: number; total_amount: number; total_vat: number };
}): string {
  let csvContent = 'Export Type,Period Start,Period End,Total Transactions,Total Amount,Total VAT,Export Timestamp\n';
  
  const exportTimestamp = data.compliance_info?.export_timestamp || new Date().toISOString();
  if (data.export_type === 'DAILY' && data.closure_data) {
    csvContent += `${data.export_type},${data.closure_data.period_start},${data.closure_data.period_end},${data.closure_data.total_transactions},${data.closure_data.total_amount},${data.closure_data.total_vat},${exportTimestamp}\n`;
  } else if (data.export_type === 'MONTHLY') {
    csvContent += `${data.export_type},${data.period?.start ?? ''},${data.period?.end ?? ''},${data.summary?.total_transactions ?? ''},${data.summary?.total_amount ?? ''},${data.summary?.total_vat ?? ''},${exportTimestamp}\n`;
  } else if (data.export_type === 'ANNUAL') {
    csvContent += `${data.export_type},${data.period?.start ?? ''},${data.period?.end ?? ''},${data.summary?.total_transactions ?? ''},${data.summary?.total_amount ?? ''},${data.summary?.total_vat ?? ''},${exportTimestamp}\n`;
  }
  
  return csvContent;
}

/** Generate a real PDF binary for legal archive exports. */
export async function convertArchiveToPDF(data: Record<string, unknown>): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 48,
      info: {
        Title: `MuseBar ${String(data.export_type ?? 'UNKNOWN')} archive export`,
        Author: 'MuseBar',
        Subject: 'Fiscal legal archive export',
        Creator: 'MOSEHXL backend',
      },
    });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    const compliance = data.compliance_info && typeof data.compliance_info === 'object'
      ? data.compliance_info as Record<string, unknown>
      : null;
    const period = data.period && typeof data.period === 'object'
      ? data.period as Record<string, unknown>
      : null;

    doc.fontSize(18).text('MuseBar Legal Archive Export', { align: 'center' });
    doc.moveDown(0.7);
    doc.fontSize(12).text(`Export type: ${String(data.export_type ?? 'UNKNOWN')}`);
    doc.text(`Generated at: ${String(compliance?.export_timestamp ?? new Date().toISOString())}`);
    doc.text(`Legal reference: ${String(compliance?.legal_reference ?? 'Article 286-I-3 bis du CGI')}`);
    if (period?.start && period?.end) {
      doc.text(`Period: ${String(period.start)} -> ${String(period.end)}`);
    }

    doc.moveDown();
    doc.fontSize(11).text('Serialized payload', { underline: true });
    doc.moveDown(0.4);
    doc.font('Courier').fontSize(8);

    const serialized = JSON.stringify(data, null, 2);
    for (const line of serialized.split('\n')) {
      doc.text(line, {
        width: 500,
      });
    }

    doc.end();
  });
}
