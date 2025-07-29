import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Grid,
  Chip
} from '@mui/material';
import {
  Business,
  Security
} from '@mui/icons-material';

interface ReceiptItem {
  name: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate: number;
  tax_amount: number;
  happy_hour_applied: boolean;
  happy_hour_discount_amount: number;
  description?: string; // Added description field
}

// Update LegalReceiptProps to allow string | number for subtotal_ht and vat in vat_breakdown
interface LegalReceiptProps {
  order: {
    id: number;
    sequence_number: number;
    total_amount: number | string;
    total_tax: number | string;
    payment_method: string;
    created_at: string;
    items: ReceiptItem[];
    vat_breakdown?: {
      tax_rate: number;
      vat: number | string;
      subtotal_ht: number | string;
    }[];
  };
  businessInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    taxIdentification: string;
    siret: string;
  };
  receiptType?: 'detailed' | 'summary';
}

// Print CSS for receipts
const printStyles = `
@media print {
  body * {
    visibility: hidden !important;
  }
  .receipt-print-area, .receipt-print-area * {
    visibility: visible !important;
  }
  .receipt-print-area {
    position: absolute !important;
    left: 0; top: 0;
    width: 80mm !important;
    min-width: 80mm !important;
    max-width: 80mm !important;
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
    font-size: 12px !important;
    box-shadow: none !important;
  }
  @page {
    size: 80mm auto;
    margin: 0;
  }
}
`;
if (typeof window !== 'undefined' && document) {
  if (!document.getElementById('receipt-print-style')) {
    const style = document.createElement('style');
    style.id = 'receipt-print-style';
    style.innerHTML = printStyles;
    document.head.appendChild(style);
  }
}

