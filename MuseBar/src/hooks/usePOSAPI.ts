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
  onSuccess: (message: string) => void,
  onError: (message: string) => void,
  onDataUpdate: () => void
): POSAPIActions => {
  const apiService = ApiService.getInstance();

  const createOrder = useCallback(
    async (orderData: CreateOrderData) => {
      try {
        const response = await apiService.post('/orders', {
          total_amount: orderData.totalAmount,
          total_tax: orderData.totalTax,
          payment_method: orderData.paymentMethod,
          status: 'completed',
          notes: orderData.notes || '',
          items: orderData.items.map(item => ({
            product_id: item.productId,
            product_name: item.productName,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.totalPrice,
            tax_rate: item.taxRate,
            tax_amount: item.taxAmount,
            happy_hour_applied: item.isHappyHourApplied,
            sub_bill_id: null, // Will be handled for split payments
          })),
          sub_bills:
            orderData.subBills?.map(bill => ({
              payment_method: bill.payments[0]?.method || 'cash',
              amount: bill.total,
              status: 'paid',
            })) || [],
          tips: orderData.tips || 0,
          change: orderData.change || 0,
        });

        onSuccess('Commande créée avec succès');
        onDataUpdate();
        return response.data;
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.error ||
          error.message ||
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
        const response = await apiService.post('/orders', {
          total_amount: -retourData.item.totalPrice,
          total_tax: -retourData.item.taxAmount,
          payment_method: retourData.paymentMethod,
          status: 'completed',
          notes: `RETOUR: ${retourData.reason}`,
          items: [
            {
              product_id: retourData.item.productId,
              product_name: `RETOUR - ${retourData.item.productName}`,
              quantity: -retourData.item.quantity,
              unit_price: retourData.item.unitPrice,
              total_price: -retourData.item.totalPrice,
              tax_rate: retourData.item.taxRate,
              tax_amount: -retourData.item.taxAmount,
              happy_hour_applied: false,
              sub_bill_id: null,
            },
          ],
          sub_bills: [],
          tips: 0,
          change: 0,
        });

        onSuccess('Retour traité avec succès');
        onDataUpdate();
        return response.data;
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.error || error.message || 'Erreur lors du traitement du retour';
        onError(errorMessage);
        throw error;
      }
    },
    [apiService, onSuccess, onError, onDataUpdate]
  );

  const processChange = useCallback(
    async (changeData: ChangeData) => {
      try {
        const notes =
          changeData.direction === 'card-to-cash'
            ? `Changement de caisse: ${changeData.amount}€ - Carte vers Espèces`
            : `Changement de caisse: ${changeData.amount}€ - Espèces vers Carte`;

        const response = await apiService.post('/orders', {
          total_amount: 0,
          total_tax: 0,
          payment_method: 'cash',
          status: 'completed',
          notes,
          items: [],
          sub_bills: [],
          tips: 0,
          change: changeData.amount,
        });

        onSuccess('Changement de caisse effectué');
        onDataUpdate();
        return response.data;
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.error || error.message || 'Erreur lors du changement de caisse';
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
