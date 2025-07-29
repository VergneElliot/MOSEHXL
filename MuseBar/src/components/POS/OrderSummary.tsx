import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  IconButton,
  Divider,
  Button,
  Box,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Receipt as ReceiptIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { OrderItem } from '../../types';

interface OrderSummaryProps {
  currentOrder: OrderItem[];
  orderTotal: number;
  orderTax: number;
  orderSubtotal: number;
  canProcessPayment: boolean;
  onRemoveItem: (index: number) => void;
  onClearOrder: () => void;
  onCheckout: () => void;
  onUpdateQuantity: (index: number, newQuantity: number) => void;
  formatCurrency: (amount: number) => string;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  currentOrder,
  orderTotal,
  orderTax,
  orderSubtotal,
  canProcessPayment,
  onRemoveItem,
  onClearOrder,
  onCheckout,
  onUpdateQuantity,
  formatCurrency,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleQuantityChange = (index: number, change: number) => {
    const item = currentOrder[index];
    const newQuantity = Math.max(1, item.quantity + change);
    onUpdateQuantity(index, newQuantity);
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="h2">
            Commande ({currentOrder.length} article{currentOrder.length > 1 ? 's' : ''})
          </Typography>
          {currentOrder.length > 0 && (
            <IconButton onClick={onClearOrder} color="error" size="small" title="Vider la commande">
              <ClearIcon />
            </IconButton>
          )}
        </Box>

        {currentOrder.length === 0 ? (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexGrow={1}
            textAlign="center"
            py={4}
          >
            <Typography color="textSecondary">Aucun article sélectionné</Typography>
          </Box>
        ) : (
          <>
            <List sx={{ flexGrow: 1, overflow: 'auto', maxHeight: '300px' }}>
              {currentOrder.map((item, index) => (
                <React.Fragment key={`${item.id}-${index}`}>
                  <ListItem sx={{ px: 0, py: 1 }}>
                    <Box sx={{ width: '100%' }}>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        mb={1}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 'medium', flexGrow: 1 }}>
                          {item.productName}
                        </Typography>
                        <IconButton
                          onClick={() => onRemoveItem(index)}
                          size="small"
                          color="error"
                          sx={{ ml: 1 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>

                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box display="flex" alignItems="center" gap={1}>
                          <IconButton
                            onClick={() => handleQuantityChange(index, -1)}
                            size="small"
                            disabled={item.quantity <= 1}
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>

                          <Typography
                            variant="body2"
                            sx={{ minWidth: '20px', textAlign: 'center' }}
                          >
                            {item.quantity}
                          </Typography>

                          <IconButton onClick={() => handleQuantityChange(index, 1)} size="small">
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Box>

                        <Box textAlign="right">
                          <Typography variant="body2" color="primary" fontWeight="bold">
                            {formatCurrency(item.totalPrice)}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {formatCurrency(item.unitPrice)}/unité
                          </Typography>
                        </Box>
                      </Box>

                      {item.isHappyHourApplied && (
                        <Chip label="Happy Hour" size="small" color="secondary" sx={{ mt: 0.5 }} />
                      )}

                      {item.isOffert && (
                        <Chip label="Offert" size="small" color="success" sx={{ mt: 0.5 }} />
                      )}

                      {item.isPerso && (
                        <Chip label="Personnel" size="small" color="info" sx={{ mt: 0.5 }} />
                      )}
                    </Box>
                  </ListItem>
                  {index < currentOrder.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>

            <Divider sx={{ my: 2 }} />

            <Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Sous-total HT:</Typography>
                <Typography variant="body2">{formatCurrency(orderSubtotal - orderTax)}</Typography>
              </Box>

              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">TVA:</Typography>
                <Typography variant="body2">{formatCurrency(orderTax)}</Typography>
              </Box>

              <Divider sx={{ my: 1 }} />

              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="h6" fontWeight="bold">
                  Total TTC:
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="primary">
                  {formatCurrency(orderTotal)}
                </Typography>
              </Box>

              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={onCheckout}
                disabled={!canProcessPayment}
                startIcon={<ReceiptIcon />}
                sx={{
                  py: isMobile ? 1.5 : 2,
                  fontSize: isMobile ? '1rem' : '1.1rem',
                  fontWeight: 'bold',
                }}
              >
                Encaisser
              </Button>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderSummary;
