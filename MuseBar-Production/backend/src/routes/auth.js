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
exports.requireAuth = requireAuth;
exports.requireAdmin = requireAdmin;
exports.requirePermission = requirePermission;
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_1 = require("../models/user");
const app_1 = require("../app");
const router = express_1.default.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const JWT_EXPIRES_IN = '12h';
// Helper: generate JWT
function generateToken(user) {
    return jsonwebtoken_1.default.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
// Middleware: require auth
function requireAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer '))
        return res.status(401).json({ error: 'Missing token' });
    try {
        const payload = jsonwebtoken_1.default.verify(auth.slice(7), JWT_SECRET);
        req.user = payload;
        next();
    }
    catch (_a) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}
// Middleware: require admin
function requireAdmin(req, res, next) {
    var _a;
    if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.is_admin))
        return res.status(403).json({ error: 'Admin only' });
    next();
}
// Middleware: require permission
function requirePermission(permission) {
    return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        if ((_a = req.user) === null || _a === void 0 ? void 0 : _a.is_admin)
            return next();
        const perms = yield user_1.UserModel.getUserPermissions(req.user.id);
        if (!perms.includes(permission))
            return res.status(403).json({ error: 'Permission denied' });
        next();
    });
}
// POST /api/auth/register (admin only)
router.post('/register', requireAuth, requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password, is_admin } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Email and password required' });
    try {
        const user = yield user_1.UserModel.createUser(email, password, !!is_admin);
        res.status(201).json({ id: user.id, email: user.email, is_admin: user.is_admin });
    }
    catch (e) {
        res.status(400).json({ error: 'User already exists or invalid data' });
    }
}));
// POST /api/auth/login
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Email and password required' });
    const user = yield user_1.UserModel.findByEmail(email);
    if (!user)
        return res.status(401).json({ error: 'Invalid credentials' });
    const valid = yield user_1.UserModel.verifyPassword(user, password);
    if (!valid)
        return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateToken(user);
    res.json({ token, user: { id: user.id, email: user.email, is_admin: user.is_admin } });
}));
// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_1.UserModel.findById(req.user.id);
    if (!user)
        return res.status(404).json({ error: 'User not found' });
    const permissions = yield user_1.UserModel.getUserPermissions(user.id);
    res.json({ id: user.id, email: user.email, is_admin: user.is_admin, permissions });
}));
// GET /api/auth/users (admin only)
router.get('/users', requireAuth, requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield app_1.pool.query('SELECT id, email, is_admin, created_at FROM users');
    res.json(result.rows);
}));
// GET /api/auth/users/:id/permissions (admin only)
router.get('/users/:id/permissions', requireAuth, requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = parseInt(req.params.id);
    const permissions = yield user_1.UserModel.getUserPermissions(userId);
    res.json({ userId, permissions });
}));
// POST /api/auth/users/:id/permissions (admin only)
router.post('/users/:id/permissions', requireAuth, requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = parseInt(req.params.id);
    const { permissions } = req.body;
    if (!Array.isArray(permissions))
        return res.status(400).json({ error: 'Permissions must be array' });
    yield user_1.UserModel.setUserPermissions(userId, permissions);
    res.json({ userId, permissions });
}));
exports.default = router;
