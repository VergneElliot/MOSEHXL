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
const router = express_1.default.Router();
// GET all products
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield models_1.ProductModel.getAll();
        res.json(products);
    }
    catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
}));

// GET archived products
router.get('/archived', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield models_1.ProductModel.getAllArchived();
        res.json(products);
    }
    catch (error) {
        console.error('Error fetching archived products:', error);
        res.status(500).json({ error: 'Failed to fetch archived products' });
    }
}));

// GET all products including archived
router.get('/all', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield models_1.ProductModel.getAllIncludingArchived();
        res.json(products);
    }
    catch (error) {
        console.error('Error fetching all products:', error);
        res.status(500).json({ error: 'Failed to fetch all products' });
    }
}));
// GET products by category
router.get('/category/:categoryId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categoryId = parseInt(req.params.categoryId);
        if (isNaN(categoryId)) {
            return res.status(400).json({ error: 'Invalid category ID' });
        }
        const products = yield models_1.ProductModel.getByCategory(categoryId);
        res.json(products);
    }
    catch (error) {
        console.error('Error fetching products by category:', error);
        res.status(500).json({ error: 'Failed to fetch products by category' });
    }
}));
// GET product by ID
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid product ID' });
        }
        const product = yield models_1.ProductModel.getById(id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    }
    catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
}));
// POST create new product
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, price, tax_rate, category_id, happy_hour_discount_percent, happy_hour_discount_fixed, is_happy_hour_eligible } = req.body;
        if (!name || typeof name !== 'string') {
            return res.status(400).json({ error: 'Product name is required' });
        }
        if (price === undefined || typeof price !== 'number' || price <= 0) {
            return res.status(400).json({ error: 'Valid price is required' });
        }
        if (tax_rate === undefined || typeof tax_rate !== 'number' || tax_rate < 0) {
            return res.status(400).json({ error: 'Valid tax rate is required' });
        }
        if (!category_id || typeof category_id !== 'number') {
            return res.status(400).json({ error: 'Category ID is required' });
        }
        const product = yield models_1.ProductModel.create({
            name,
            price,
            tax_rate,
            category_id,
            happy_hour_discount_percent,
            happy_hour_discount_fixed,
            is_happy_hour_eligible: is_happy_hour_eligible !== undefined ? is_happy_hour_eligible : true
        });
        res.status(201).json(product);
    }
    catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
}));
// PUT update product
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid product ID' });
        }
        const updateData = {};
        if (req.body.name !== undefined)
            updateData.name = req.body.name;
        if (req.body.price !== undefined)
            updateData.price = req.body.price;
        if (req.body.tax_rate !== undefined)
            updateData.tax_rate = req.body.tax_rate;
        if (req.body.category_id !== undefined)
            updateData.category_id = req.body.category_id;
        if (req.body.happy_hour_discount_percent !== undefined)
            updateData.happy_hour_discount_percent = req.body.happy_hour_discount_percent;
        if (req.body.happy_hour_discount_fixed !== undefined)
            updateData.happy_hour_discount_fixed = req.body.happy_hour_discount_fixed;
        if (req.body.is_happy_hour_eligible !== undefined)
            updateData.is_happy_hour_eligible = req.body.is_happy_hour_eligible;
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        const product = yield models_1.ProductModel.update(id, updateData);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    }
    catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
}));
// DELETE product
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid product ID' });
        }
        const deleted = yield models_1.ProductModel.delete(id);
        if (!deleted) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
}));

// POST restore product
router.post('/:id/restore', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid product ID' });
        }
        const restored = yield models_1.ProductModel.restore(id);
        if (!restored) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ message: 'Product restored successfully' });
    }
    catch (error) {
        console.error('Error restoring product:', error);
        res.status(500).json({ error: 'Failed to restore product' });
    }
}));
exports.default = router;
