"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const pg_1 = require("pg");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Database connection
exports.pool = new pg_1.Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'musebar',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
});
// Health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'MuseBar API is running' });
});
// Import and use routes
const categories_1 = __importDefault(require("./routes/categories"));
const products_1 = __importDefault(require("./routes/products"));
const orders_1 = __importDefault(require("./routes/orders"));
const legal_1 = __importDefault(require("./routes/legal"));
const auth_1 = __importDefault(require("./routes/auth"));
app.use('/api/categories', categories_1.default);
app.use('/api/products', products_1.default);
app.use('/api/orders', orders_1.default);
app.use('/api/legal', legal_1.default);
app.use('/api/auth', auth_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});
// Start server
app.listen(PORT, () => {
    console.log(`MuseBar API server running on port ${PORT}`);
});
exports.default = app;
