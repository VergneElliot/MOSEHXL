import { Request, Response } from 'express';
import { OrderService, CreateOrderData } from '../services/orderService';
import { asyncHandler } from '../middleware/errorHandler';

export class OrderController {
  static getAllOrders = asyncHandler(async (req: Request, res: Response) => {
    const establishmentId = req.user?.establishment_id;
    if (!establishmentId) return res.status(403).json({ error: 'No establishment associated with this account' });
    const orders = await OrderService.getAllOrders(establishmentId);
    res.status(200).json({ success: true, data: orders, count: orders.length });
  });

  static getOrderById = asyncHandler(async (req: Request, res: Response) => {
    const establishmentId = req.user?.establishment_id;
    if (!establishmentId) return res.status(403).json({ error: 'No establishment associated with this account' });
    const id = parseInt(req.params.id);
    const order = await OrderService.getOrderById(id, establishmentId);
    res.status(200).json({ success: true, data: order });
  });

  static createOrder = asyncHandler(async (req: Request, res: Response) => {
    const establishmentId = req.user?.establishment_id;
    if (!establishmentId) return res.status(403).json({ error: 'No establishment associated with this account' });
    const orderData: CreateOrderData = {
      total_amount: req.body.total_amount,
      total_tax: req.body.total_tax,
      payment_method: req.body.payment_method,
      status: req.body.status,
      notes: req.body.notes,
      items: req.body.items,
      sub_bills: req.body.sub_bills,
      tips: req.body.tips,
      change: req.body.change
    };
    const userContext = {
      id: String(req.user?.id || 'anonymous'),
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    };
    const result = await OrderService.createOrder(orderData, establishmentId, userContext);
    res.status(201).json({ success: true, message: 'Commande créée avec succès', data: result });
  });

  static updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
    const establishmentId = req.user?.establishment_id;
    if (!establishmentId) return res.status(403).json({ error: 'No establishment associated with this account' });
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const userContext = {
      id: String(req.user?.id || 'anonymous'),
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    };
    const updatedOrder = await OrderService.updateOrderStatus(id, status, establishmentId, userContext);
    res.status(200).json({ success: true, message: 'Statut de la commande mis à jour avec succès', data: updatedOrder });
  });
}
