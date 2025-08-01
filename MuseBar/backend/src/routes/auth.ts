import express from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user';
import { pool } from '../app';
import { AuditTrailModel } from '../models/auditTrail';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const JWT_EXPIRES_IN = '12h';

// Helper: generate JWT
function generateToken(user: { id: number; email: string; is_admin: boolean }, rememberMe: boolean = false) {
  const expiration = rememberMe ? '7d' : '12h';
  return jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: expiration });
}

// Middleware: require auth
export function requireAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    AuditTrailModel.logAction({
      action_type: 'AUTH_FAILED',
      action_details: { reason: 'Missing token' },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    (req as any).user = payload;
    next();
  } catch {
    AuditTrailModel.logAction({
      action_type: 'AUTH_FAILED',
      action_details: { reason: 'Invalid token' },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Middleware: require admin
export function requireAdmin(req: any, res: any, next: any) {
  if (!(req as any).user?.is_admin) return res.status(403).json({ error: 'Admin only' });
  next();
}

// Middleware: require permission
export function requirePermission(permission: string) {
  return async (req: any, res: any, next: any) => {
    if ((req as any).user?.is_admin) return next();
    const perms = await UserModel.getUserPermissions((req as any).user.id);
    if (!perms.includes(permission)) return res.status(403).json({ error: 'Permission denied' });
    next();
  };
}

// POST /api/auth/register (admin only)
router.post('/register', requireAuth, requireAdmin, async (req, res) => {
  const { email, password, is_admin } = req.body;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];
  if (!email || !password) {
    await AuditTrailModel.logAction({
      user_id: String((req as any).user.id),
      action_type: 'CREATE_USER_FAILED',
      action_details: { reason: 'Missing email or password', email },
      ip_address: ip,
      user_agent: userAgent
    });
    return res.status(400).json({ error: 'Email and password required' });
  }
  try {
    const user = await UserModel.createUser(email, password, !!is_admin);
    await AuditTrailModel.logAction({
      user_id: String((req as any).user.id),
      action_type: 'CREATE_USER',
      resource_type: 'USER',
      resource_id: String(user.id),
      action_details: { email, is_admin },
      ip_address: ip,
      user_agent: userAgent
    });
    res.status(201).json({ id: user.id, email: user.email, is_admin: user.is_admin });
  } catch (e) {
    await AuditTrailModel.logAction({
      user_id: String((req as any).user.id),
      action_type: 'CREATE_USER_FAILED',
      action_details: { reason: 'User already exists or invalid data', email },
      ip_address: ip,
      user_agent: userAgent
    });
    res.status(400).json({ error: 'User already exists or invalid data' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password, rememberMe } = req.body;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];
  if (!email || !password) {
    await AuditTrailModel.logAction({
      action_type: 'LOGIN_FAILED',
      action_details: { reason: 'Missing email or password', email },
      ip_address: ip,
      user_agent: userAgent
    });
    return res.status(400).json({ error: 'Email and password required' });
  }
  const user = await UserModel.findByEmail(email);
  if (!user) {
    await AuditTrailModel.logAction({
      action_type: 'LOGIN_FAILED',
      action_details: { reason: 'User not found', email },
      ip_address: ip,
      user_agent: userAgent
    });
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const valid = await UserModel.verifyPassword(user, password);
  if (!valid) {
    await AuditTrailModel.logAction({
      user_id: String(user.id),
      action_type: 'LOGIN_FAILED',
      action_details: { reason: 'Invalid password', email },
      ip_address: ip,
      user_agent: userAgent
    });
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateToken(user, rememberMe);
  await AuditTrailModel.logAction({
    user_id: String(user.id),
    action_type: 'LOGIN',
    action_details: { email, rememberMe: !!rememberMe },
    ip_address: ip,
    user_agent: userAgent
  });
  // Get additional user fields for login response
  const userDetails = await pool.query('SELECT first_name, last_name, role FROM users WHERE id = $1', [user.id]);
  const details = userDetails.rows[0] || {};
  
  res.json({ 
    token, 
    user: { 
      id: user.id, 
      email: user.email, 
      is_admin: user.is_admin,
      role: details.role,
      first_name: details.first_name,
      last_name: details.last_name
    }, 
    expiresIn: rememberMe ? '7d' : '12h' 
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  const user = await UserModel.findById((req as any).user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const permissions = await UserModel.getUserPermissions(user.id);
  
  // Get additional user fields from database
  const userDetails = await pool.query('SELECT first_name, last_name, role FROM users WHERE id = $1', [user.id]);
  const details = userDetails.rows[0] || {};
  
  res.json({ 
    id: user.id, 
    email: user.email, 
    is_admin: user.is_admin, 
    role: details.role,
    first_name: details.first_name,
    last_name: details.last_name,
    permissions 
  });
});

// POST /api/auth/refresh
router.post('/refresh', requireAuth, async (req, res) => {
  const user = await UserModel.findById((req as any).user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const { rememberMe } = req.body;
  const token = generateToken(user, rememberMe);
  
  await AuditTrailModel.logAction({
    user_id: String(user.id),
    action_type: 'TOKEN_REFRESH',
    action_details: { email: user.email, rememberMe: !!rememberMe },
    ip_address: req.ip,
    user_agent: req.headers['user-agent']
  });
  
  res.json({ token, expiresIn: rememberMe ? '7d' : '12h' });
});

// GET /api/auth/users (admin only)
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  const result = await pool.query('SELECT id, email, is_admin, created_at FROM users');
  res.json(result.rows);
});

// GET /api/auth/users/:id/permissions (admin only)
router.get('/users/:id/permissions', requireAuth, requireAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);
  const permissions = await UserModel.getUserPermissions(userId);
  res.json({ userId, permissions });
});

// POST /api/auth/users/:id/permissions (admin only)
router.post('/users/:id/permissions', requireAuth, requireAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);
  const { permissions } = req.body;
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];
  if (!Array.isArray(permissions)) {
    await AuditTrailModel.logAction({
      user_id: String((req as any).user.id),
      action_type: 'SET_PERMISSIONS_FAILED',
      resource_type: 'USER',
      resource_id: String(userId),
      action_details: { reason: 'Permissions must be array', permissions },
      ip_address: ip,
      user_agent: userAgent
    });
    return res.status(400).json({ error: 'Permissions must be array' });
  }
  await UserModel.setUserPermissions(userId, permissions);
  await AuditTrailModel.logAction({
    user_id: String((req as any).user.id),
    action_type: 'SET_PERMISSIONS',
    resource_type: 'USER',
    resource_id: String(userId),
    action_details: { permissions },
    ip_address: ip,
    user_agent: userAgent
  });
  res.json({ userId, permissions });
});

// GET /api/auth/logout (optional, if implemented)
router.post('/logout', requireAuth, async (req, res) => {
  const ip = req.ip;
  const userAgent = req.headers['user-agent'];
  await AuditTrailModel.logAction({
    user_id: String((req as any).user.id),
    action_type: 'LOGOUT',
    ip_address: ip,
    user_agent: userAgent
  });
  res.json({ message: 'Logged out' });
});

// POST /api/auth/setup (temporary endpoint for initial setup)
router.post('/setup', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Check if any admin user already exists
    const existingAdmin = await pool.query('SELECT COUNT(*) FROM users WHERE is_admin = true');
    if (parseInt(existingAdmin.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Admin user already exists' });
    }
    
    // Create admin user
    const user = await UserModel.createUser(email, password, true);
    
    // Update user with additional fields
    await pool.query(`
      UPDATE users 
      SET first_name = 'System', last_name = 'Administrator', role = 'system_admin', email_verified = true
      WHERE id = $1
    `, [user.id]);
    
    res.status(201).json({ 
      message: 'Admin user created successfully',
      user: { id: user.id, email: user.email, is_admin: user.is_admin }
    });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ error: 'Failed to create admin user' });
  }
});

export default router; 