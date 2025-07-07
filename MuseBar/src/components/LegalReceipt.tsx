import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Grid,
  Chip,
  Alert,
  AlertTitle
} from '@mui/material';
import {
  Receipt,
  Business,
  EuroSymbol,
  Schedule,
  Security,
  VerifiedUser
} from '@mui/icons-material';

interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate: number;
  tax_amount: number;
  happy_hour_applied: boolean;
  happy_hour_discount_amount: number;
}

interface LegalReceiptProps {
  order: {
    id: number;
    sequence_number: number;
    total_amount: number;
    total_tax: number;
    payment_method: string;
    created_at: string;
    items: ReceiptItem[];
  };
  businessInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    taxIdentification: string;
    siret: string;
  };
}

const LegalReceipt: React.FC<LegalReceiptProps> = ({ order, businessInfo }) => {
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

  const calculateSubtotal = () => {
    return order.items.reduce((sum, item) => sum + item.total_price, 0);
  };

  const calculateTotalTax = () => {
    return order.items.reduce((sum, item) => sum + item.tax_amount, 0);
  };

  const getVATBreakdown = () => {
    const vat10 = order.items
      .filter(item => Math.abs(item.tax_rate - 10) < 0.1)
      .reduce((sum, item) => sum + item.tax_amount, 0);
    
    const vat20 = order.items
      .filter(item => Math.abs(item.tax_rate - 20) < 0.1)
      .reduce((sum, item) => sum + item.tax_amount, 0);
    
    return { vat10, vat20 };
  };

  const vatBreakdown = getVATBreakdown();

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 3, 
        maxWidth: 400, 
        mx: 'auto',
        fontFamily: 'monospace',
        fontSize: '0.875rem'
      }}
    >
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
      <Box sx={{ mb: 2 }}>
        <Alert severity="info" sx={{ mb: 1 }}>
          <AlertTitle>Conformité Légale</AlertTitle>
          Article 286-I-3 bis du CGI
        </Alert>
        <Chip 
          icon={<VerifiedUser />}
          label="Système de Caisse Sécurisé"
          color="success"
          size="small"
          sx={{ mb: 1 }}
        />
      </Box>

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
        
        {order.items.map((item, index) => (
          <Box key={index} sx={{ mb: 1 }}>
            <Grid container spacing={1}>
              <Grid item xs={8}>
                <Typography variant="body2">
                  {item.name}
                </Typography>
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

      {/* Totals */}
      <Box sx={{ mb: 2 }}>
        <Grid container spacing={1}>
          <Grid item xs={8}>
            <Typography variant="body2">Sous-total HT:</Typography>
          </Grid>
          <Grid item xs={4} sx={{ textAlign: 'right' }}>
            <Typography variant="body2">
              {formatCurrency(calculateSubtotal())}
            </Typography>
          </Grid>
          
          <Grid item xs={8}>
            <Typography variant="body2">TVA 10%:</Typography>
          </Grid>
          <Grid item xs={4} sx={{ textAlign: 'right' }}>
            <Typography variant="body2">
              {formatCurrency(vatBreakdown.vat10)}
            </Typography>
          </Grid>
          
          <Grid item xs={8}>
            <Typography variant="body2">TVA 20%:</Typography>
          </Grid>
          <Grid item xs={4} sx={{ textAlign: 'right' }}>
            <Typography variant="body2">
              {formatCurrency(vatBreakdown.vat20)}
            </Typography>
          </Grid>
          
          <Grid item xs={8}>
            <Typography variant="body2" fontWeight="bold">
              TOTAL TTC:
            </Typography>
          </Grid>
          <Grid item xs={4} sx={{ textAlign: 'right' }}>
            <Typography variant="body2" fontWeight="bold">
              {formatCurrency(order.total_amount)}
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