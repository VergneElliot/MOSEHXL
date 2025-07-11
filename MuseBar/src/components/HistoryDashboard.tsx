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
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Print
} from '@mui/icons-material';
import { ApiService } from '../services/apiService';
import { Order } from '../types';
import LegalReceipt from './LegalReceipt';


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
  
  // Cancellation dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedItemsToCancel, setSelectedItemsToCancel] = useState<string[]>([]);
  const [isPartialCancellation, setIsPartialCancellation] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState('');
  const [cancelError, setCancelError] = useState('');
  
  // Receipt dialog state
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<any>(null);
  const [receiptType, setReceiptType] = useState<'detailed' | 'summary'>('detailed');

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

  // Cancellation functions
  const handleOpenCancelDialog = (order: Order) => {
    if (order.status !== 'completed') {
      setCancelError('Seules les commandes terminées peuvent être annulées');
      return;
    }
    setOrderToCancel(order);
    setCancelDialogOpen(true);
    setCancelReason('');
    setSelectedItemsToCancel([]);
    setIsPartialCancellation(false);
    setCancelError('');
    setCancelSuccess('');
  };

  const handleCloseCancelDialog = () => {
    setCancelDialogOpen(false);
    setOrderToCancel(null);
    setCancelReason('');
    setSelectedItemsToCancel([]);
    setIsPartialCancellation(false);
    setCancelError('');
    setCancelSuccess('');
  };

  const calculateCancellationTotals = () => {
    if (!orderToCancel) return { totalAmount: 0, totalTax: 0, totalNet: 0, taxBreakdown: { '10': 0, '20': 0 } };
    
    const itemsToCancel = isPartialCancellation 
      ? orderToCancel.items.filter(item => selectedItemsToCancel.includes(item.id))
      : orderToCancel.items;
    
    let totalAmount = 0;
    let totalTax = 0;
    const taxBreakdown = { '10': 0, '20': 0 };
    
    itemsToCancel.forEach(item => {
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

  const handleCancelOrder = async () => {
    if (!orderToCancel || !cancelReason.trim()) {
      setCancelError('Veuillez fournir une raison pour l\'annulation');
      return;
    }

    if (isPartialCancellation && selectedItemsToCancel.length === 0) {
      setCancelError('Veuillez sélectionner au moins un article à annuler');
      return;
    }

    setCancelLoading(true);
    setCancelError('');

    try {
      const cancelData: any = {
        reason: cancelReason.trim()
      };

      if (isPartialCancellation) {
        cancelData.partial_items = selectedItemsToCancel.map(itemId => ({ item_id: parseInt(itemId) }));
      }

      const response = await apiService.post(`/orders/${orderToCancel.id}/cancel`, cancelData);
      
      setCancelSuccess((response.data as any).message);
      
      // Refresh orders list
      await loadOrders();
      
      // Close dialog after a short delay
      setTimeout(() => {
        handleCloseCancelDialog();
      }, 2000);
      
    } catch (error: any) {
      // If backend returns both error and legal, combine as JSON string
      if (error.response?.data?.legal) {
        setCancelError(JSON.stringify({ error: error.response.data.error, legal: error.response.data.legal }));
      } else {
        setCancelError(error.response?.data?.error || 'Erreur lors de l\'annulation de la commande');
      }
    } finally {
      setCancelLoading(false);
    }
  };

  const handleItemSelectionChange = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItemsToCancel(prev => [...prev, itemId]);
    } else {
      setSelectedItemsToCancel(prev => prev.filter(id => id !== itemId));
    }
  };

  const cancellationTotals = calculateCancellationTotals();

  // Function to fetch and show receipt
  const handleShowReceipt = async (orderId: number, type: 'detailed' | 'summary' = 'detailed') => {
    try {
      const response = await fetch(`http://localhost:3001/api/legal/receipt/${orderId}?type=${type}`);
      if (!response.ok) throw new Error('Failed to fetch receipt');
      const receipt = await response.json();
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
                                      color="error"
                                      size="small"
                                      startIcon={<CancelIcon />}
                                      onClick={() => handleOpenCancelDialog(selectedOrder)}
                                    >
                                      Annuler la commande
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
      
      {/* Cancellation Dialog */}
      <Dialog 
        open={cancelDialogOpen} 
        onClose={handleCloseCancelDialog} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" />
          Annulation de commande #{orderToCancel?.id}
        </DialogTitle>
        <DialogContent>
          {cancelError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {cancelError}
              {/* Display legal info if present in the error string (JSON) */}
              {(() => {
                try {
                  const err = JSON.parse(cancelError);
                  return (
                    <>
                      <br />
                      {err.legal && <span style={{ fontWeight: 'bold', color: '#b71c1c' }}>{err.legal}</span>}
                    </>
                  );
                } catch {
                  return null;
                }
              })()}
            </Alert>
          )}
          
          {cancelSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {cancelSuccess}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            ⚠️ Cette action créera des écritures comptables négatives pour maintenir la conformité légale.
            Les montants seront déduits des totaux de taxes et du chiffre d'affaires.
          </Typography>

          {/* Cancellation Type */}
          <Box sx={{ mb: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isPartialCancellation}
                  onChange={(e) => {
                    setIsPartialCancellation(e.target.checked);
                    setSelectedItemsToCancel([]);
                  }}
                />
              }
              label="Annulation partielle (sélectionner des articles spécifiques)"
            />
          </Box>

          {/* Item Selection for Partial Cancellation */}
          {isPartialCancellation && orderToCancel && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                Sélectionner les articles à annuler:
              </Typography>
              <List dense sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #ddd', borderRadius: 1 }}>
                {orderToCancel.items.map((item) => (
                  <ListItem key={item.id} sx={{ py: 0.5 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedItemsToCancel.includes(item.id)}
                          onChange={(e) => handleItemSelectionChange(item.id, e.target.checked)}
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

          {/* Tax Breakdown */}
          <Box sx={{ mb: 3, p: 2, border: '1px solid #ddd', borderRadius: 1, background: '#f9f9f9' }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
              💰 Détail de l'annulation (montants négatifs):
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Montant HT:</strong> -{cancellationTotals.totalNet.toFixed(2)} €
                </Typography>
                <Typography variant="body2">
                  <strong>TVA 10%:</strong> -{cancellationTotals.taxBreakdown['10'].toFixed(2)} €
                </Typography>
                <Typography variant="body2">
                  <strong>TVA 20%:</strong> -{cancellationTotals.taxBreakdown['20'].toFixed(2)} €
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Total TVA:</strong> -{cancellationTotals.totalTax.toFixed(2)} €
                </Typography>
                <Typography variant="body2" sx={{ fontSize: '1.1em', fontWeight: 'bold', color: '#d32f2f' }}>
                  <strong>Total TTC:</strong> -{cancellationTotals.totalAmount.toFixed(2)} €
                </Typography>
              </Grid>
            </Grid>
          </Box>

          {/* Reason */}
          <TextField
            fullWidth
            label="Raison de l'annulation (obligatoire)"
            multiline
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Ex: Erreur de commande, problème qualité, demande client..."
            required
            error={cancelReason.trim() === '' && cancelError !== ''}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCancelDialog} disabled={cancelLoading}>
            Annuler
          </Button>
          <Button
            onClick={handleCancelOrder}
            color="error"
            variant="contained"
            disabled={cancelLoading || cancellationTotals.totalAmount === 0}
            startIcon={cancelLoading ? <CircularProgress size={20} /> : <CancelIcon />}
          >
            {cancelLoading ? 'Annulation...' : 'Confirmer l\'annulation'}
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
            onClick={() => window.print()}
          >
            Imprimer
          </Button>
          <Button onClick={() => setReceiptDialogOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HistoryDashboard; 