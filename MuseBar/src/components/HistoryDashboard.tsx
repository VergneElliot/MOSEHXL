import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Divider,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  IconButton,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { 
  BarChart, 
  Visibility as VisibilityIcon, 
  Search as SearchIcon, 
  CreditCard, 
  Money,
  Print,
  SwapHoriz as SwapHorizIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { ApiService } from '../services/apiService';
import { Order } from '../types';
import LegalReceipt from './LegalReceipt';
import { mapBusinessInfoFromBackend } from '../utils/businessInfoMapper';


const HistoryDashboard: React.FC = () => {
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    caJour: 0,
    ventesJour: 0,
    topProduits: [] as Array<{ name: string; qty: number }>
  });
  

  
  // Receipt dialog state
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<any>(null);
  const [receiptType, setReceiptType] = useState<'detailed' | 'summary'>('detailed');
  
  // Return dialog state
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [orderToReturn, setOrderToReturn] = useState<Order | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [selectedItemsToReturn, setSelectedItemsToReturn] = useState<string[]>([]);
  const [isPartialReturn, setIsPartialReturn] = useState(false);
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState('');
  const [returnError, setReturnError] = useState('');

  // Cancellation dialog state
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancellationLoading, setCancellationLoading] = useState(false);
  const [cancellationSuccess, setCancellationSuccess] = useState('');
  const [cancellationError, setCancellationError] = useState('');

  const apiService = ApiService.getInstance();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const ordersData = await apiService.getOrders();
      // Map sub_bills to subBills for frontend compatibility
      const mappedOrders = ordersData.map(order => ({
        ...order,
        subBills: (order as any)['sub_bills'] || order.subBills || []
      }));
      setOrders(mappedOrders);
      
      // Calculate stats
      const today = new Date().toDateString();
      const todayOrders = ordersData.filter(order => 
        order.createdAt.toDateString() === today && order.status === 'completed'
      );
      
      const caJour = todayOrders.reduce((sum, order) => sum + order.finalAmount, 0);
      const ventesJour = todayOrders.length;
      
      // Calculate top products from real order data
      const productCounts: { [key: string]: number } = {};
      todayOrders.forEach(order => {
        order.items.forEach(item => {
          productCounts[item.productName] = (productCounts[item.productName] || 0) + item.quantity;
        });
      });
      
      const topProduits = Object.entries(productCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([name, qty]) => ({ name, qty }));
      
      setStats({
        caJour,
        ventesJour,
        topProduits
      });
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order =>
    order.id.toLowerCase().includes(search.toLowerCase()) ||
    order.createdAt.toISOString().includes(search)
  );



  // Return functions
  const handleOpenReturnDialog = (order: Order) => {
    if (order.status !== 'completed') {
      setReturnError('Seules les commandes terminées peuvent faire l\'objet d\'un retour');
      return;
    }
    setOrderToReturn(order);
    setReturnDialogOpen(true);
    setReturnReason('');
    setSelectedItemsToReturn([]);
    setIsPartialReturn(false);
    setReturnError('');
    setReturnSuccess('');
  };

  const handleCloseReturnDialog = () => {
    setReturnDialogOpen(false);
    setOrderToReturn(null);
    setReturnReason('');
    setSelectedItemsToReturn([]);
    setIsPartialReturn(false);
    setReturnError('');
    setReturnSuccess('');
  };

  const calculateReturnTotals = () => {
    if (!orderToReturn) return { totalAmount: 0, totalTax: 0, totalNet: 0, taxBreakdown: { '10': 0, '20': 0 } };
    
    const itemsToReturn = isPartialReturn 
      ? orderToReturn.items.filter(item => selectedItemsToReturn.includes(item.id))
      : orderToReturn.items;
    
    let totalAmount = 0;
    let totalTax = 0;
    const taxBreakdown = { '10': 0, '20': 0 };
    
    itemsToReturn.forEach(item => {
      const itemTotal = item.totalPrice;
      const itemTaxAmount = itemTotal * item.taxRate / (1 + item.taxRate);
      const taxRatePercent = Math.round(item.taxRate * 100);
      
      totalAmount += itemTotal;
      totalTax += itemTaxAmount;
      
      if (taxRatePercent === 10) {
        taxBreakdown['10'] += itemTaxAmount;
      } else if (taxRatePercent === 20) {
        taxBreakdown['20'] += itemTaxAmount;
      }
    });
    
    return {
      totalAmount,
      totalTax,
      totalNet: totalAmount - totalTax,
      taxBreakdown
    };
  };

  const handleReturnOrder = async () => {
    if (!orderToReturn || !returnReason.trim()) {
      setReturnError('Veuillez fournir une raison pour le retour');
      return;
    }

    if (isPartialReturn && selectedItemsToReturn.length === 0) {
      setReturnError('Veuillez sélectionner au moins un article à retourner');
      return;
    }

    setReturnLoading(true);
    setReturnError('');

    try {
      const itemsToReturn = isPartialReturn 
        ? selectedItemsToReturn.map(itemId => ({ item_id: parseInt(itemId) }))
        : orderToReturn.items.map(item => ({ item_id: parseInt(item.id) }));

      const response = await apiService.post('/orders/retour-from-history', {
        originalOrderId: parseInt(orderToReturn.id),
        reason: returnReason.trim(),
        itemsToReturn
      });
      
      setReturnSuccess((response.data as any).message);
      
      // Refresh orders list
      await loadOrders();
      
      // Close dialog after a short delay
      setTimeout(() => {
        handleCloseReturnDialog();
      }, 2000);
      
    } catch (error: any) {
      setReturnError(error.response?.data?.error || 'Erreur lors du retour de la commande');
    } finally {
      setReturnLoading(false);
    }
  };

  const handleReturnItemSelectionChange = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItemsToReturn(prev => [...prev, itemId]);
    } else {
      setSelectedItemsToReturn(prev => prev.filter(id => id !== itemId));
    }
  };

  // Cancellation functions
  const handleOpenCancellationDialog = (order: Order) => {
    if (order.status !== 'completed') {
      setCancellationError('Seules les commandes terminées peuvent être annulées');
      return;
    }
    setOrderToCancel(order);
    setCancellationDialogOpen(true);
    setCancellationReason('');
    setCancellationError('');
    setCancellationSuccess('');
  };

  const handleCloseCancellationDialog = () => {
    setCancellationDialogOpen(false);
    setOrderToCancel(null);
    setCancellationReason('');
    setCancellationError('');
    setCancellationSuccess('');
  };

  const handleCancelOrder = async () => {
    if (!orderToCancel || !cancellationReason.trim()) {
      setCancellationError('Veuillez fournir une raison pour l\'annulation');
      return;
    }

    setCancellationLoading(true);
    setCancellationError('');

    try {
      const response = await apiService.post('/orders/cancel-order', {
        orderId: parseInt(orderToCancel.id),
        reason: cancellationReason.trim()
      });
      
      setCancellationSuccess((response.data as any).message);
      
      // Refresh orders list
      await loadOrders();
      
      // Close dialog after a short delay
      setTimeout(() => {
        handleCloseCancellationDialog();
      }, 2000);
      
    } catch (error: any) {
      setCancellationError(error.response?.data?.error || 'Erreur lors de l\'annulation de la commande');
    } finally {
      setCancellationLoading(false);
    }
  };

  const returnTotals = calculateReturnTotals();

  // Function to fetch and show receipt
  const handleShowReceipt = async (orderId: number, type: 'detailed' | 'summary' = 'detailed') => {
    try {
      const response = await fetch(`http://localhost:3001/api/legal/receipt/${orderId}?type=${type}`);
      if (!response.ok) throw new Error('Failed to fetch receipt');
      const receipt = await response.json();
      
      // Map business info from backend format to frontend format
      if (receipt.business_info) {
        receipt.business_info = mapBusinessInfoFromBackend(receipt.business_info);
      }
      
      setCurrentReceipt(receipt);
      setReceiptType(type);
      setReceiptDialogOpen(true);
    } catch (error) {
      alert('Erreur lors de la génération du reçu');
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Dashboard & Historique</Typography>
      <Grid container spacing={3}>
        {/* Dashboard */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6">Chiffre d'affaires du jour</Typography>
              <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>{stats.caJour.toFixed(2)} €</Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2">Ventes du jour : <b>{stats.ventesJour}</b></Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2" sx={{ mb: 1 }}>Top produits :</Typography>
              {stats.topProduits.map((prod, i) => (
                <Typography key={i} variant="body2">{prod.name} <b>x{prod.qty}</b></Typography>
              ))}
            </CardContent>
          </Card>
        </Grid>
        {/* Graphique mock */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 2, minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart sx={{ fontSize: 80, color: 'grey.300', mr: 2 }} />
            <Typography variant="body2" color="text.secondary">Graphique d'évolution des ventes (à venir)</Typography>
          </Card>
        </Grid>
        {/* Historique des commandes */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                              <Typography variant="h6" sx={{ flexGrow: 1 }}>Historique des commandes</Typography>
              <TextField
                size="small"
                placeholder="Rechercher..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1 }} />
                }}
                sx={{ width: 250 }}
              />
            </Box>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell>Tips</TableCell>
                      <TableCell>Statut</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredOrders.map(order => (
                      <React.Fragment key={order.id}>
                        <TableRow hover selected={selectedOrder?.id === order.id}>
                          <TableCell>#{order.id}</TableCell>
                          <TableCell>{order.createdAt.toLocaleString('fr-FR')}</TableCell>
                          <TableCell>
                            {order.items.length === 0 && order.change && Number(order.change) > 0 ? (
                              <Typography variant="body2" color="text.primary" sx={{ fontWeight: 'medium' }}>
                                0.00 €
                              </Typography>
                            ) : (
                              `${order.finalAmount.toFixed(2)} €`
                            )}
                          </TableCell>
                          <TableCell>
                            {order.tips && Number(order.tips) > 0 ? (
                              <Chip 
                                label={`+${Number(order.tips).toFixed(2)}€`} 
                                color="success" 
                                size="small"
                                variant="outlined"
                              />
                            ) : order.change && Number(order.change) > 0 ? (
                              <Chip 
                                label={`Change ${Number(order.change).toFixed(2)}€`} 
                                color="info" 
                                size="small"
                                variant="outlined"
                              />
                            ) : (
                              <Typography variant="body2" color="text.secondary">-</Typography>
                            )}
                          </TableCell>
                          <TableCell>{order.status}</TableCell>
                          <TableCell align="right">
                            <IconButton 
                              size="small" 
                              onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                              color={selectedOrder?.id === order.id ? "primary" : "default"}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                        
                        {/* Détail commande sous la ligne sélectionnée */}
                        {selectedOrder?.id === order.id && (
                          <TableRow>
                            <TableCell colSpan={6} sx={{ py: 0, border: 0 }}>
                              <Box sx={{ 
                                p: 3, 
                                border: '2px solid #1976d2', 
                                borderRadius: 2, 
                                background: '#f8fafe',
                                my: 1 
                              }}>
                                <Typography variant="h6" sx={{ mb: 2, color: '#1976d2' }}>
                                  Détail de la commande #{selectedOrder.id}
                                </Typography>
                                
                                <Grid container spacing={3}>
                                  <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                      Informations générales
                                    </Typography>
                                    <Typography variant="body2">Date : {selectedOrder.createdAt.toLocaleString('fr-FR')}</Typography>
                                    <Typography variant="body2">Statut : {selectedOrder.status}</Typography>
                                    <Typography variant="body2">Sous-total : {(selectedOrder.finalAmount - selectedOrder.taxAmount).toFixed(2)} €</Typography>
                                    <Typography variant="body2">TVA : {selectedOrder.taxAmount.toFixed(2)} €</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                      Total : {selectedOrder.finalAmount.toFixed(2)} €
                                    </Typography>
                                    {/* Tips and Change Information */}
                                    {(selectedOrder.tips && Number(selectedOrder.tips) > 0) && (
                                      <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 'medium' }}>
                                        Pourboire : +{Number(selectedOrder.tips).toFixed(2)} €
                                      </Typography>
                                    )}
                                    {(selectedOrder.change && Number(selectedOrder.change) > 0) && (
                                      <Typography variant="body2" sx={{ color: 'info.main', fontWeight: 'medium' }}>
                                        {selectedOrder.items.length === 0 ? (
                                          `🔄 Changement de caisse : ${Number(selectedOrder.change).toFixed(2)} €`
                                        ) : (
                                          `Monnaie rendue : -${Number(selectedOrder.change).toFixed(2)} €`
                                        )}
                                      </Typography>
                                    )}
                                    {/* Motif d'annulation si commande négative */}
                                    {selectedOrder.notes && selectedOrder.notes.startsWith('ANNULATION') && (
                                      <Alert severity="info" sx={{ mt: 2, mb: 1 }}>
                                        <strong>Motif d'annulation :</strong> {selectedOrder.notes.replace(/.*Raison: /, '')}
                                      </Alert>
                                    )}
                                    
                                    {/* Payment Method Information */}
                                    <Divider sx={{ my: 1.5 }} />
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                      Mode de paiement
                                    </Typography>
                                    {selectedOrder.paymentMethod === 'split' ? (
                                      <Box>
                                        <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <Chip 
                                            label="Paiement mixte" 
                                            color="warning" 
                                            size="small"
                                            icon={<CreditCard />}
                                          />
                                        </Typography>
                                        {selectedOrder.subBills && selectedOrder.subBills.length > 0 ? (
                                          selectedOrder.subBills.map((subBill, index) => (
                                            <Typography key={subBill.id} variant="body2" sx={{ ml: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                              {subBill.paymentMethod === 'cash' ? (
                                                <Money sx={{ fontSize: 16, color: '#4caf50' }} />
                                              ) : (
                                                <CreditCard sx={{ fontSize: 16, color: '#2196f3' }} />
                                              )}
                                              {subBill.paymentMethod === 'cash' ? 'Espèces' : 'Carte'} : {subBill.amount.toFixed(2)} €
                                            </Typography>
                                          ))
                                        ) : (
                                          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                                            Détails du paiement mixte non disponibles
                                          </Typography>
                                        )}
                                      </Box>
                                    ) : (
                                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {selectedOrder.paymentMethod === 'cash' ? (
                                          <>
                                            <Money sx={{ fontSize: 16, color: '#4caf50' }} />
                                            <Chip label="Espèces" color="success" size="small" />
                                          </>
                                        ) : (
                                          <>
                                            <CreditCard sx={{ fontSize: 16, color: '#2196f3' }} />
                                            <Chip label="Carte bancaire" color="primary" size="small" />
                                          </>
                                        )}
                                      </Typography>
                                    )}
                                  </Grid>
                                  
                                  <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                      Articles commandés ({selectedOrder.items.length})
                                    </Typography>
                                    <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                                      {selectedOrder.items.map((item, index) => (
                                        <Box key={item.id} sx={{ 
                                          mb: 1, 
                                          p: 1, 
                                          border: '1px solid #ddd', 
                                          borderRadius: 1, 
                                          background: '#fff' 
                                        }}>
                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                              {item.productName}
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                              {item.totalPrice.toFixed(2)} €
                                            </Typography>
                                          </Box>
                                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                                            {item.isOffert && (
                                              <Typography variant="caption" sx={{ 
                                                background: '#4caf50', 
                                                color: 'white', 
                                                px: 1, 
                                                py: 0.25, 
                                                borderRadius: 1,
                                                fontSize: '0.7rem'
                                              }}>
                                                OFFERT
                                              </Typography>
                                            )}
                                            {item.isHappyHourApplied && (
                                              <Typography variant="caption" sx={{ 
                                                background: '#ff9800', 
                                                color: 'white', 
                                                px: 1, 
                                                py: 0.25, 
                                                borderRadius: 1,
                                                fontSize: '0.7rem'
                                              }}>
                                                HAPPY HOUR AUTO
                                              </Typography>
                                            )}
                                            {item.isManualHappyHour && (
                                              <Typography variant="caption" sx={{ 
                                                background: '#9c27b0', 
                                                color: 'white', 
                                                px: 1, 
                                                py: 0.25, 
                                                borderRadius: 1,
                                                fontSize: '0.7rem'
                                              }}>
                                                HAPPY HOUR MANUEL
                                              </Typography>
                                            )}
                                          </Box>
                                          {(item.isOffert || item.isHappyHourApplied || item.isManualHappyHour) && item.originalPrice && (
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                              Prix original: {item.originalPrice.toFixed(2)} €
                                            </Typography>
                                          )}
                                        </Box>
                                      ))}
                                    </Box>
                                  </Grid>
                                </Grid>
                                
                                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                                  <Button 
                                    variant="outlined" 
                                    color="primary" 
                                    size="small" 
                                    onClick={() => setSelectedOrder(null)}
                                  >
                                    Fermer
                                  </Button>
                                  {selectedOrder.status === 'completed' && (
                                    <Button
                                      variant="outlined"
                                      color="success"
                                      size="small"
                                      startIcon={<Print />}
                                      onClick={() => handleShowReceipt(Number(selectedOrder.id), 'detailed')}
                                    >
                                      Imprimer le reçu
                                    </Button>
                                  )}
                                  {selectedOrder.status === 'completed' && (
                                    <Button
                                      variant="outlined"
                                      color="warning"
                                      size="small"
                                      startIcon={<SwapHorizIcon />}
                                      onClick={() => handleOpenReturnDialog(selectedOrder)}
                                    >
                                      Retour basé sur historique
                                    </Button>
                                  )}
                                  {selectedOrder.status === 'completed' && (
                                    <Button
                                      variant="outlined"
                                      color="error"
                                      size="small"
                                      startIcon={<CancelIcon />}
                                      onClick={() => handleOpenCancellationDialog(selectedOrder)}
                                    >
                                      Annuler commande complète
                                    </Button>
                                  )}
                                </Box>
                              </Box>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      


      {/* Return Dialog */}
      <Dialog 
        open={returnDialogOpen} 
        onClose={handleCloseReturnDialog} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SwapHorizIcon color="warning" />
          Retour basé sur historique - Commande #{orderToReturn?.id}
        </DialogTitle>
        <DialogContent>
          {returnError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {returnError}
            </Alert>
          )}
          
          {returnSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {returnSuccess}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            🔄 Cette action créera un retour basé sur le mode de paiement original de la commande.
            Pour les paiements partagés, les montants seront répartis proportionnellement.
          </Typography>

          {/* Return Type */}
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isPartialReturn}
                  onChange={(e) => {
                    setIsPartialReturn(e.target.checked);
                    setSelectedItemsToReturn([]);
                  }}
                />
              }
              label="Retour partiel (sélectionner des articles spécifiques)"
            />
          </Box>

          {/* Item Selection for Partial Return */}
          {isPartialReturn && orderToReturn && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                Sélectionner les articles à retourner:
              </Typography>
              <List dense sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #ddd', borderRadius: 1 }}>
                {orderToReturn.items.map((item) => (
                  <ListItem key={item.id} sx={{ py: 0.5 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedItemsToReturn.includes(item.id)}
                          onChange={(e) => handleReturnItemSelectionChange(item.id, e.target.checked)}
                        />
                      }
                      label=""
                      sx={{ mr: 1 }}
                    />
                    <ListItemText
                      primary={`${item.productName} (x${item.quantity})`}
                      secondary={`TVA ${Math.round(item.taxRate * 100)}%`}
                    />
                    <ListItemSecondaryAction>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {item.totalPrice.toFixed(2)} €
                      </Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Payment Method Info */}
          {orderToReturn && (
            <Box sx={{ mb: 3, p: 2, border: '1px solid #ddd', borderRadius: 1, background: '#fff3e0' }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: '#e65100' }}>
                💳 Mode de paiement original: {orderToReturn.paymentMethod === 'split' ? 'Paiement partagé' : 
                  orderToReturn.paymentMethod === 'card' ? 'Carte' : 'Espèces'}
              </Typography>
              {orderToReturn.paymentMethod === 'split' && orderToReturn.subBills && orderToReturn.subBills.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  Le retour respectera la répartition originale: {orderToReturn.subBills.map((subBill, index) => (
                    <span key={subBill.id}>
                      {subBill.paymentMethod === 'card' ? 'Carte' : 'Espèces'}: {subBill.amount.toFixed(2)}€
                      {index < (orderToReturn.subBills?.length || 0) - 1 ? ', ' : ''}
                    </span>
                  ))}
                </Typography>
              )}
            </Box>
          )}

          {/* Tax Breakdown */}
          <Box sx={{ mb: 3, p: 2, border: '1px solid #ddd', borderRadius: 1, background: '#f9f9f9' }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
              💰 Détail du retour (montants négatifs):
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Montant HT:</strong> -{returnTotals.totalNet.toFixed(2)} €
                </Typography>
                <Typography variant="body2">
                  <strong>TVA 10%:</strong> -{returnTotals.taxBreakdown['10'].toFixed(2)} €
                </Typography>
                <Typography variant="body2">
                  <strong>TVA 20%:</strong> -{returnTotals.taxBreakdown['20'].toFixed(2)} €
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Total TVA:</strong> -{returnTotals.totalTax.toFixed(2)} €
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '1.1em', fontWeight: 'bold', color: '#f57c00' }}>
                  <strong>Total TTC:</strong> -{returnTotals.totalAmount.toFixed(2)} €
                </Typography>
              </Grid>
            </Grid>
          </Box>

          {/* Reason */}
          <TextField
            fullWidth
            label="Raison du retour (obligatoire)"
            multiline
            rows={3}
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            placeholder="Ex: Article défectueux, demande client, erreur de commande..."
            required
            error={returnReason.trim() === '' && returnError !== ''}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseReturnDialog} disabled={returnLoading}>
            Annuler
          </Button>
          <Button
            onClick={handleReturnOrder}
            color="warning"
            variant="contained"
            disabled={returnLoading || returnTotals.totalAmount === 0}
            startIcon={returnLoading ? <CircularProgress size={20} /> : <SwapHorizIcon />}
          >
            {returnLoading ? 'Retour...' : 'Confirmer le retour'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancellation Dialog */}
      <Dialog 
        open={cancellationDialogOpen} 
        onClose={handleCloseCancellationDialog} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CancelIcon color="error" />
          Annulation complète - Commande #{orderToCancel?.id}
        </DialogTitle>
        <DialogContent>
          {cancellationError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {cancellationError}
            </Alert>
          )}
          
          {cancellationSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {cancellationSuccess}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            ⚠️ Cette action annulera complètement la commande et créera des montants négatifs pour:
          </Typography>

          {/* Order Summary */}
          {orderToCancel && (
            <Box sx={{ mb: 3, p: 2, border: '1px solid #ffcdd2', borderRadius: 1, background: '#ffebee' }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold', color: '#c62828' }}>
                📋 Résumé de l'annulation:
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Montant commande:</strong> -{orderToCancel.finalAmount.toFixed(2)} €
                  </Typography>
                  <Typography variant="body2">
                    <strong>TVA:</strong> -{orderToCancel.taxAmount.toFixed(2)} €
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">
                    <strong>Pourboire:</strong> {orderToCancel.tips && Number(orderToCancel.tips) > 0 ? `-${Number(orderToCancel.tips).toFixed(2)} €` : '0.00 €'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Monnaie rendue:</strong> {orderToCancel.change && Number(orderToCancel.change) > 0 ? `+${Number(orderToCancel.change).toFixed(2)} €` : '0.00 €'}
                  </Typography>
                </Grid>
              </Grid>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#c62828' }}>
                <strong>Total remboursé:</strong> -{(orderToCancel.finalAmount + (Number(orderToCancel.tips) || 0) - (Number(orderToCancel.change) || 0)).toFixed(2)} €
              </Typography>
            </Box>
          )}

          {/* Payment Method Info */}
          {orderToCancel && (
            <Box sx={{ mb: 3, p: 2, border: '1px solid #ddd', borderRadius: 1, background: '#fff3e0' }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: '#e65100' }}>
                💳 Mode de paiement original: {orderToCancel.paymentMethod === 'split' ? 'Paiement partagé' : 
                  orderToCancel.paymentMethod === 'card' ? 'Carte' : 'Espèces'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Le remboursement respectera le mode de paiement original de la commande.
              </Typography>
            </Box>
          )}

          {/* Reason */}
          <TextField
            fullWidth
            label="Raison de l'annulation (obligatoire)"
            multiline
            rows={3}
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            placeholder="Ex: Erreur de commande, demande client, test système..."
            required
            error={cancellationReason.trim() === '' && cancellationError !== ''}
            helperText="Cette raison sera enregistrée dans le journal légal pour conformité fiscale"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCancellationDialog} disabled={cancellationLoading}>
            Annuler
          </Button>
          <Button
            onClick={handleCancelOrder}
            color="error"
            variant="contained"
            disabled={cancellationLoading || cancellationReason.trim() === ''}
            startIcon={cancellationLoading ? <CircularProgress size={20} /> : <CancelIcon />}
          >
            {cancellationLoading ? 'Annulation...' : 'Confirmer l\'annulation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={receiptDialogOpen} onClose={() => setReceiptDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Print />
            Reçu de Paiement
          </Typography>
        </DialogTitle>
        <DialogContent>
          {currentReceipt && (
            <Box sx={{ pt: 2 }}>
              <Box sx={{ mb: 2 }}>
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Type de reçu</InputLabel>
                  <Select
                    value={receiptType}
                    label="Type de reçu"
                    onChange={(e) => {
                      const newType = e.target.value as 'detailed' | 'summary';
                      setReceiptType(newType);
                      handleShowReceipt(currentReceipt.order_id, newType);
                    }}
                  >
                    <MenuItem value="detailed">Reçu détaillé</MenuItem>
                    <MenuItem value="summary">Reçu simplifié (sans détails)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <LegalReceipt
                  order={{
                    id: currentReceipt.order_id,
                    sequence_number: currentReceipt.sequence_number,
                    total_amount: currentReceipt.total_amount,
                    total_tax: currentReceipt.total_tax,
                    payment_method: currentReceipt.payment_method,
                    created_at: currentReceipt.created_at,
                    items: currentReceipt.items || [],
                    vat_breakdown: currentReceipt.vat_breakdown || []
                  }}
                  businessInfo={currentReceipt.business_info}
                  receiptType={receiptType}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            startIcon={<Print />} 
            variant="outlined"
            onClick={async () => {
              try {
                const response = await fetch(`http://localhost:3001/api/legal/receipt/${currentReceipt.order_id}/thermal-print?type=${receiptType}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' }
                });
                
                if (response.ok) {
                  const result = await response.json();
                  alert('Reçu imprimé avec succès sur l\'imprimante thermique!');
                } else {
                  const error = await response.json();
                  alert(`Erreur d'impression: ${error.details || error.error}`);
                }
              } catch (error) {
                console.error('Error thermal printing:', error);
                alert('Erreur lors de l\'impression thermique');
              }
            }}
          >
            Imprimer (Thermique)
          </Button>
          <Button 
            startIcon={<Print />} 
            variant="text"
            onClick={() => window.print()}
          >
            Aperçu navigateur
          </Button>
          <Button onClick={() => setReceiptDialogOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HistoryDashboard; 