import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Typography,
  Box,
  Button,
  useTheme,
  useMediaQuery,
  TablePagination,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Print,
  SwapHoriz as SwapHorizIcon,
} from '@mui/icons-material';
import { Order } from '../../types';

interface OrdersTableProps {
  orders: Order[];
  loading: boolean;
  onViewOrder: (order: Order) => void;
  onPrintReceipt: (order: Order, type: 'detailed' | 'summary') => void;
  onReturnOrder: (order: Order) => void;
  formatCurrency: (amount: number) => string;
  formatDateTime: (date: Date | string) => string;
  getPaymentMethodLabel: (method: string) => string;
  getStatusColor: (
    status: string
  ) => 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  getOrderSummary: (order: Order) => string;
}

const OrdersTable: React.FC<OrdersTableProps> = ({
  orders,
  loading,
  onViewOrder,
  onPrintReceipt,
  onReturnOrder,
  formatCurrency,
  formatDateTime,
  getPaymentMethodLabel,
  getStatusColor,
  getOrderSummary,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Calculate pagination
  const startIndex = page * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedOrders = orders.slice(startIndex, endIndex);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return (
      <Paper>
        <Box p={3} textAlign="center">
          <Typography>Chargement des commandes...</Typography>
        </Box>
      </Paper>
    );
  }

  if (orders.length === 0) {
    return (
      <Paper>
        <Box p={3} textAlign="center">
          <Typography color="textSecondary">Aucune commande trouvée</Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table size={isMobile ? 'small' : 'medium'}>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Date & Heure</TableCell>
            {!isMobile && <TableCell>Articles</TableCell>}
            <TableCell>Total</TableCell>
            <TableCell>Paiement</TableCell>
            <TableCell>Statut</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedOrders.map(order => (
            <TableRow
              key={order.id}
              sx={{
                '&:hover': { backgroundColor: theme.palette.action.hover },
                cursor: 'pointer',
              }}
              onClick={() => onViewOrder(order)}
            >
              <TableCell>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                  }}
                >
                  {order.id.substring(0, 8)}...
                </Typography>
              </TableCell>

              <TableCell>
                <Typography variant="body2">{formatDateTime(order.createdAt)}</Typography>
              </TableCell>

              {!isMobile && (
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      maxWidth: 200,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {getOrderSummary(order)}
                  </Typography>
                </TableCell>
              )}

              <TableCell>
                <Typography variant="body2" fontWeight="bold">
                  {formatCurrency(order.totalAmount)}
                </Typography>
                {order.tips && order.tips > 0 && (
                  <Typography variant="caption" color="textSecondary">
                    +{formatCurrency(order.tips)} pourboire
                  </Typography>
                )}
              </TableCell>

              <TableCell>
                <Chip
                  label={getPaymentMethodLabel(order.paymentMethod)}
                  size="small"
                  variant="outlined"
                />
              </TableCell>

              <TableCell>
                <Chip
                  label={
                    order.status === 'completed'
                      ? 'Terminé'
                      : order.status === 'pending'
                        ? 'En attente'
                        : 'Annulé'
                  }
                  size="small"
                  color={getStatusColor(order.status)}
                />
              </TableCell>

              <TableCell align="center" onClick={e => e.stopPropagation()}>
                <Box display="flex" gap={0.5} justifyContent="center">
                  <IconButton size="small" onClick={() => onViewOrder(order)} title="Voir détails">
                    <VisibilityIcon fontSize="small" />
                  </IconButton>

                  <IconButton
                    size="small"
                    onClick={() => onPrintReceipt(order, 'detailed')}
                    title="Imprimer reçu"
                  >
                    <Print fontSize="small" />
                  </IconButton>

                  {order.status === 'completed' && (
                    <IconButton
                      size="small"
                      onClick={() => onReturnOrder(order)}
                      title="Retour"
                      color="warning"
                    >
                      <SwapHorizIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>

                {/* Mobile: Additional actions as buttons */}
                {isMobile && (
                  <Box mt={1} display="flex" gap={0.5}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => onPrintReceipt(order, 'detailed')}
                      sx={{ fontSize: '0.7rem', minWidth: 'auto', px: 1 }}
                    >
                      Reçu
                    </Button>

                    {order.status === 'completed' && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        onClick={() => onReturnOrder(order)}
                        sx={{ fontSize: '0.7rem', minWidth: 'auto', px: 1 }}
                      >
                        Retour
                      </Button>
                    )}
                  </Box>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination Controls */}
      <TablePagination
        component="div"
        count={orders.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[25, 50, 100, 200]}
        labelRowsPerPage="Commandes par page:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`
        }
      />
    </TableContainer>
  );
};

export default OrdersTable;
