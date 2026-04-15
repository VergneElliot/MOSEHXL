import { useCallback } from 'react';
import { ApiService } from '../services/apiService';
import { OrderItem, LocalSubBill } from '../types';

export interface POSAPIActions {
  createOrder: (orderData: CreateOrderData) => Promise<any>;
  processRetour: (retourData: RetourData) => Promise<any>;
  processChange: (changeData: ChangeData) => Promise<any>;
}

export interface CreateOrderData {
  totalAmount: number;
  totalTax: number;
  paymentMethod: 'cash' | 'card' | 'split';
  items: OrderItem[];
  subBills?: LocalSubBill[];
  tips?: number;
  cashReceived?: number;
  change?: number;
  notes?: string;
}

export interface RetourData {
  item: OrderItem;
  reason: string;
  paymentMethod: 'cash' | 'card';
}

export interface ChangeData {
  amount: number;
  direction: 'card-to-cash' | 'cash-to-card';
}

export const usePOSAPI = (
  onSuccess: (message: string, order?: any) => void,
  onError: (message: string) => void,
  onDataUpdate: () => void
): POSAPIActions => {
  const apiService = ApiService.getInstance();

  // Single code path: delegate to orders API (items mapping, sub_bills, happy_hour_discount_amount in orders.ts)
  const createOrder = useCallback(
    async (orderData: CreateOrderData) => {
      try {
        const created = await apiService.createOrder({
          totalAmount: orderData.totalAmount,
          taxAmount: orderData.totalTax,
          paymentMethod: orderData.paymentMethod,
          items: orderData.items,
          sub_bills: orderData.subBills?.map(bill => {
            const method = bill.payments[0]?.method || 'card';
            return {
              payment_method: method === 'split' ? 'card' : method,
              amount: bill.total,
            };
          }),
          tips: orderData.tips ?? 0,
          change: orderData.change ?? 0,
          notes: orderData.notes,
        });
        onSuccess('Commande créée avec succès', created);
        onDataUpdate();
        return created;
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string } }; message?: string };
        const errorMessage =
          err.response?.data?.error ||
          err.message ||
          'Erreur lors de la création de la commande';
        onError(errorMessage);
        throw error;
      }
    },
    [apiService, onSuccess, onError, onDataUpdate]
  );

  const processRetour = useCallback(
    async (retourData: RetourData) => {
      try {
        // Use the dedicated retour endpoint — it validates the payload,
        // creates the negative order, and writes a REFUND entry to the
        // legal journal and audit trail.
        const response = await apiService.post('/orders/payment/retour', {
          item: {
            productId: retourData.item.productId,
            productName: retourData.item.productName,
            quantity: retourData.item.quantity,
            unitPrice: retourData.item.unitPrice,
            totalPrice: retourData.item.totalPrice,
            taxRate: retourData.item.taxRate,
          },
          reason: retourData.reason,
          paymentMethod: retourData.paymentMethod,
        });

        onSuccess('Retour traité avec succès');
        onDataUpdate();
        return response.data;
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string } }; message?: string };
        const errorMessage =
          err.response?.data?.error || err.message || 'Erreur lors du traitement du retour';
        onError(errorMessage);
        throw error;
      }
    },
    [apiService, onSuccess, onError, onDataUpdate]
  );

  const processChange = useCallback(
    async (changeData: ChangeData) => {
      try {
        const response = await apiService.post('/orders/payment/change', {
          amount: changeData.amount,
          direction: changeData.direction,
        });

        onSuccess('Changement de caisse effectué');
        onDataUpdate();
        return response.data;
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string } }; message?: string };
        const errorMessage =
          err.response?.data?.error || err.message || 'Erreur lors du changement de caisse';
        onError(errorMessage);
        throw error;
      }
    },
    [apiService, onSuccess, onError, onDataUpdate]
  );

  return {
    createOrder,
    processRetour,
    processChange,
  };
};
