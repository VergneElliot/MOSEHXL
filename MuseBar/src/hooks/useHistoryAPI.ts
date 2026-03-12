import { useCallback, useMemo } from 'react';
import { ApiService } from '../services/apiService';
import { getBusinessDayStats } from '../services/api/legal';
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
  const apiService = useMemo(() => ApiService.getInstance(), []);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const ordersData = await apiService.getOrders();

      // Map sub_bills to subBills for frontend compatibility
      const mappedOrders = ordersData.map(order => ({
        ...order,
        // Normalize legacy backend field to frontend shape
        subBills: (order as unknown as { sub_bills?: Order['subBills'] })['sub_bills'] || order.subBills || [],
      }));

      setOrders(mappedOrders);
    } catch (error) {
      // Failed to load orders
      setReturnError('Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  }, [apiService, setOrders, setLoading, setReturnError]);

  const loadStats = useCallback(async () => {
    try {
      const businessDayData = await getBusinessDayStats();
      setStats({
        caJour: businessDayData.stats.total_ttc || 0,
        ventesJour: businessDayData.stats.total_sales || 0,
        topProduits: businessDayData.stats.top_products || [],
        cardTotal: businessDayData.stats.card_total || 0,
        cashTotal: businessDayData.stats.cash_total || 0,
        businessDayPeriod: businessDayData.business_day_period || null,
      });
    } catch {
      setReturnError('Erreur lors du chargement des statistiques');
    }
  }, [setStats, setReturnError]);

  const processReturn = useCallback(
    async (returnData: ProcessReturnData) => {
      const { order, reason, selectedItems, selectedTip, isPartial } = returnData;

      try {
        setReturnLoading(true);
        setReturnError('');

        if (isPartial) {
          if (selectedItems.length === 0 && !selectedTip) {
            setReturnError('Veuillez sélectionner au moins un article ou le pourboire à retourner');
            return;
          }

          // Resolve selected item IDs to DB-level numeric IDs.
          // order.items[].id is a string from the frontend; the cancel-unified endpoint
          // expects numeric IDs that match order_items.id in the database.
          const numericItemIds = selectedItems
            .map(itemId => {
              const item = order.items.find(i => i.id === itemId);
              return item ? Number(item.id) : null;
            })
            .filter((id): id is number => id !== null);

          // Use cancel-unified: it creates the cancellation order, writes the
          // legal journal REFUND entry, and logs the audit trail in one shot.
          await apiService.post('/orders/payment/cancel-unified', {
            orderId: order.id,
            reason,
            cancellationType: 'partial',
            itemsToCancel: numericItemIds,
            includeTipReversal: selectedTip && order.tips && order.tips > 0,
          });

          setReturnSuccess('Retour partiel traité avec succès');
        } else {
          // Full return — cancel-unified handles the entire order
          await apiService.post('/orders/payment/cancel-unified', {
            orderId: order.id,
            reason,
            cancellationType: 'full',
            includeTipReversal: !!(order.tips && order.tips > 0),
          });

          setReturnSuccess('Retour complet traité avec succès');
        }

        // Refresh data and close dialog
        setTimeout(() => {
          closeReturnDialog();
          loadOrders();
          loadStats();
        }, 1500);
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string } }; message?: string };
        const errorMessage =
          err.response?.data?.error || err.message || 'Erreur lors du traitement du retour';
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

  return useMemo(
    () => ({
      loadOrders,
      loadStats,
      processReturn,
      refreshData,
    }),
    [loadOrders, loadStats, processReturn, refreshData]
  );
};
