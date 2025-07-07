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
  CircularProgress
} from '@mui/material';
import { BarChart, Visibility as VisibilityIcon, Search as SearchIcon } from '@mui/icons-material';
import { ApiService } from '../services/apiService';
import { Order } from '../types';



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
  const apiService = ApiService.getInstance();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const ordersData = await apiService.getOrders();
      setOrders(ordersData);
      
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
                      <TableCell>Statut</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredOrders.map(order => (
                      <TableRow key={order.id} hover selected={selectedOrder?.id === order.id}>
                        <TableCell>#{order.id}</TableCell>
                        <TableCell>{order.createdAt.toLocaleString('fr-FR')}</TableCell>
                        <TableCell>{order.finalAmount.toFixed(2)} €</TableCell>
                        <TableCell>{order.status}</TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => setSelectedOrder(order)}>
                            <VisibilityIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
                          {/* Détail commande */}
            {selectedOrder && (
              <Box sx={{ mt: 3, p: 2, border: '1px solid #eee', borderRadius: 2, background: '#fafafa' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Détail de la commande #{selectedOrder.id}</Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Informations générales</Typography>
                    <Typography variant="body2">Date : {selectedOrder.createdAt.toLocaleString('fr-FR')}</Typography>
                    <Typography variant="body2">Statut : {selectedOrder.status}</Typography>
                    <Typography variant="body2">Sous-total : {(selectedOrder.finalAmount - selectedOrder.taxAmount).toFixed(2)} €</Typography>
                    <Typography variant="body2">TVA : {selectedOrder.taxAmount.toFixed(2)} €</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Total : {selectedOrder.finalAmount.toFixed(2)} €</Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Articles commandés ({selectedOrder.items.length})</Typography>
                    <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                      {selectedOrder.items.map((item, index) => (
                        <Box key={item.id} sx={{ mb: 1, p: 1, border: '1px solid #ddd', borderRadius: 1, background: '#fff' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{item.productName}</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{item.totalPrice.toFixed(2)} €</Typography>
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
                  <Button variant="contained" color="primary" size="small" onClick={() => setSelectedOrder(null)}>
                    Fermer
                  </Button>
                </Box>
              </Box>
            )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HistoryDashboard; 