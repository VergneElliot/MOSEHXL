/**
 * Split Payment Component
 * Handles split payment functionality for multiple payers
 */

import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  Grid,
} from '@mui/material';
import {
  Group as GroupIcon,
  Calculate as CalculateIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { SplitPaymentProps } from './types';

/**
 * Split Payment Component
 */
export const SplitPayment: React.FC<SplitPaymentProps> = ({
  orderTotal,
  currentOrder,
  splitType,
  splitCount,
  subBills,
  onSplitTypeChange,
  onSplitCountChange,
  onSubBillsChange,
  onInitialize,
  loading,
  onConfirm,
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const totalSplit = subBills.reduce((sum, bill) => sum + bill.total, 0);
  const isValidSplit = Math.abs(totalSplit - orderTotal) < 0.01;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <GroupIcon />
        Paiement partagé
      </Typography>

      {/* Split Configuration */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Type de partage
        </Typography>
        
        <RadioGroup
          value={splitType}
          onChange={(e) => onSplitTypeChange(e.target.value as 'equal' | 'custom')}
        >
          <FormControlLabel
            value="equal"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body1">Partage égal</Typography>
                <Typography variant="caption" color="text.secondary">
                  Divise la commande en parts égales
                </Typography>
              </Box>
            }
          />
          <FormControlLabel
            value="custom"
            control={<Radio />}
            label={
              <Box>
                <Typography variant="body1">Partage personnalisé</Typography>
                <Typography variant="caption" color="text.secondary">
                  Configure manuellement chaque paiement
                </Typography>
              </Box>
            }
          />
        </RadioGroup>
      </Box>

      {/* Number of Splits */}
      <Box sx={{ mb: 3 }}>
        <TextField
          label="Nombre de paiements"
          type="number"
          value={splitCount}
          onChange={(e) => onSplitCountChange(parseInt(e.target.value) || 2)}
          inputProps={{ min: 2, max: 10 }}
          sx={{ maxWidth: 200 }}
          helperText="Entre 2 et 10 paiements"
        />
        
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={onInitialize}
          sx={{ ml: 2, mt: 2 }}
        >
          Initialiser
        </Button>
      </Box>

      {/* Split Summary */}
      {subBills.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalculateIcon />
            Détails des paiements
          </Typography>
          
          <List>
            {subBills.map((bill, index) => (
              <ListItem 
                key={bill.id} 
                sx={{ 
                  bgcolor: 'grey.50', 
                  mb: 1, 
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'grey.300',
                }}
              >
                <ListItemText
                  primary={`Paiement ${index + 1}`}
                  secondary={
                    <Box>
                      <Typography variant="body2">
                        Montant: {formatCurrency(bill.total)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Mode: {bill.payments[0]?.method === 'card' ? 'Carte' : 'Espèces'}
                      </Typography>
                      {splitType === 'equal' && (
                        <Typography variant="body2" color="textSecondary">
                          Articles: {bill.items.length}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <Chip 
                  label={bill.payments.length > 0 ? 'Configuré' : 'En attente'} 
                  color={bill.payments.length > 0 ? 'success' : 'default'}
                  size="small"
                />
              </ListItem>
            ))}
          </List>

          {/* Split Validation */}
          <Box sx={{ mt: 2, p: 2, bgcolor: isValidSplit ? 'success.light' : 'error.light', borderRadius: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Total partagé:</strong> {formatCurrency(totalSplit)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Montant commande:</strong> {formatCurrency(orderTotal)}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography 
                  variant="body2" 
                  color={isValidSplit ? 'success.main' : 'error.main'}
                  fontWeight="bold"
                >
                  <strong>Différence:</strong> {formatCurrency(Math.abs(totalSplit - orderTotal))}
                  {isValidSplit ? ' ✓ Valide' : ' ✗ Invalide'}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </Box>
      )}

      {/* Validation Messages */}
      {subBills.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Cliquez sur "Initialiser" pour configurer les paiements partagés.
          </Typography>
        </Alert>
      )}

      {subBills.length > 0 && !isValidSplit && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Erreur:</strong> Le total des paiements partagés ne correspond pas au montant de la commande.
            <br />
            Veuillez ajuster les montants ou réinitialiser le partage.
          </Typography>
        </Alert>
      )}

      {subBills.length > 0 && isValidSplit && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Partage validé:</strong> Les paiements sont correctement configurés.
            <br />
            Vous pouvez confirmer le paiement partagé.
          </Typography>
        </Alert>
      )}

      {/* Confirm Button */}
      {subBills.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="contained"
            onClick={onConfirm}
            disabled={!isValidSplit || loading}
            size="large"
          >
            {loading ? 'Traitement...' : 'Confirmer le paiement partagé'}
          </Button>
        </Box>
      )}

      {/* Information */}
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Paiement partagé:
        </Typography>
        <Typography variant="body2">
          • Divise la commande entre plusieurs payeurs<br />
          • Chaque paiement peut utiliser une méthode différente<br />
          • Le total de tous les paiements doit égaler le montant de la commande<br />
          • Utile pour les groupes et les repas d'affaires
        </Typography>
      </Alert>
    </Box>
  );
};

export default SplitPayment;

