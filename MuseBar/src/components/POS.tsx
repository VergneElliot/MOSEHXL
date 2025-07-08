import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  IconButton,
  Divider,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  Clear as ClearIcon,
  LocalOffer as DiscountIcon,
  CardGiftcard as OffertIcon,
  Search as SearchIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { Category, Product, OrderItem, LocalSubBill } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { HappyHourService } from '../services/happyHourService';
import { ApiService } from '../services/apiService';

interface POSProps {
  categories: Category[];
  products: Product[];
  isHappyHourActive: boolean;
  onDataUpdate: () => void;
}

const POS: React.FC<POSProps> = ({ categories, products, isHappyHourActive, onDataUpdate }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' });
  const [checkoutMode, setCheckoutMode] = useState<'simple' | 'split-equal' | 'split-items'>('simple');
  const [splitCount, setSplitCount] = useState(2);
  const [subBills, setSubBills] = useState<LocalSubBill[]>([]);
  
  // Universal payment states - used for simple payment and individual sub-bills
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState<'cash' | 'card' | 'split'>('cash');
  const [cashAmount, setCashAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  
  const happyHourService = HappyHourService.getInstance();
  const apiService = ApiService.getInstance();

  // Calculs de la commande
  const orderCalculations = useMemo(() => {
    // Le prix est TTC, on ne rajoute pas la taxe
    const subtotal = currentOrder.reduce((sum, item) => sum + item.totalPrice, 0);
    // Calcul de la TVA comprise dans chaque item
    const taxAmount = currentOrder.reduce((sum, item) => sum + (item.totalPrice * item.taxRate / (1 + item.taxRate)), 0);
    // La réduction Happy Hour est déjà appliquée dans le totalPrice
    const discountAmount = 0; // On ne double pas la réduction
    const finalAmount = subtotal;
    return {
      subtotal,
      taxAmount,
      discountAmount,
      finalAmount
    };
  }, [currentOrder]);

  const activeProducts = products.filter(product => product.isActive);

  const handleAddToOrder = (product: Product) => {
    // Always create a new line item for individual control
    const isHappyHourApplied = isHappyHourActive && product.isHappyHourEligible;
    let unitPrice = product.price;
    let discountType = product.happyHourDiscountType;
    let discountValue = product.happyHourDiscountValue;
    // Fallback sur les paramètres généraux si pas de valeur spécifique (>0)
    if (isHappyHourApplied && (!discountValue || discountValue <= 0)) {
      const settings = happyHourService.getSettings();
      discountType = settings.discountType;
      discountValue = settings.discountValue;
    }
    if (isHappyHourApplied) {
      if (discountType === 'percentage') {
        unitPrice = product.price * (1 - discountValue);
      } else if (discountType === 'fixed') {
        unitPrice = Math.max(0, product.price - discountValue);
      }
    }
    const newItem: OrderItem = {
      id: uuidv4(),
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice,
      totalPrice: unitPrice,
      taxRate: product.taxRate,
      isHappyHourApplied
    };
    setCurrentOrder(prev => [...prev, newItem]);
  };

  const handleRemoveFromOrder = (itemId: string) => {
    setCurrentOrder(prev => prev.filter(item => item.id !== itemId));
  };

  const handleClearOrder = () => {
    setCurrentOrder([]);
  };

  const handleToggleIndividualHappyHour = (itemId: string) => {
    setCurrentOrder(prev => prev.map(item => {
      if (item.id === itemId) {
        if (item.isManualHappyHour || item.isOffert) {
          // Remove manual happy hour or revert from offert
          const originalPrice = item.originalPrice || item.unitPrice;
          return {
            ...item,
            isManualHappyHour: false,
            isOffert: false,
            unitPrice: originalPrice,
            totalPrice: originalPrice,
            originalPrice: originalPrice
          };
        } else {
          // Apply manual happy hour
          const product = products.find(p => p.id === item.productId);
          if (!product) return item;

          // Store original price if not already stored
          const originalPrice = item.originalPrice || item.unitPrice;
          
          // Calculate happy hour price
          let discountType = product.happyHourDiscountType;
          let discountValue = product.happyHourDiscountValue;
          
          // Fallback to general settings if product doesn't have specific values
          if (!discountValue || discountValue <= 0) {
            const settings = happyHourService.getSettings();
            discountType = settings.discountType;
            discountValue = settings.discountValue;
          }
          
          let happyHourPrice = originalPrice;
          if (discountType === 'percentage') {
            happyHourPrice = originalPrice * (1 - discountValue);
          } else if (discountType === 'fixed') {
            happyHourPrice = Math.max(0, originalPrice - discountValue);
          }

          return {
            ...item,
            isManualHappyHour: true,
            isOffert: false,
            unitPrice: happyHourPrice,
            totalPrice: happyHourPrice,
            originalPrice
          };
        }
      }
      return item;
    }));
  };

  const handleToggleOffert = (itemId: string) => {
    setCurrentOrder(prev => prev.map(item => {
      if (item.id === itemId) {
        if (item.isOffert) {
          // Revert from offert
          const originalPrice = item.originalPrice || item.unitPrice;
          return {
            ...item,
            isOffert: false,
            isManualHappyHour: false,
            unitPrice: originalPrice,
            totalPrice: originalPrice,
            originalPrice
          };
        } else {
          // Set as offert (complimentary)
          const originalPrice = item.originalPrice || item.unitPrice;
          return {
            ...item,
            isOffert: true,
            isManualHappyHour: false,
            unitPrice: 0,
            totalPrice: 0,
            originalPrice
          };
        }
      }
      return item;
    }));
  };

  const handleTogglePerso = (itemId: string) => {
    setCurrentOrder(prev => prev.map(item => {
      if (item.id === itemId) {
        if (item.isPerso) {
          // Remove perso
          return {
            ...item,
            isPerso: false,
            unitPrice: item.originalPrice || item.unitPrice,
            totalPrice: item.originalPrice || item.unitPrice
          };
        } else {
          // Set as perso
          const originalPrice = item.originalPrice || item.unitPrice;
          return {
            ...item,
            isPerso: true,
            unitPrice: 0,
            totalPrice: 0,
            originalPrice
          };
        }
      }
      return item;
    }));
  };

  const handlePayment = () => {
    if (currentOrder.length === 0) {
      setSnackbar({ open: true, message: 'Aucun article dans la commande', severity: 'error' });
      return;
    }
    setPaymentDialogOpen(true);
  };

  // Nouvelle fonction pour initialiser les sous-notes pour split égal
  const handleInitSplitEqual = (count: number) => {
    const total = orderCalculations.finalAmount;
    const part = parseFloat((total / count).toFixed(2));
    const bills: LocalSubBill[] = Array.from({ length: count }).map((_, i) => ({
      id: uuidv4(),
      items: [], // Pour split égal, on ne détaille pas les items
      total: part,
      payments: []
    }));
    setSubBills(bills);
  };

  return (
    <Box>
      {/* Replace Grid with flexbox layout */}
      <Box sx={{ 
        display: 'flex', 
        gap: 3,
        minHeight: '100vh',
        '@media (max-width: 599px)': { // xs breakpoint
          gap: 2
        }
      }}>
        {/* Menu section - takes remaining space */}
        <Box sx={{ 
          flex: 1,
          minWidth: 0, // Prevents flex item from overflowing
          display: 'flex',
          flexDirection: 'column',
          height: '100vh'
        }}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
              {/* Sticky header */}
              <Box sx={{ 
                position: 'sticky', 
                top: 0, 
                backgroundColor: 'white', 
                zIndex: 10,
                pb: 2,
                mb: 2,
                borderBottom: '1px solid #eee'
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h5">
                    Menu
                  </Typography>
                  <TextField
                    size="small"
                    placeholder="Rechercher un produit..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      // Clear category selection when searching to show results from all categories
                      if (e.target.value && selectedCategory) {
                        setSelectedCategory('');
                      }
                    }}
                    sx={{ 
                      minWidth: { xs: 200, sm: 300 }, // Responsive search bar width
                      maxWidth: { xs: 250, sm: 300 }
                    }}
                    InputProps={{
                      startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </Box>
                
                {/* Catégories */}
                <Box>
                  <Button
                    variant={selectedCategory === '' ? 'contained' : 'outlined'}
                    onClick={() => setSelectedCategory('')}
                    sx={{ mr: 1, mb: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                    size="small"
                  >
                    Tout
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? 'contained' : 'outlined'}
                      onClick={() => setSelectedCategory(category.id)}
                      sx={{ mr: 1, mb: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      size="small"
                    >
                      {category.name}
                    </Button>
                  ))}
                </Box>
              </Box>

              {/* Scrollable products grid */}
              <Box sx={{ 
                flex: 1, 
                overflowY: 'auto',
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  background: '#f1f1f1',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#888',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: '#555',
                },
              }}>
                {/* Produits */}
                <Grid container spacing={2}>
                  {activeProducts
                    .filter(product => {
                      // Filter by category
                      const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
                      // Filter by search query
                      const matchesSearch = !searchQuery || 
                        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
                      return matchesCategory && matchesSearch;
                    })
                    .map((product) => {
                      const value = typeof product.happyHourDiscountValue === 'number' ? product.happyHourDiscountValue : 0;
                      let happyHourLabel = '';
                      if (isHappyHourActive && product.isHappyHourEligible) {
                        happyHourLabel = 'HH'; // Changed from showing discount percentage to just "HH"
                      }
                      return (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                          <Card 
                            sx={{ 
                              cursor: 'pointer',
                              '&:hover': { backgroundColor: 'action.hover' },
                              height: { xs: 'auto', sm: '140px' }, // Responsive card height
                              minHeight: '120px'
                            }}
                            onClick={() => handleAddToOrder(product)}
                          >
                            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                              <Typography 
                                variant="h6" 
                                noWrap 
                                sx={{ 
                                  fontSize: { xs: '1rem', sm: '1.25rem' },
                                  mb: 0.5
                                }}
                              >
                                {product.name}
                              </Typography>
                              {product.description && (
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary" 
                                  sx={{ 
                                    mb: 1,
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                    display: { xs: 'none', sm: 'block' } // Hide description on very small screens
                                  }}
                                >
                                  {product.description}
                                </Typography>
                              )}
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography 
                                  variant="h6" 
                                  color="primary"
                                  sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
                                >
                                  {product.price.toFixed(2)}€
                                </Typography>
                                <Box>
                                  {isHappyHourActive && product.isHappyHourEligible && (
                                    <Chip 
                                      label={happyHourLabel}
                                      color="warning" 
                                      size="small" 
                                    />
                                  )}
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Command panel - fixed width, always on right */}
        <Box sx={{ 
          width: {
            xs: '280px',  // Mobile
            sm: '320px',  // Tablet  
            md: '350px'   // Desktop
          },
          flexShrink: 0, // Prevents shrinking
          position: 'sticky',
          top: 0,
          maxHeight: 'calc(100vh - 20px)', // More compact - use almost full viewport height
          zIndex: 20
        }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              p: { xs: 1.5, sm: 2 } // More compact padding
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="h5" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                  Commande
                </Typography>
                <IconButton onClick={handleClearOrder} color="error" size="small">
                  <ClearIcon />
                </IconButton>
              </Box>

              {isHappyHourActive && (
                <Alert severity="success" sx={{ mb: 1.5, flexShrink: 0, py: 0.5 }}>
                  Happy Hour actif ! 🎉
                </Alert>
              )}

              {currentOrder.length === 0 ? (
                <Box sx={{ 
                  flex: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  minHeight: '200px'
                }}>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                    Aucun article dans la commande
                  </Typography>
                </Box>
              ) : (
                <>
                  {/* Scrollable item list - limited height to ensure PAYER button is always visible */}
                  <Box sx={{ 
                    overflowY: 'auto',
                    mb: 1.5,
                    maxHeight: {
                      xs: '300px', // Mobile - limit to 300px so payment section is always visible
                      sm: '350px', // Tablet
                      md: '400px'  // Desktop
                    },
                    minHeight: '100px',
                    '&::-webkit-scrollbar': {
                      width: '6px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: '#f1f1f1',
                      borderRadius: '3px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: '#888',
                      borderRadius: '3px',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                      background: '#555',
                    },
                  }}>
                    <List sx={{ p: 0 }}>
                      {currentOrder.map((item) => (
                        <React.Fragment key={item.id}>
                          <ListItem sx={{ py: 2, px: 1 }}>
                            <Box sx={{ width: '100%' }}>
                              {/* Item header with name and price */}
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="subtitle2" fontWeight="bold">
                                    {item.productName}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {item.totalPrice.toFixed(2)}€
                                  </Typography>
                                </Box>
                                
                                {/* Delete control */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleRemoveFromOrder(item.id)}
                                    title="Supprimer cet item"
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </Box>
                              </Box>
                              
                              {/* Status chips */}
                              <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                                {item.isHappyHourApplied && (
                                  <Chip label="Happy Hour Auto" size="small" color="warning" />
                                )}
                                {item.isManualHappyHour && (
                                  <Chip label="Happy Hour Manuel" size="small" color="secondary" />
                                )}
                                {item.isOffert && (
                                  <Chip label="OFFERT" size="small" color="success" />
                                )}
                                {item.isPerso && (
                                  <Chip label="PERSO" size="small" color="info" />
                                )}
                              </Box>
                              
                              {/* Action buttons */}
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Button
                                  size="small"
                                  variant={item.isManualHappyHour ? 'contained' : 'outlined'}
                                  color={item.isManualHappyHour ? 'secondary' : 'primary'}
                                  startIcon={<DiscountIcon />}
                                  onClick={() => handleToggleIndividualHappyHour(item.id)}
                                  disabled={item.isOffert || item.isPerso}
                                  sx={{ fontSize: 11 }}
                                >
                                  {item.isManualHappyHour ? 'Retirer HH' : 'Happy Hour'}
                                </Button>
                                <Button
                                  size="small"
                                  variant={item.isOffert ? 'contained' : 'outlined'}
                                  color={item.isOffert ? 'success' : 'primary'}
                                  startIcon={<OffertIcon />}
                                  onClick={() => handleToggleOffert(item.id)}
                                  disabled={item.isPerso}
                                  sx={{ fontSize: 11 }}
                                >
                                  {item.isOffert ? 'Annuler Offert' : 'Offert'}
                                </Button>
                                <Button
                                  size="small"
                                  variant={item.isPerso ? 'contained' : 'outlined'}
                                  color={item.isPerso ? 'info' : 'primary'}
                                  startIcon={<PersonIcon />}
                                  onClick={() => handleTogglePerso(item.id)}
                                  sx={{ fontSize: 11 }}
                                >
                                  {item.isPerso ? 'Annuler Perso' : 'Perso'}
                                </Button>
                              </Box>
                            </Box>
                          </ListItem>
                          <Divider />
                        </React.Fragment>
                      ))}
                    </List>
                  </Box>

                  {/* Fixed summary and payment section - more compact */}
                  <Box sx={{ 
                    flexShrink: 0
                  }}>
                    <Divider sx={{ mb: 1.5 }} />

                    {/* Résumé de la commande */}
                    <Box sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">Sous-total TTC :</Typography>
                        <Typography variant="body2">{orderCalculations.subtotal.toFixed(2)}€</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">TVA comprise :</Typography>
                        <Typography variant="body2">{orderCalculations.taxAmount.toFixed(2)}€</Typography>
                      </Box>
                      <Divider sx={{ my: 0.5 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>Total à payer :</Typography>
                        <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>{orderCalculations.finalAmount.toFixed(2)}€</Typography>
                      </Box>
                    </Box>

                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      startIcon={<ReceiptIcon />}
                      onClick={handlePayment}
                      sx={{ py: 1.5 }}
                    >
                      Payer
                    </Button>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Dialog de paiement refondu */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Paiement</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Montant à payer : {orderCalculations.finalAmount.toFixed(2)}€
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                variant={checkoutMode === 'simple' ? 'contained' : 'outlined'}
                onClick={() => {
                  setCheckoutMode('simple');
                  setSubBills([]);
                }}
              >
                PAIEMENT SIMPLE
              </Button>
              <Button
                variant={checkoutMode === 'split-equal' ? 'contained' : 'outlined'}
                onClick={() => {
                  setCheckoutMode('split-equal');
                  setSubBills([]);
                }}
              >
                SPLIT ÉGAL
              </Button>
              <Button
                variant={checkoutMode === 'split-items' ? 'contained' : 'outlined'}
                onClick={() => {
                  setCheckoutMode('split-items');
                  setSubBills([]);
                }}
              >
                SPLIT PAR ITEMS
              </Button>
            </Box>
          </Box>

          {/* Paiement simple */}
          {checkoutMode === 'simple' && (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Mode de paiement</Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Button
                  variant={currentPaymentMethod === 'cash' ? 'contained' : 'outlined'}
                  onClick={() => {
                    setCurrentPaymentMethod('cash');
                    setCashAmount(orderCalculations.finalAmount.toString());
                    setCardAmount('');
                  }}
                >
                  ESPÈCES
                </Button>
                <Button
                  variant={currentPaymentMethod === 'card' ? 'contained' : 'outlined'}
                  onClick={() => {
                    setCurrentPaymentMethod('card');
                    setCashAmount('');
                    setCardAmount(orderCalculations.finalAmount.toString());
                  }}
                >
                  CARTE
                </Button>
                <Button
                  variant={currentPaymentMethod === 'split' ? 'contained' : 'outlined'}
                  onClick={() => {
                    setCurrentPaymentMethod('split');
                    setCashAmount('');
                    setCardAmount('');
                  }}
                >
                  SPLIT
                </Button>
              </Box>

              {/* Cash payment */}
              {currentPaymentMethod === 'cash' && (
                <Box>
                  <TextField
                    label="Montant reçu (€)"
                    type="number"
                    fullWidth
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    inputProps={{ step: 0.01, min: 0 }}
                    sx={{ mb: 2 }}
                  />
                  {cashAmount && !isNaN(parseFloat(cashAmount)) && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Rendu : {(parseFloat(cashAmount) - orderCalculations.finalAmount).toFixed(2)}€
                    </Typography>
                  )}
                </Box>
              )}

              {/* Card payment - no input needed */}
              {currentPaymentMethod === 'card' && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Paiement par carte : montant exact ({orderCalculations.finalAmount.toFixed(2)}€)
                </Alert>
              )}

              {/* Split payment */}
              {currentPaymentMethod === 'split' && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>Répartition Espèces / Carte</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        label="Montant Espèces (€)"
                        type="number"
                        fullWidth
                        value={cashAmount}
                        onChange={(e) => {
                          const cash = parseFloat(e.target.value) || 0;
                          setCashAmount(e.target.value);
                          setCardAmount(Math.max(0, orderCalculations.finalAmount - cash).toFixed(2));
                        }}
                        inputProps={{ step: 0.01, min: 0, max: orderCalculations.finalAmount }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Montant Carte (€)"
                        type="number"
                        fullWidth
                        value={cardAmount}
                        onChange={(e) => {
                          const card = parseFloat(e.target.value) || 0;
                          setCardAmount(e.target.value);
                          setCashAmount(Math.max(0, orderCalculations.finalAmount - card).toFixed(2));
                        }}
                        inputProps={{ step: 0.01, min: 0, max: orderCalculations.finalAmount }}
                      />
                    </Grid>
                  </Grid>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                    Total : {((parseFloat(cashAmount) || 0) + (parseFloat(cardAmount) || 0)).toFixed(2)}€ / {orderCalculations.finalAmount.toFixed(2)}€
                  </Typography>
                  {cashAmount && !isNaN(parseFloat(cashAmount)) && parseFloat(cashAmount) > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Rendu espèces : {Math.max(0, parseFloat(cashAmount) - (parseFloat(cashAmount) || 0)).toFixed(2)}€
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          )}

          {/* Split égal */}
          {checkoutMode === 'split-equal' && (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Split en parts égales</Typography>
              <TextField
                label="Nombre de parts"
                type="number"
                fullWidth
                value={splitCount}
                onChange={(e) => setSplitCount(Math.max(2, parseInt(e.target.value) || 2))}
                inputProps={{ min: 2, max: 20 }}
                sx={{ mb: 2, maxWidth: 200 }}
              />
              <Button variant="outlined" onClick={() => handleInitSplitEqual(splitCount)} sx={{ mb: 2 }}>
                GÉNÉRER LES PARTS
              </Button>
              {subBills.length > 0 && (
                <Box>
                  {subBills.map((bill, idx) => (
                    <Box key={bill.id} sx={{ mb: 3, p: 2, border: '1px solid #eee', borderRadius: 2 }}>
                      <Typography variant="body1" fontWeight="bold" sx={{ mb: 2 }}>
                        Part {idx + 1} : {bill.total.toFixed(2)}€
                      </Typography>
                      
                      {/* Payment method buttons */}
                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <Button
                          size="small"
                          variant={bill.payments[0]?.method === 'cash' ? 'contained' : 'outlined'}
                          onClick={() => {
                            const newBills = [...subBills];
                            newBills[idx].payments = [{ amount: bill.total, method: 'cash' }];
                            setSubBills(newBills);
                          }}
                        >
                          ESPÈCES
                        </Button>
                        <Button
                          size="small"
                          variant={bill.payments[0]?.method === 'card' ? 'contained' : 'outlined'}
                          onClick={() => {
                            const newBills = [...subBills];
                            newBills[idx].payments = [{ amount: bill.total, method: 'card' }];
                            setSubBills(newBills);
                          }}
                        >
                          CARTE
                        </Button>
                        <Button
                          size="small"
                          variant={bill.payments.length === 2 && 
                                   bill.payments[0].method === 'cash' && 
                                   bill.payments[1].method === 'card' ? 'contained' : 'outlined'}
                          onClick={() => {
                            const newBills = [...subBills];
                            newBills[idx].payments = [
                              { amount: bill.total / 2, method: 'cash' },
                              { amount: bill.total / 2, method: 'card' }
                            ];
                            setSubBills(newBills);
                          }}
                        >
                          SPLIT
                        </Button>
                      </Box>

                      {/* Split payment details */}
                      {bill.payments.length === 2 && 
                       bill.payments[0].method === 'cash' && 
                       bill.payments[1].method === 'card' && (
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <TextField
                              label="Espèces (€)"
                              type="number"
                              size="small"
                              fullWidth
                              value={bill.payments[0].amount}
                              onChange={(e) => {
                                const cash = parseFloat(e.target.value) || 0;
                                const card = Math.max(0, bill.total - cash);
                                const newBills = [...subBills];
                                newBills[idx].payments = [
                                  { amount: cash, method: 'cash' },
                                  { amount: card, method: 'card' }
                                ];
                                setSubBills(newBills);
                              }}
                              inputProps={{ step: 0.01, min: 0, max: bill.total }}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              label="Carte (€)"
                              type="number"
                              size="small"
                              fullWidth
                              value={bill.payments[1].amount}
                              onChange={(e) => {
                                const card = parseFloat(e.target.value) || 0;
                                const cash = Math.max(0, bill.total - card);
                                const newBills = [...subBills];
                                newBills[idx].payments = [
                                  { amount: cash, method: 'cash' },
                                  { amount: card, method: 'card' }
                                ];
                                setSubBills(newBills);
                              }}
                              inputProps={{ step: 0.01, min: 0, max: bill.total }}
                            />
                          </Grid>
                        </Grid>
                      )}

                      {/* Payment status */}
                      {bill.payments.length > 0 && (
                        <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
                          ✓ Méthode de paiement sélectionnée
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* Split par items */}
          {checkoutMode === 'split-items' && (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Split par items</Typography>
              <TextField
                label="Nombre de sous-notes"
                type="number"
                fullWidth
                value={splitCount}
                onChange={(e) => setSplitCount(Math.max(2, parseInt(e.target.value) || 2))}
                inputProps={{ min: 2, max: 20 }}
                sx={{ mb: 2, maxWidth: 250 }}
              />
              <Button variant="outlined" onClick={() => {
                const bills: LocalSubBill[] = Array.from({ length: splitCount }).map((_, i) => ({
                  id: uuidv4(),
                  items: [],
                  total: 0,
                  payments: []
                }));
                setSubBills(bills);
              }} sx={{ mb: 2 }}>
                GÉNÉRER LES PARTS
              </Button>
              
              {subBills.length > 0 && (
                <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
                  {/* Unassigned items column */}
                  <Box sx={{ minWidth: 240, flex: '0 0 240px', background: '#f8f9fa', borderRadius: 2, p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>Items non affectés</Typography>
                    {currentOrder.filter(item => {
                      // Check if this item is already assigned to any sub-bill
                      return !subBills.some(bill => bill.items.some(i => i.id === item.id));
                    }).length === 0 ? (
                      <Typography variant="body2" color="text.secondary">Tous les items sont affectés</Typography>
                    ) : (
                      currentOrder.filter(item => {
                        // Check if this item is already assigned to any sub-bill
                        return !subBills.some(bill => bill.items.some(i => i.id === item.id));
                      }).map(item => {
                        return (
                          <Box key={item.id} sx={{ mb: 2, p: 2, border: '1px solid #dee2e6', borderRadius: 1, background: '#fff' }}>
                            <Typography variant="body2" fontWeight="medium">{item.productName}</Typography>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                              {item.totalPrice.toFixed(2)}€
                            </Typography>
                            
                            {/* Simple assignment buttons */}
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                              Assigner à:
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {subBills.map((_, idx) => (
                                <Button
                                  key={idx}
                                  size="small"
                                  variant="contained"
                                  color="primary"
                                  sx={{ minWidth: 0, px: 2, fontSize: 12 }}
                                  onClick={() => {
                                    const newBills = [...subBills];
                                    // Add this exact item to the selected sub-bill
                                    newBills[idx].items = [...newBills[idx].items, item];
                                    newBills[idx].total = newBills[idx].items.reduce((sum, it) => sum + it.totalPrice, 0);
                                    setSubBills(newBills);
                                  }}
                                >
                                  Part {idx + 1}
                                </Button>
                              ))}
                            </Box>
                          </Box>
                        );
                      })
                    )}
                  </Box>

                  {/* Sub-bills columns */}
                  {subBills.map((bill, idx) => (
                    <Box key={bill.id} sx={{ minWidth: 240, flex: '0 0 240px', background: '#fff', borderRadius: 2, border: '1px solid #dee2e6', p: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Part {idx + 1}</Typography>
                      <Divider sx={{ mb: 2 }} />
                      
                      {/* Items in this sub-bill */}
                      <Box sx={{ mb: 2, minHeight: 100 }}>
                        {bill.items.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">Aucun item</Typography>
                        ) : (
                          bill.items.map(item => (
                            <Box key={item.id} sx={{ mb: 1, p: 1, border: '1px solid #e9ecef', borderRadius: 1, background: '#f8f9fa', position: 'relative' }}>
                              <Typography variant="body2" fontSize={12} fontWeight="medium">
                                {item.productName}
                              </Typography>
                              <Typography variant="caption" color="primary" fontWeight="medium">
                                {item.totalPrice.toFixed(2)}€
                              </Typography>
                              
                              {/* Remove button */}
                              <IconButton
                                size="small"
                                sx={{ position: 'absolute', top: 0, right: 0, p: 0.5 }}
                                onClick={() => {
                                  const newBills = [...subBills];
                                  newBills[idx].items = newBills[idx].items.filter(i => i.id !== item.id);
                                  newBills[idx].total = newBills[idx].items.reduce((sum, it) => sum + it.totalPrice, 0);
                                  setSubBills(newBills);
                                }}
                                title="Retirer de cette part"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          ))
                        )}
                      </Box>

                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body2" fontWeight="bold" sx={{ mb: 2 }}>
                        Total : {bill.total.toFixed(2)}€
                      </Typography>

                      {/* Payment method selection */}
                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <Button
                          size="small"
                          variant={bill.payments[0]?.method === 'cash' ? 'contained' : 'outlined'}
                          onClick={() => {
                            const newBills = [...subBills];
                            newBills[idx].payments = [{ amount: bill.total, method: 'cash' }];
                            setSubBills(newBills);
                          }}
                        >
                          ESP
                        </Button>
                        <Button
                          size="small"
                          variant={bill.payments[0]?.method === 'card' ? 'contained' : 'outlined'}
                          onClick={() => {
                            const newBills = [...subBills];
                            newBills[idx].payments = [{ amount: bill.total, method: 'card' }];
                            setSubBills(newBills);
                          }}
                        >
                          CB
                        </Button>
                        <Button
                          size="small"
                          variant={bill.payments.length === 2 && 
                                   bill.payments[0].method === 'cash' && 
                                   bill.payments[1].method === 'card' ? 'contained' : 'outlined'}
                          onClick={() => {
                            const newBills = [...subBills];
                            newBills[idx].payments = [
                              { amount: bill.total / 2, method: 'cash' },
                              { amount: bill.total / 2, method: 'card' }
                            ];
                            setSubBills(newBills);
                          }}
                        >
                          SPLIT
                        </Button>
                      </Box>

                      {/* Split payment details for items */}
                      {bill.payments.length === 2 && 
                       bill.payments[0].method === 'cash' && 
                       bill.payments[1].method === 'card' && (
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <TextField
                              label="Espèces (€)"
                              type="number"
                              size="small"
                              fullWidth
                              value={bill.payments[0].amount}
                              onChange={(e) => {
                                const cash = parseFloat(e.target.value) || 0;
                                const card = Math.max(0, bill.total - cash);
                                const newBills = [...subBills];
                                newBills[idx].payments = [
                                  { amount: cash, method: 'cash' },
                                  { amount: card, method: 'card' }
                                ];
                                setSubBills(newBills);
                              }}
                              inputProps={{ step: 0.01, min: 0, max: bill.total }}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              label="Carte (€)"
                              type="number"
                              size="small"
                              fullWidth
                              value={bill.payments[1].amount}
                              onChange={(e) => {
                                const card = parseFloat(e.target.value) || 0;
                                const cash = Math.max(0, bill.total - card);
                                const newBills = [...subBills];
                                newBills[idx].payments = [
                                  { amount: cash, method: 'cash' },
                                  { amount: card, method: 'card' }
                                ];
                                setSubBills(newBills);
                              }}
                              inputProps={{ step: 0.01, min: 0, max: bill.total }}
                            />
                          </Grid>
                        </Grid>
                      )}

                      {bill.payments.length > 0 && (
                        <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
                          ✓ Configuré
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPaymentDialogOpen(false);
            setCurrentPaymentMethod('cash');
            setCashAmount('');
            setCardAmount('');
            setSubBills([]);
          }}>ANNULER</Button>
          <Button
            onClick={async () => {
              try {
                if (checkoutMode === 'simple') {
                  // Simple payment validation
                  if (currentPaymentMethod === 'cash') {
                    const amount = parseFloat(cashAmount);
                    if (isNaN(amount) || amount < orderCalculations.finalAmount) {
                      setSnackbar({ open: true, message: 'Montant insuffisant', severity: 'error' });
                      return;
                    }
                    // Handle cash payment
                    const savedOrder = await apiService.createOrder({
                      items: currentOrder,
                      totalAmount: orderCalculations.finalAmount,
                      taxAmount: orderCalculations.taxAmount,
                      paymentMethod: 'cash',
                      status: 'completed',
                      notes: `Paiement: ${amount.toFixed(2)}€, Rendu: ${(amount - orderCalculations.finalAmount).toFixed(2)}€`
                    });
                    setSnackbar({ 
                      open: true, 
                      message: `Paiement accepté. Rendu: ${(amount - orderCalculations.finalAmount).toFixed(2)}€ - Commande #${savedOrder.id}`, 
                      severity: 'success' 
                    });
                  } else if (currentPaymentMethod === 'card') {
                    // Handle card payment (exact amount)
                    const savedOrder = await apiService.createOrder({
                      items: currentOrder,
                      totalAmount: orderCalculations.finalAmount,
                      taxAmount: orderCalculations.taxAmount,
                      paymentMethod: 'card',
                      status: 'completed',
                      notes: `Paiement par carte: ${orderCalculations.finalAmount.toFixed(2)}€`
                    });
                    setSnackbar({ 
                      open: true, 
                      message: `Paiement par carte accepté - Commande #${savedOrder.id}`, 
                      severity: 'success' 
                    });
                  } else if (currentPaymentMethod === 'split') {
                    // Handle split payment
                    const cash = parseFloat(cashAmount) || 0;
                    const card = parseFloat(cardAmount) || 0;
                    const total = cash + card;
                    if (Math.abs(total - orderCalculations.finalAmount) > 0.01) {
                      setSnackbar({ open: true, message: 'Le total ne correspond pas au montant à payer', severity: 'error' });
                      return;
                    }
                    const savedOrder = await apiService.createOrder({
                      items: currentOrder,
                      totalAmount: orderCalculations.finalAmount,
                      taxAmount: orderCalculations.taxAmount,
                      paymentMethod: 'split',
                      status: 'completed',
                      notes: `Paiement split - Espèces: ${cash.toFixed(2)}€, Carte: ${card.toFixed(2)}€`
                    });
                    setSnackbar({
                      open: true,
                      message: `Paiement split accepté - Commande #${savedOrder.id}`,
                      severity: 'success'
                    });
                  }
                  
                  // Reset form
                  setCurrentOrder([]);
                  setPaymentDialogOpen(false);
                  setCashAmount('');
                  setCardAmount('');
                  onDataUpdate();
                  
                } else if (checkoutMode === 'split-equal' || checkoutMode === 'split-items') {
                  // Validation for split modes
                  if (subBills.length === 0) {
                    setSnackbar({ open: true, message: 'Veuillez générer les parts', severity: 'error' });
                    return;
                  }
                  
                  if (checkoutMode === 'split-items') {
                    // Verify all items are assigned
                    const allAssigned = currentOrder.every(item => {
                      return subBills.some(bill => bill.items.some(bi => bi.id === item.id));
                    });
                    
                    if (!allAssigned) {
                      setSnackbar({ open: true, message: 'Tous les items doivent être affectés à une part', severity: 'error' });
                      return;
                    }
                  }
                  
                  // Verify all sub-bills have payment methods
                  const allPaid = subBills.every(bill => bill.payments.length > 0);
                  if (!allPaid) {
                    setSnackbar({ open: true, message: 'Toutes les parts doivent avoir une méthode de paiement', severity: 'error' });
                    return;
                  }
                  
                  // Create detailed payment notes
                  let paymentDetails = subBills.map((bill, idx) => {
                    if (bill.payments.length === 1) {
                      return `Part ${idx + 1}: ${bill.payments[0].method === 'cash' ? 'Espèces' : 'Carte'} ${bill.total.toFixed(2)}€`;
                    } else {
                      return `Part ${idx + 1}: Split ${bill.payments[0].amount.toFixed(2)}€ espèces + ${bill.payments[1].amount.toFixed(2)}€ carte`;
                    }
                  }).join(', ');
                  
                  const notes = `${checkoutMode === 'split-equal' ? 'Split égal' : 'Split par items'} - ${subBills.length} parts: ${paymentDetails}`;
                  
                  const savedOrder = await apiService.createOrder({
                    items: currentOrder,
                    totalAmount: orderCalculations.finalAmount,
                    taxAmount: orderCalculations.taxAmount,
                    paymentMethod: 'split',
                    status: 'completed',
                    notes
                  });
                  
                  setSnackbar({
                    open: true,
                    message: `Paiement accepté pour ${subBills.length} parts - Commande #${savedOrder.id}`,
                    severity: 'success'
                  });
                  
                  // Reset form
                  setCurrentOrder([]);
                  setPaymentDialogOpen(false);
                  setSubBills([]);
                  setCashAmount('');
                  setCardAmount('');
                  onDataUpdate();
                }
              } catch (error) {
                console.error('Error processing payment:', error);
                setSnackbar({ 
                  open: true, 
                  message: 'Erreur lors du traitement du paiement', 
                  severity: 'error' 
                });
              }
            }}
            variant="contained"
          >
            CONFIRMER
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default POS; 