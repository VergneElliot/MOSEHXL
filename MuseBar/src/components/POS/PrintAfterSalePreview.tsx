import React from 'react';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import LegalReceiptContainer from '../Legal/LegalReceipt/LegalReceiptContainer';
import type { InvoiceLegalInfo, Order as LegalReceiptOrder } from '../Legal/LegalReceipt/types';
import type { BusinessInfo } from './printAfterSalePreview';

interface PrintAfterSalePreviewProps {
  loading: boolean;
  error: string | null;
  emailSuccess: string | null;
  preview: LegalReceiptOrder | null;
  businessInfo: BusinessInfo | null;
  receiptType: 'detailed' | 'summary';
  documentKind: 'invoice' | 'ticket';
  lastInvoiceNumber: string | null;
  invoiceLegalInfo?: InvoiceLegalInfo;
}

const PrintAfterSalePreview: React.FC<PrintAfterSalePreviewProps> = ({
  loading,
  error,
  emailSuccess,
  preview,
  businessInfo,
  receiptType,
  documentKind,
  lastInvoiceNumber,
  invoiceLegalInfo,
}) => (
  <Box sx={{ flex: 2 }}>
    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
      Aperçu
    </Typography>
    {loading && (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )}
    {error && <Alert severity="error">{error}</Alert>}
    {emailSuccess && <Alert severity="success">{emailSuccess}</Alert>}
    {!loading && preview && businessInfo && (
      <LegalReceiptContainer
        order={preview}
        businessInfo={{
          name: businessInfo.name,
          address: businessInfo.address,
          phone: businessInfo.phone,
          email: businessInfo.email,
          siret: businessInfo.siret ?? '',
          taxIdentification: businessInfo.taxIdentification ?? '',
        }}
        receiptType={receiptType}
        documentKind={documentKind}
        documentNumber={documentKind === 'invoice' ? lastInvoiceNumber ?? undefined : undefined}
        invoiceLegalInfo={invoiceLegalInfo}
      />
    )}
  </Box>
);

export default PrintAfterSalePreview;
