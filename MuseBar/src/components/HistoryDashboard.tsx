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
  TablePagination,
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
  SwapHoriz as SwapHorizIcon
} from '@mui/icons-material';
import { ApiService } from '../services/apiService';
import { apiConfig } from '../config/api';
import { Order } from '../types';
import LegalReceipt from './LegalReceipt';
import { mapBusinessInfoFromBackend } from '../utils/businessInfoMapper';


const HistoryDashboard: React.FC = () => {
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    caJour: 0,
    ventesJour: 0,
    topProduits: [] as Array<{ name: string; qty: number }>,
    cardTotal: 0,
    cashTotal: 0,
    businessDayPeriod: null as any
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
  const [selectedTipToReturn, setSelectedTipToReturn] = useState<boolean>(false);
  const [isPartialReturn, setIsPartialReturn] = useState(false);
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState('');
  const [returnError, setReturnError] = useState('');

  const apiService = ApiService.getInstance();

  useEffect(() => {
    loadOrders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      
      // Load paginated orders list
      const { orders: pageOrders, total } = await apiService.getOrdersPaginated({
        limit: pageSize,
        offset: page * pageSize,
        search: search && search.trim() !== '' ? search.trim() : undefined
      });
      // Map sub_bills to subBills for frontend compatibility (safety)
      const mappedOrders = pageOrders.map(order => ({
        ...order,
        subBills: (order as any)['sub_bills'] || (order as any).subBills || []
      }));
      setOrders(mappedOrders);
      setTotal(total || 0);
      
      // Load business day statistics
      const businessDayResponse = await apiService.get('/legal/business-day-stats');
      const businessDayData = businessDayResponse.data as any;
      
      setStats({
        caJour: businessDayData.stats.total_ttc || 0,
        ventesJour: businessDayData.stats.total_sales || 0,
        topProduits: businessDayData.stats.top_products || [],
        cardTotal: businessDayData.stats.card_total || 0,
        cashTotal: businessDayData.stats.cash_total || 0,
        businessDayPeriod: businessDayData.business_day_period || null
      });
    } catch (error) {
      console.error('Failed to load orders or business day stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders;



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
    setSelectedTipToReturn(false);
    setIsPartialReturn(false);
    setReturnError('');
    setReturnSuccess('');
  };

  const handleCloseReturnDialog = () => {
    setReturnDialogOpen(false);
    setOrderToReturn(null);
    setReturnReason('');
    setSelectedItemsToReturn([]);
    setSelectedTipToReturn(false);
    setIsPartialReturn(false);
    setReturnError('');
    setReturnSuccess('');
  };

  const calculateReturnTotals = () => {
    if (!orderToReturn) return { totalAmount: 0, totalTax: 0, totalNet: 0, taxBreakdown: { '10': 0, '20': 0 }, isChangeOperation: false, isTipOperation: false };
    
    // Check if this is a "Faire de la monnaie" operation
    const isChangeOperation = 
      orderToReturn.items.length === 0 &&
      orderToReturn.totalAmount === 0 &&
      orderToReturn.taxAmount === 0 &&
      orderToReturn.notes &&
      orderToReturn.notes.includes('Faire de la Monnaie');

    // Check if this is a tip reversal operation
    const isTipOperation = 
      orderToReturn.items.length === 0 &&
      orderToReturn.totalAmount === 0 &&
      orderToReturn.taxAmount === 0 &&
      orderToReturn.notes &&
      orderToReturn.notes.includes('ANNULATION pourboire');
    
    // For change operations, we allow cancellation even with 0 amount
    if (isChangeOperation) {
      return {
        totalAmount: 1, // Set to 1 to enable the button, actual reversal handled by backend
        displayAmount: 0, // Display amount for UI
        totalTax: 0,
        totalNet: 0,
        taxBreakdown: { '10': 0, '20': 0 },
        isChangeOperation: true,
        isTipOperation: false
      };
    }

    // For tip operations, we allow cancellation even with 0 amount
    if (isTipOperation) {
      return {
        totalAmount: 1, // Set to 1 to enable the button, actual reversal handled by backend
        displayAmount: 0, // Display amount for UI
        totalTax: 0,
        totalNet: 0,
        taxBreakdown: { '10': 0, '20': 0 },
        isChangeOperation: false,
        isTipOperation: true
      };
    }
    
    const itemsToReturn = isPartialReturn 
      ? orderToReturn.items.filter(item => selectedItemsToReturn.includes(item.id))
      : orderToReturn.items;
    
    let totalAmount = 0;
    let totalTax = 0;
    const taxBreakdown = { '10': 0, '20': 0 };
    
    itemsToReturn.forEach(item => {
      const itemTotal = item.totalPrice;
      // Use the pre-calculated tax amount from the order item
      const itemTaxAmount = item.taxAmount || 0;
      // Convert decimal to percentage for display (0.10 -> 10)
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
      displayAmount: totalAmount, // Same as totalAmount for regular operations
      totalTax,
      totalNet: totalAmount - totalTax,
      taxBreakdown,
      isChangeOperation: false,
      isTipOperation: false
    };
  };

  const handleReturnOrder = async () => {
    if (!orderToReturn || !returnReason.trim()) {
      setReturnError('Veuillez fournir une raison pour le retour');
      return;
    }

    if (isPartialReturn && selectedItemsToReturn.length === 0 && !selectedTipToReturn) {
      setReturnError('Veuillez sélectionner au moins un article ou le pourboire à retourner');
      return;
    }

    setReturnLoading(true);
    setReturnError('');

    try {
      const itemsToReturn = isPartialReturn 
        ? selectedItemsToReturn.map(itemId => ({ item_id: parseInt(itemId) }))
        : orderToReturn.items.map(item => ({ item_id: parseInt(item.id) }));

      // Use unified cancellation endpoint
      const response = await apiService.post('/orders/cancel-unified', {
        orderId: parseInt(orderToReturn.id),
        reason: returnReason.trim(),
        cancellationType: isPartialReturn ? 'partial' : 'full',
        itemsToCancel: isPartialReturn ? itemsToReturn : undefined,
        includeTipReversal: isPartialReturn ? selectedTipToReturn : (orderToReturn.tips || 0) > 0
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

  const returnTotals = calculateReturnTotals();

  // Function to fetch and show receipt
  const handleShowReceipt = async (orderId: number, type: 'detailed' | 'summary' = 'detailed') => {
    try {
              const response = await fetch(apiConfig.getEndpoint(`/api/legal/receipt/${orderId}?type=${type}`));
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
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Chiffre d'affaires de la journée</Typography>
              <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold', mb: 2 }}>
                {stats.caJour.toFixed(2)} €
              </Typography>
              
              {/* Business day period info */}
              {stats.businessDayPeriod && (
                <Box sx={{ mb: 2, p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
                  <Typography variant="caption" color="info.dark" sx={{ fontWeight: 'bold' }}>
                    📅 Journée d'activité: {new Date(stats.businessDayPeriod.start).toLocaleDateString('fr-FR')} {stats.businessDayPeriod.closure_time} → {new Date(stats.businessDayPeriod.end).toLocaleDateString('fr-FR')} {stats.businessDayPeriod.closure_time}
                  </Typography>
                </Box>
              )}
              
              <Divider sx={{ my: 1.5 }} />
              
              {/* Sales count */}
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                Ventes de la journée : <b>{stats.ventesJour}</b>
              </Typography>
              
              {/* Payment breakdown */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>Répartition des paiements :</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <CreditCard sx={{ fontSize: 16, color: 'primary.main' }} />
                    <Typography variant="body2">Carte :</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {stats.cardTotal.toFixed(2)} €
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Money sx={{ fontSize: 16, color: 'success.main' }} />
                    <Typography variant="body2">Espèces :</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {stats.cashTotal.toFixed(2)} €
                  </Typography>
                </Box>
              </Box>
              
              <Divider sx={{ my: 1.5 }} />
              
              {/* Top products */}
              <Box>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>Top produits :</Typography>
                {stats.topProduits.length > 0 ? (
                  stats.topProduits.map((prod, i) => (
                    <Typography key={i} variant="body2" sx={{ mb: 0.5 }}>
                      {prod.name} <b>x{prod.qty}</b>
                    </Typography>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Aucune vente pour cette journée
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        {/* Payment Methods Breakdown Chart */}
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 2, minHeight: 180 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Répartition des paiements</Typography>
              {stats.caJour > 0 ? (
                <Box>
                  {/* Card payments */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CreditCard sx={{ color: 'primary.main' }} />
                        <Typography variant="body1">Paiements Carte</Typography>
                      </Box>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        {((stats.cardTotal / stats.caJour) * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      width: '100%', 
                      height: 12, 
                      bgcolor: 'grey.200', 
                      borderRadius: 1,
                      overflow: 'hidden'
                    }}>
                      <Box sx={{ 
                        width: `${(stats.cardTotal / stats.caJour) * 100}%`,
                        height: '100%',
                        bgcolor: 'primary.main',
                        transition: 'width 0.5s ease-in-out'
                      }} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {stats.cardTotal.toFixed(2)} €
                    </Typography>
                  </Box>
                  
                  {/* Cash payments */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Money sx={{ color: 'success.main' }} />
                        <Typography variant="body1">Paiements Espèces</Typography>
                      </Box>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        {((stats.cashTotal / stats.caJour) * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      width: '100%', 
                      height: 12, 
                      bgcolor: 'grey.200', 
                      borderRadius: 1,
                      overflow: 'hidden'
                    }}>
                      <Box sx={{ 
                        width: `${(stats.cashTotal / stats.caJour) * 100}%`,
                        height: '100%',
                        bgcolor: 'success.main',
                        transition: 'width 0.5s ease-in-out'
                      }} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {stats.cashTotal.toFixed(2)} €
                    </Typography>
                  </Box>
                  
                  {/* Total */}
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">Total</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {stats.caJour.toFixed(2)} €
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  minHeight: 120,
                  color: 'text.secondary'
                }}>
                  <BarChart sx={{ fontSize: 48, mb: 1 }} />
                  <Typography variant="body1">Aucune vente aujourd'hui</Typography>
                </Box>
              )}
            </CardContent>
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
                            ) : order.items.length === 0 && (
                              (order.change && Number(order.change) < 0) ||
                              (order.tips && Number(order.tips) < 0)
                            ) ? (
                              <Typography variant="body2" color="warning.main" sx={{ fontWeight: 'medium' }}>
                                0.00 € (reversal)
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
                            ) : order.tips && Number(order.tips) < 0 ? (
                              <Chip 
                                label={`🔄 Tip ${Number(order.tips).toFixed(2)}€ (0€ net)`} 
                                color="warning" 
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
                            ) : order.change && Number(order.change) < 0 ? (
                              <Chip 
                                label={`🔄 Change ${Number(order.change).toFixed(2)}€ (0€ net)`} 
                                color="warning" 
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
                                    {(selectedOrder.tips && Number(selectedOrder.tips) < 0) && (
                                      <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 'medium' }}>
                                        🔄 Annulation pourboire : {Number(selectedOrder.tips).toFixed(2)} € (net: 0.00 €)
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
                                    {(selectedOrder.change && Number(selectedOrder.change) < 0) && (
                                      <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 'medium' }}>
                                        🔄 Annulation monnaie : {Number(selectedOrder.change).toFixed(2)} € (net: 0.00 €)
                                      </Typography>
                                    )}
                                    {/* Commentary for cancellation orders */}
                                    {selectedOrder.notes && (
                                      selectedOrder.notes.includes('ANNULATION') || 
                                      selectedOrder.notes.includes('Retour') ||
                                      selectedOrder.notes.startsWith('[')
                                    ) && (
                                      <Alert severity="info" sx={{ mt: 2, mb: 1 }}>
                                        <strong>Commentaire de l'opération :</strong> <br />
                                        {(() => {
                                          const notes = selectedOrder.notes || '';
                                          // Try different patterns to extract the reason
                                          const patterns = [
                                            /Raison:\s*(.+?)(?:\s*-|$)/,
                                            /- Raison:\s*(.+?)(?:\s*-|$)/,
                                            /reason:\s*(.+?)(?:\s*-|$)/i,
                                            /Motif:\s*(.+?)(?:\s*-|$)/i,
                                            /Commentaire:\s*(.+?)(?:\s*-|$)/i,
                                            /\[.*?\]\s*ANNULATION.*?-\s*Commande\s*#\d+\s*-\s*Raison:\s*(.+?)(?:\s*-|$)/,
                                            /ANNULATION.*?-\s*Commande\s*#\d+\s*-\s*Raison:\s*(.+?)(?:\s*-|$)/,
                                            /RETOUR direct.*?-\s*Raison:\s*(.+?)(?:\s*-|$)/
                                          ];
                                          
                                          for (const pattern of patterns) {
                                            const match = notes.match(pattern);
                                            if (match && match[1] && match[1].trim()) {
                                              return match[1].trim();
                                            }
                                          }
                                          
                                          // If no pattern matches, try to extract any meaningful text after key words
                                          const fallbackPatterns = [
                                            /(?:ANNULATION|RETOUR).*?[:-]\s*(.+)/i,
                                            /\[.*?\]\s*(.+)/
                                          ];
                                          
                                          for (const pattern of fallbackPatterns) {
                                            const match = notes.match(pattern);
                                            if (match && match[1] && match[1].trim() && !match[1].includes('Commande #')) {
                                              return match[1].trim();
                                            }
                                          }
                                          
                                          // If still no match and it's clearly a cancellation/return, show the full notes
                                          if (notes.includes('ANNULATION') || notes.includes('RETOUR') || notes.startsWith('[')) {
                                            return notes;
                                          }
                                          
                                          return 'Aucun commentaire spécifique';
                                        })()}
                                      </Alert>
                                    )}
                                    
                                    {/* Payment Method Information */}
                                    <Divider sx={{ my: 1.5 }} />
                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                      Mode de paiement
                                    </Typography>
                                    {selectedOrder.paymentMethod === 'split' ? (
                                      <Box>
                                        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <Chip 
                                            label="Paiement mixte" 
                                            color="warning" 
                                            size="small"
                                            icon={<CreditCard />}
                                          />
                                        </Box>
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
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                                      </Box>
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
                                      Annuler / Retourner
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
                <TablePagination
                  component="div"
                  count={total}
                  page={page}
                  onPageChange={(_, p) => setPage(p)}
                  rowsPerPage={pageSize}
                  onRowsPerPageChange={e => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
                  rowsPerPageOptions={[25, 50, 100]}
                />
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
          Annulation / Retour - Commande #{orderToReturn?.id}
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
            🔄 <strong>Annulation complète</strong>: Annule tout (articles, pourboires, monnaie) avec reversements corrects aux totaux espèces/carte.
            <br />
            📋 <strong>Retour partiel</strong>: Retourne seulement les articles sélectionnés (garde pourboires/monnaie intacts).
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
                    setSelectedTipToReturn(false);
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
                      secondary={`TVA ${Math.round(item.taxRate)}%`}
                    />
                    <ListItemSecondaryAction>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {item.totalPrice.toFixed(2)} €
                      </Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
              
              {/* Tip Selection for Partial Return */}
              {orderToReturn && orderToReturn.tips !== undefined && orderToReturn.tips !== null && Number(orderToReturn.tips) > 0 && (
                <Box sx={{ mt: 2, p: 2, border: '1px solid #ddd', borderRadius: 1, background: '#f3e5f5' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedTipToReturn}
                        onChange={(e) => setSelectedTipToReturn(e.target.checked)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          💰 Pourboire: {Number(orderToReturn.tips || 0).toFixed(2)} €
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Cocher pour annuler le pourboire (remboursement: carte → espèces)
                        </Typography>
                      </Box>
                    }
                  />
                </Box>
              )}
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
            {returnTotals.isChangeOperation ? (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                  🔄 Opération de monnaie - Annulation
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cette opération inverse les mouvements de caisse (carte ↔ espèces)
                </Typography>
                <Typography variant="h6" sx={{ mt: 1, fontWeight: 'bold', color: '#f57c00' }}>
                  Total net: 0.00 €
                </Typography>
              </Box>
            ) : returnTotals.isTipOperation ? (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                  💰 Annulation de pourboire
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cette opération inverse le pourboire (carte → espèces)
                </Typography>
                <Typography variant="h6" sx={{ mt: 1, fontWeight: 'bold', color: '#f57c00' }}>
                  Total net: 0.00 €
                </Typography>
              </Box>
            ) : (
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
                    <strong>Total TTC:</strong> -{(returnTotals.displayAmount || returnTotals.totalAmount).toFixed(2)} €
                  </Typography>
                </Grid>
              </Grid>
            )}
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
            disabled={returnLoading || (returnTotals.totalAmount === 0 && !returnTotals.isChangeOperation && !returnTotals.isTipOperation) || returnReason.trim() === ''}
            startIcon={returnLoading ? <CircularProgress size={20} /> : <SwapHorizIcon />}
          >
            {returnLoading ? 'Retour...' : 'Confirmer le retour'}
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
                const response = await fetch(apiConfig.getEndpoint(`/api/legal/receipt/${currentReceipt.order_id}/thermal-print?type=${receiptType}`), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' }
                });
                
                if (response.ok) {
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