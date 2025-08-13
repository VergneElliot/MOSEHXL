import { Request, Response, NextFunction } from 'express';
import { OrderService, CreateOrderData } from '../services/orderService';
import { asyncHandler } from '../middleware/errorHandler';

export class OrderController {
  static getAllOrders = asyncHandler(async (req: Request, res: Response) => {
    const orders = await OrderService.getAllOrders();
    
    res.status(200).json({
      success: true,
      data: orders,
      count: orders.length
    });
  });

  static getOrderById = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const order = await OrderService.getOrderById(id);
    
    res.status(200).json({
      success: true,
      data: order
    });
  });

  static createOrder = asyncHandler(async (req: Request, res: Response) => {
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

    // Get user context for audit trail
    const userContext = {
      id: req.user?.id || 'anonymous',
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    };

    const result = await OrderService.createOrder(orderData, userContext);
    
    res.status(201).json({
      success: true,
      message: 'Commande créée avec succès',
      data: result
    });
  });

  static updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    // Get user context for audit trail
    const userContext = {
      id: req.user?.id || 'anonymous',
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    };

    const updatedOrder = await OrderService.updateOrderStatus(id, status, userContext);
    
    res.status(200).json({
      success: true,
      message: 'Statut de la commande mis à jour avec succès',
      data: updatedOrder
    });
  });
} 