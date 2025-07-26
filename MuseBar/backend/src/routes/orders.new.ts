import express from 'express';
import { OrderController } from '../controllers/orderController';
import { validateBody, validateParams, commonValidations, paramValidations } from '../middleware/validation';
import { requireAuth } from './auth';

const router = express.Router();

// GET all orders (for history)
router.get('/', 
  // requireAuth, // Uncomment when authentication is implemented
  OrderController.getAllOrders
);

// GET order by ID with items and sub-bills
router.get('/:id', 
  validateParams([paramValidations.id]),
  // requireAuth, // Uncomment when authentication is implemented
  OrderController.getOrderById
);

// POST create new order
router.post('/', 
  validateBody(commonValidations.orderCreate),
  // requireAuth, // Uncomment when authentication is implemented
  OrderController.createOrder
);

// PATCH update order status
router.patch('/:id/status',
  validateParams([paramValidations.id]),
  validateBody([
    { 
      field: 'status', 
      required: true, 
      validator: (val: string) => ['pending', 'completed', 'cancelled'].includes(val),
      message: 'Statut invalide' 
    }
  ]),
  // requireAuth, // Uncomment when authentication is implemented
  OrderController.updateOrderStatus
);

export default router; 