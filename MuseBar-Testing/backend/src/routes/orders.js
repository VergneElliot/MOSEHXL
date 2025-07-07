"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const models_1 = require("../models");
const legalJournal_1 = require("../models/legalJournal");
const router = express_1.default.Router();
// GET all orders (for history)
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orders = yield models_1.OrderModel.getAll();
        res.json(orders);
    }
    catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
}));
// GET order by ID with items and sub-bills
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid order ID' });
        }
        const order = yield models_1.OrderModel.getById(id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        // Get order items
        const items = yield models_1.OrderItemModel.getByOrderId(id);
        // Get sub-bills if it's a split payment
        const subBills = order.payment_method === 'split' ? yield models_1.SubBillModel.getByOrderId(id) : [];
        res.json(Object.assign(Object.assign({}, order), { items, sub_bills: subBills }));
    }
    catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
}));
// POST create new order
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { total_amount, total_tax, payment_method, status, notes, items, sub_bills } = req.body;
        if (total_amount === undefined || typeof total_amount !== 'number' || total_amount < 0) {
            return res.status(400).json({ error: 'Valid total amount is required' });
        }
        if (total_tax === undefined || typeof total_tax !== 'number' || total_tax < 0) {
            return res.status(400).json({ error: 'Valid total tax is required' });
        }
        if (!payment_method || !['cash', 'card', 'split'].includes(payment_method)) {
            return res.status(400).json({ error: 'Valid payment method is required' });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Order items are required' });
        }
        // Create the order
        const order = yield models_1.OrderModel.create({
            total_amount,
            total_tax,
            payment_method,
            status: status || 'completed',
            notes
        });
        // Create order items
        const createdItems = [];
        for (const item of items) {
            const orderItem = yield models_1.OrderItemModel.create(Object.assign(Object.assign({}, item), { order_id: order.id }));
            createdItems.push(orderItem);
        }
        // Create sub-bills if it's a split payment
        const createdSubBills = [];
        if (payment_method === 'split' && sub_bills && Array.isArray(sub_bills)) {
            for (const subBill of sub_bills) {
                const createdSubBill = yield models_1.SubBillModel.create(Object.assign(Object.assign({}, subBill), { order_id: order.id }));
                createdSubBills.push(createdSubBill);
            }
        }
        // Log transaction in legal journal for French compliance
        try {
            const journalEntry = yield legalJournal_1.LegalJournalModel.logTransaction({
                id: order.id,
                finalAmount: total_amount,
                taxAmount: total_tax,
                payment_method,
                items: createdItems,
                created_at: order.created_at
            }, req.headers['user-id'] // Pass user ID if available in headers
            );
            console.log(`Legal journal entry created: sequence ${journalEntry.sequence_number}`);
        }
        catch (journalError) {
            console.error('Failed to log transaction in legal journal:', journalError);
            // Continue with response - don't fail the order creation due to journal logging failure
        }
        res.status(201).json(Object.assign(Object.assign({}, order), { items: createdItems, sub_bills: createdSubBills }));
    }
    catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
}));
// PUT update order
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid order ID' });
        }
        const updateData = {};
        if (req.body.total_amount !== undefined)
            updateData.total_amount = req.body.total_amount;
        if (req.body.total_tax !== undefined)
            updateData.total_tax = req.body.total_tax;
        if (req.body.payment_method !== undefined)
            updateData.payment_method = req.body.payment_method;
        if (req.body.status !== undefined)
            updateData.status = req.body.status;
        if (req.body.notes !== undefined)
            updateData.notes = req.body.notes;
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        const order = yield models_1.OrderModel.update(id, updateData);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    }
    catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ error: 'Failed to update order' });
    }
}));
// PUT update order item
router.put('/:orderId/items/:itemId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orderId = parseInt(req.params.orderId);
        const itemId = parseInt(req.params.itemId);
        if (isNaN(orderId) || isNaN(itemId)) {
            return res.status(400).json({ error: 'Invalid order or item ID' });
        }
        // Verify order exists
        const order = yield models_1.OrderModel.getById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        const updateData = {};
        if (req.body.quantity !== undefined)
            updateData.quantity = req.body.quantity;
        if (req.body.unit_price !== undefined)
            updateData.unit_price = req.body.unit_price;
        if (req.body.total_price !== undefined)
            updateData.total_price = req.body.total_price;
        if (req.body.tax_amount !== undefined)
            updateData.tax_amount = req.body.tax_amount;
        if (req.body.happy_hour_applied !== undefined)
            updateData.happy_hour_applied = req.body.happy_hour_applied;
        if (req.body.happy_hour_discount_amount !== undefined)
            updateData.happy_hour_discount_amount = req.body.happy_hour_discount_amount;
        if (req.body.sub_bill_id !== undefined)
            updateData.sub_bill_id = req.body.sub_bill_id;
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        const item = yield models_1.OrderItemModel.update(itemId, updateData);
        if (!item) {
            return res.status(404).json({ error: 'Order item not found' });
        }
        res.json(item);
    }
    catch (error) {
        console.error('Error updating order item:', error);
        res.status(500).json({ error: 'Failed to update order item' });
    }
}));
// DELETE order
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid order ID' });
        }
        const deleted = yield models_1.OrderModel.delete(id);
        if (!deleted) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json({ message: 'Order deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ error: 'Failed to delete order' });
    }
}));
exports.default = router;
