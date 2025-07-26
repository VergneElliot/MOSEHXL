import { OrderModel, OrderItemModel, SubBillModel } from '../models';
import { LegalJournalModel } from '../models/legalJournal';
import { AuditTrailModel } from '../models/auditTrail';
import { AppError } from '../middleware/errorHandler';

export interface CreateOrderData {
  total_amount: number;
  total_tax: number;
  payment_method: 'cash' | 'card' | 'split';
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  items: OrderItemData[];
  sub_bills?: SubBillData[];
  tips?: number;
  change?: number;
}

export interface OrderItemData {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate: number;
  tax_amount: number;
  happy_hour_applied?: boolean;
  sub_bill_id?: number;
}

export interface SubBillData {
  payment_method: 'cash' | 'card';
  amount: number;
  status: 'pending' | 'paid';
}

export class OrderService {
  static async getAllOrders() {
    try {
      const orders = await OrderModel.getAll();
      
      // Include items and sub-bills for each order
      const ordersWithDetails = await Promise.all(
        orders.map(async (order) => {
          const items = await OrderItemModel.getByOrderId(order.id);
          const subBills = order.payment_method === 'split' 
            ? await SubBillModel.getByOrderId(order.id) 
            : [];
          
          return {
            ...order,
            items,
            sub_bills: subBills,
            tips: order.tips || 0,
            change: order.change || 0
          };
        })
      );
      
      return ordersWithDetails;
    } catch (error) {
      throw new AppError('Erreur lors de la récupération des commandes', 500);
    }
  }

  static async getOrderById(id: number) {
    try {
      const order = await OrderModel.getById(id);
      if (!order) {
        throw new AppError('Commande introuvable', 404);
      }

      // Get order items
      const items = await OrderItemModel.getByOrderId(id);
      
      // Get sub-bills if it's a split payment
      const subBills = order.payment_method === 'split' 
        ? await SubBillModel.getByOrderId(id) 
        : [];

      return {
        ...order,
        items,
        sub_bills: subBills,
        tips: order.tips || 0,
        change: order.change || 0
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erreur lors de la récupération de la commande', 500);
    }
  }

  static async createOrder(orderData: CreateOrderData, userContext?: { id: string; ip: string; userAgent: string }) {
    try {
      // Validate order data
      await this.validateOrderData(orderData);

      // Create the main order
      const order = await OrderModel.create({
        total_amount: orderData.total_amount,
        total_tax: orderData.total_tax,
        payment_method: orderData.payment_method,
        status: orderData.status,
        notes: orderData.notes || '',
        tips: orderData.tips || 0,
        change: orderData.change || 0
      });

      // Create order items
      const createdItems = [];
      for (const item of orderData.items) {
        const createdItem = await OrderItemModel.create({
          order_id: order.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          tax_rate: item.tax_rate,
          tax_amount: item.tax_amount,
          happy_hour_applied: item.happy_hour_applied || false,
          sub_bill_id: item.sub_bill_id
        });
        createdItems.push(createdItem);
      }

      // Create sub-bills for split payments
      const createdSubBills = [];
      if (orderData.payment_method === 'split' && orderData.sub_bills) {
        for (const subBill of orderData.sub_bills) {
          const createdSubBill = await SubBillModel.create({
            order_id: order.id,
            payment_method: subBill.payment_method,
            amount: subBill.amount,
            status: subBill.status
          });
          createdSubBills.push(createdSubBill);
        }
      }

      // TODO: Create legal journal entry for completed orders
      // Note: Implement when LegalJournalModel.createEntry is available
      if (orderData.status === 'completed') {
        console.log('📋 Legal journal entry needed for order:', order.id);
      }

      // TODO: Create audit trail entry
      // Note: Implement when AuditTrailModel.createEntry is available
      if (userContext) {
        console.log('📝 Audit trail entry needed for order:', order.id);
      }

      return {
        order,
        items: createdItems,
        sub_bills: createdSubBills
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erreur lors de la création de la commande', 500);
    }
  }

  static async updateOrderStatus(id: number, status: 'pending' | 'completed' | 'cancelled', userContext?: { id: string; ip: string; userAgent: string }) {
    try {
      const order = await OrderModel.getById(id);
      if (!order) {
        throw new AppError('Commande introuvable', 404);
      }

      const updatedOrder = await OrderModel.update(id, { status });

      // TODO: Create audit trail entry
      // Note: Implement when AuditTrailModel.createEntry is available
      if (userContext) {
        console.log('📝 Audit trail entry needed for status update:', id);
      }

      return updatedOrder;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erreur lors de la mise à jour du statut de la commande', 500);
    }
  }

  private static async validateOrderData(orderData: CreateOrderData) {
    // Validate total amounts match item totals
    const calculatedTotal = orderData.items.reduce((sum, item) => sum + item.total_price, 0);
    const calculatedTax = orderData.items.reduce((sum, item) => sum + item.tax_amount, 0);

    const tolerance = 0.01; // 1 cent tolerance for rounding
    if (Math.abs(calculatedTotal - orderData.total_amount) > tolerance) {
      throw new AppError('Le montant total ne correspond pas au total des articles', 400);
    }

    if (Math.abs(calculatedTax - orderData.total_tax) > tolerance) {
      throw new AppError('Le montant de la TVA ne correspond pas au total calculé', 400);
    }

    // Validate sub-bills for split payments
    if (orderData.payment_method === 'split') {
      if (!orderData.sub_bills || orderData.sub_bills.length === 0) {
        throw new AppError('Les sous-factures sont requises pour les paiements fractionnés', 400);
      }

      const subBillTotal = orderData.sub_bills.reduce((sum, bill) => sum + bill.amount, 0);
      if (Math.abs(subBillTotal - orderData.total_amount) > tolerance) {
        throw new AppError('Le total des sous-factures ne correspond pas au montant total', 400);
      }
    }

    // Validate items
    for (const item of orderData.items) {
      if (item.quantity <= 0) {
        throw new AppError(`Quantité invalide pour le produit ${item.product_name}`, 400);
      }

      if (item.unit_price < 0) {
        throw new AppError(`Prix unitaire invalide pour le produit ${item.product_name}`, 400);
      }

      const expectedTotal = item.unit_price * item.quantity;
      if (Math.abs(expectedTotal - item.total_price) > tolerance) {
        throw new AppError(`Prix total invalide pour le produit ${item.product_name}`, 400);
      }
    }
  }
} 