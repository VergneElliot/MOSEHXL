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
// GET all categories
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categories = yield models_1.CategoryModel.getAll();
        res.json(categories);
    }
    catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
}));
// GET category by ID
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid category ID' });
        }
        const category = yield models_1.CategoryModel.getById(id);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json(category);
    }
    catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({ error: 'Failed to fetch category' });
    }
}));
// POST create new category
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, default_tax_rate } = req.body;
        if (!name || typeof name !== 'string') {
            return res.status(400).json({ error: 'Category name is required' });
        }
        if (default_tax_rate === undefined || typeof default_tax_rate !== 'number') {
            return res.status(400).json({ error: 'Default tax rate is required and must be a number' });
        }
        const category = yield models_1.CategoryModel.create(name, default_tax_rate);
        res.status(201).json(category);
    }
    catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ error: 'Failed to create category' });
    }
}));
// PUT update category
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid category ID' });
        }
        const { name, default_tax_rate } = req.body;
        if (!name || typeof name !== 'string') {
            return res.status(400).json({ error: 'Category name is required' });
        }
        if (default_tax_rate === undefined || typeof default_tax_rate !== 'number') {
            return res.status(400).json({ error: 'Default tax rate is required and must be a number' });
        }
        const category = yield models_1.CategoryModel.update(id, name, default_tax_rate);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json(category);
    }
    catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ error: 'Failed to update category' });
    }
}));
// DELETE category
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid category ID' });
        }
        const deleted = yield models_1.CategoryModel.delete(id);
        if (!deleted) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json({ message: 'Category deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
}));
exports.default = router;