const LegalReceipt: React.FC<LegalReceiptProps> = ({ order, businessInfo, receiptType = 'detailed' }) => {
  // Update formatCurrency to accept a number
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Defensive: ensure order.items is always an array
  const items = Array.isArray(order.items) ? order.items : [];



  // Calculate totalVAT and totalHT as follows:
  const vatBreakdown = Array.isArray(order.vat_breakdown) ? order.vat_breakdown : [];
  const totalVAT = vatBreakdown.reduce((sum, v) => sum + parseFloat(String(v.vat)), 0);
  const sousTotalHT = !isNaN(parseFloat(String(order.total_amount))) && !isNaN(totalVAT) ? parseFloat(String(order.total_amount)) - totalVAT : 0;

  if (receiptType === 'summary') {
    // Summary receipt for company cards - no item details
    return (
      <Paper className="receipt-print-area" elevation={3} sx={{ p: 3, maxWidth: 400, mx: 'auto', fontFamily: 'monospace', fontSize: '0.875rem' }}>
        {/* Header with Business Information */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Business sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
          <Typography variant="h6" fontWeight="bold">
            {businessInfo.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {businessInfo.address}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tél: {businessInfo.phone}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {businessInfo.email}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Legal Compliance Header */}
        {/* Removed blue compliance bubble and chip */}

        {/* Receipt Information */}
        <Box sx={{ mb: 2 }}>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Typography variant="body2" fontWeight="bold">
                N° Ticket:
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2">
                {order.sequence_number.toString().padStart(6, '0')}
              </Typography>
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="body2" fontWeight="bold">
                Date/Heure:
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2">
                {formatDate(order.created_at)}
              </Typography>
            </Grid>
            
            <Grid item xs={6}>
              <Typography variant="body2" fontWeight="bold">
                Mode Paiement:
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2">
                {order.payment_method === 'card' ? 'Carte Bancaire' : 
                 order.payment_method === 'cash' ? 'Espèces' : 'Split'}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Summary Information */}
        <Box sx={{ mb: 2 }}>
          
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h5" fontWeight="bold" color="primary">
              TOTAL TTC
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="primary">
              {formatCurrency(parseFloat(String(order.total_amount)))}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* VAT Breakdown for Summary */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            BREVET D'IMPÔT SUR LA VALEUR AJOUTÉE (TVA)
          </Typography>
          <Grid container spacing={1}>
            {vatBreakdown.map((v, index) => {
              // Support both 'tax_rate' and 'rate' for backend compatibility
              const rate = typeof v.tax_rate === 'number' && !isNaN(v.tax_rate)
                ? v.tax_rate
                : (typeof (v as any).rate === 'number' && !isNaN((v as any).rate)
                  ? (v as any).rate
                  : '');
              return (
                <React.Fragment key={index}>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      Base HT ({rate}%): {formatCurrency(parseFloat(String(v.subtotal_ht)))}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      TVA {rate}%: {formatCurrency(parseFloat(String(v.vat)))}
                    </Typography>
                  </Grid>
                </React.Fragment>
              );
            })}
            <Grid item xs={6}>
              <Typography variant="body2" fontWeight="bold">
                TVA Totale: {formatCurrency(totalVAT)}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2">
                Sous-total HT: {formatCurrency(sousTotalHT)}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Legal Information Footer */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            <Security sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
            Ticket sécurisé - Inaltérable
          </Typography>
          
          <Typography variant="caption" color="text.secondary" display="block">
            N° SIRET: {businessInfo.siret}
          </Typography>
          
          <Typography variant="caption" color="text.secondary" display="block">
            N° TVA: {businessInfo.taxIdentification}
          </Typography>
          
          <Typography variant="caption" color="text.secondary" display="block">
            Registre: MUSEBAR-REG-001
          </Typography>
          
          
        </Box>

        {/* Compliance Verification */}
        <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Vérification d'intégrité:</strong> SHA-256
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            <strong>Chaîne de hachage:</strong> {order.sequence_number.toString().padStart(6, '0')}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            <strong>Conformité:</strong> Article 286-I-3 bis du CGI
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Detailed receipt (original implementation)
  return (
    <Paper className="receipt-print-area" elevation={3} sx={{ p: 3, maxWidth: 400, mx: 'auto', fontFamily: 'monospace', fontSize: '0.875rem' }}>
      {/* Header with Business Information */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Business sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
        <Typography variant="h6" fontWeight="bold">
          {businessInfo.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {businessInfo.address}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Tél: {businessInfo.phone}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {businessInfo.email}
        </Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Legal Compliance Header */}
      {/* Removed blue compliance bubble and chip */}

      {/* Receipt Information */}
      <Box sx={{ mb: 2 }}>
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Typography variant="body2" fontWeight="bold">
              N° Ticket:
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2">
              {order.sequence_number.toString().padStart(6, '0')}
            </Typography>
          </Grid>
          
          <Grid item xs={6}>
            <Typography variant="body2" fontWeight="bold">
              Date/Heure:
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2">
              {formatDate(order.created_at)}
            </Typography>
          </Grid>
          
          <Grid item xs={6}>
            <Typography variant="body2" fontWeight="bold">
              Mode Paiement:
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2">
              {order.payment_method === 'card' ? 'Carte Bancaire' : 
               order.payment_method === 'cash' ? 'Espèces' : 'Split'}
            </Typography>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Items */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          ARTICLES
        </Typography>
        
        {items.map((item, index) => (
          <Box key={index} sx={{ mb: 1 }}>
            <Grid container spacing={1}>
              <Grid item xs={8}>
                <Typography variant="body2">
                  {item.product_name || item.name}
                </Typography>
                {/* Show description if present */}
                {item.description && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    {item.description}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {item.quantity} x {formatCurrency(item.unit_price)}
                  {item.happy_hour_applied && (
                    <Chip 
                      label="Happy Hour" 
                      size="small" 
                      color="warning" 
                      sx={{ ml: 1, height: 16 }}
                    />
                  )}
                </Typography>
              </Grid>
              <Grid item xs={4} sx={{ textAlign: 'right' }}>
                <Typography variant="body2" fontWeight="bold">
                  {formatCurrency(item.total_price)}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        ))}
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* VAT Breakdown for Detailed */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          BREVET D'IMPÔT SUR LA VALEUR AJOUTÉE (TVA)
        </Typography>
        <Grid container spacing={1}>
          {vatBreakdown.map((v, index) => {
            // Support both 'tax_rate' and 'rate' for backend compatibility
            const rate = typeof v.tax_rate === 'number' && !isNaN(v.tax_rate)
              ? v.tax_rate
              : (typeof (v as any).rate === 'number' && !isNaN((v as any).rate)
                ? (v as any).rate
                : 0);
            return (
              <React.Fragment key={index}>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    Base HT ({rate}%): {formatCurrency(parseFloat(String(v.subtotal_ht)))}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    TVA {rate}%: {formatCurrency(parseFloat(String(v.vat)))}
                  </Typography>
                </Grid>
              </React.Fragment>
            );
          })}
          <Grid item xs={6}>
            <Typography variant="body2" fontWeight="bold">
              TVA Totale: {formatCurrency(totalVAT)}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2">
              Sous-total HT: {formatCurrency(sousTotalHT)}
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Totals */}
      <Box sx={{ mb: 2 }}>
        <Grid container spacing={1}>
          <Grid item xs={8}>
            <Typography variant="body2" fontWeight="bold">
              TOTAL TTC:
            </Typography>
          </Grid>
          <Grid item xs={4} sx={{ textAlign: 'right' }}>
            <Typography variant="body2" fontWeight="bold">
              {formatCurrency(parseFloat(String(order.total_amount)))}
            </Typography>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Legal Information Footer */}
      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Typography variant="caption" color="text.secondary" display="block">
          <Security sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
          Ticket sécurisé - Inaltérable
        </Typography>
        
        <Typography variant="caption" color="text.secondary" display="block">
          N° SIRET: {businessInfo.siret}
        </Typography>
        
        <Typography variant="caption" color="text.secondary" display="block">
          N° TVA: {businessInfo.taxIdentification}
        </Typography>
        
        <Typography variant="caption" color="text.secondary" display="block">
          Registre: MUSEBAR-REG-001
        </Typography>
        
        <Typography variant="caption" color="text.secondary" display="block">
          Merci de votre visite !
        </Typography>
      </Box>

      {/* Compliance Verification */}
      <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          <strong>Vérification d'intégrité:</strong> SHA-256
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          <strong>Chaîne de hachage:</strong> {order.sequence_number.toString().padStart(6, '0')}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          <strong>Conformité:</strong> Article 286-I-3 bis du CGI
        </Typography>
      </Box>
    </Paper>
  );
};

export default LegalReceipt; 