import { useCallback } from 'react';
import { ApiService } from '../services/apiService';
import { Order } from '../types';
import { HistoryStats } from './useHistoryState';

export interface HistoryAPIActions {
  loadOrders: () => Promise<void>;
  loadStats: () => Promise<void>;
  processReturn: (returnData: ProcessReturnData) => Promise<void>;
  refreshData: () => Promise<void>;
}

export interface ProcessReturnData {
  order: Order;
  reason: string;
  selectedItems: string[];
  selectedTip: boolean;
  isPartial: boolean;
}

export const useHistoryAPI = (
  setOrders: (orders: Order[]) => void,
  setStats: (stats: HistoryStats) => void,
  setLoading: (loading: boolean) => void,
  setReturnLoading: (loading: boolean) => void,
  setReturnSuccess: (message: string) => void,
  setReturnError: (error: string) => void,
  closeReturnDialog: () => void
): HistoryAPIActions => {
  const apiService = ApiService.getInstance();

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const ordersData = await apiService.getOrders();

      // Map sub_bills to subBills for frontend compatibility
      const mappedOrders = ordersData.map(order => ({
        ...order,
        subBills: (order as any)['sub_bills'] || order.subBills || [],
      }));

      setOrders(mappedOrders);
    } catch (error) {
      console.error('Failed to load orders:', error);
      setReturnError('Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  }, [apiService, setOrders, setLoading, setReturnError]);

  const loadStats = useCallback(async () => {
    try {
      const businessDayResponse = await apiService.get('/legal/business-day-stats');
      const businessDayData = businessDayResponse.data as any;

      setStats({
        caJour: businessDayData.stats.total_ttc || 0,
        ventesJour: businessDayData.stats.total_sales || 0,
        topProduits: businessDayData.stats.top_products || [],
        cardTotal: businessDayData.stats.card_total || 0,
        cashTotal: businessDayData.stats.cash_total || 0,
        businessDayPeriod: businessDayData.business_day_period || null,
      });
    } catch (error) {
      console.error('Failed to load business day stats:', error);
      setReturnError('Erreur lors du chargement des statistiques');
    }
  }, [apiService, setStats, setReturnError]);

  const processReturn = useCallback(
    async (returnData: ProcessReturnData) => {
      const { order, reason, selectedItems, selectedTip, isPartial } = returnData;

      try {
        setReturnLoading(true);
        setReturnError('');

        if (isPartial) {
          // Process partial return
          if (selectedItems.length === 0 && !selectedTip) {
            setReturnError('Veuillez sélectionner au moins un article ou le pourboire à retourner');
            return;
          }

          // Create return transactions for selected items
          for (const itemId of selectedItems) {
            const item = order.items.find(i => i.id === itemId);
            if (item) {
              await apiService.post('/orders', {
                total_amount: -item.totalPrice,
                total_tax: -item.taxAmount,
                payment_method: order.paymentMethod,
                status: 'completed',
                notes: `RETOUR PARTIEL: ${reason} - ${item.productName}`,
                items: [
                  {
                    product_id: item.productId,
                    product_name: `RETOUR - ${item.productName}`,
                    quantity: -item.quantity,
                    unit_price: item.unitPrice,
                    total_price: -item.totalPrice,
                    tax_rate: item.taxRate,
                    tax_amount: -item.taxAmount,
                    happy_hour_applied: false,
                  },
                ],
                sub_bills: [],
                tips: 0,
                change: 0,
              });
            }
          }

          // Process tip return if selected
          if (selectedTip && order.tips && order.tips > 0) {
            await apiService.post('/orders', {
              total_amount: 0,
              total_tax: 0,
              payment_method: order.paymentMethod,
              status: 'completed',
              notes: `RETOUR POURBOIRE: ${reason}`,
              items: [],
              sub_bills: [],
              tips: -order.tips,
              change: 0,
            });
          }

          setReturnSuccess('Retour partiel traité avec succès');
        } else {
          // Process full return
          await apiService.post('/orders', {
            total_amount: -order.totalAmount,
            total_tax: -order.taxAmount,
            payment_method: order.paymentMethod,
            status: 'completed',
            notes: `RETOUR COMPLET: ${reason}`,
            items: order.items.map(item => ({
              product_id: item.productId,
              product_name: `RETOUR - ${item.productName}`,
              quantity: -item.quantity,
              unit_price: item.unitPrice,
              total_price: -item.totalPrice,
              tax_rate: item.taxRate,
              tax_amount: -item.taxAmount,
              happy_hour_applied: false,
            })),
            sub_bills: [],
            tips: order.tips ? -order.tips : 0,
            change: order.change ? -order.change : 0,
          });

          setReturnSuccess('Retour complet traité avec succès');
        }

        // Refresh data and close dialog
        setTimeout(() => {
          closeReturnDialog();
          loadOrders();
          loadStats();
        }, 1500);
      } catch (error: any) {
        console.error('Return processing failed:', error);
        const errorMessage =
          error.response?.data?.error || error.message || 'Erreur lors du traitement du retour';
        setReturnError(errorMessage);
      } finally {
        setReturnLoading(false);
      }
    },
    [
      apiService,
      setReturnLoading,
      setReturnError,
      setReturnSuccess,
      closeReturnDialog,
      loadOrders,
      loadStats,
    ]
  );

  const refreshData = useCallback(async () => {
    await Promise.all([loadOrders(), loadStats()]);
  }, [loadOrders, loadStats]);

  return {
    loadOrders,
    loadStats,
    processReturn,
    refreshData,
  };
};
