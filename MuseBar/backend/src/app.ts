import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { ClosureScheduler } from './utils/closureScheduler';
import { Logger, requestLoggerMiddleware } from './utils/logger';
import { initializeEnvironment } from './config/environment';
import { DEFAULT_APP_TIMEZONE } from './config/timezone';
import { createSecurityMiddleware } from './middleware/security';
import type { Request, Response } from 'express';

// Load environment variables
dotenv.config();

const app = express();

// Initialize environment config and logger
const config = initializeEnvironment();
const logger = Logger.getInstance(config);

// Environment-specific configuration
const NODE_ENV = process.env.NODE_ENV || 'production';

// Starting MOSEHXL in production mode

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    // Allow any local network IP
    /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:3000$/,
    /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:3000$/,
    /^http:\/\/172\.1[6-9]\.\d{1,3}\.\d{1,3}:3000$/,
    /^http:\/\/172\.2[0-9]\.\d{1,3}\.\d{1,3}:3000$/,
    /^http:\/\/172\.3[0-1]\.\d{1,3}\.\d{1,3}:3000$/,
    // Custom origins from environment
    ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [])
  ],
  credentials: true
}));
app.use(express.json());

// Trust proxy if configured
app.set('trust proxy', config.server.trustProxy);

// Database connection from validated config (created before security so rate limiting can use shared store).
// options: timezone ensures every session uses the app default so that
// NOW() / CURRENT_TIMESTAMP and TIMESTAMPTZ display align with Paris.
export const pool = new Pool({
  user: config.database.user,
  host: config.database.host,
  database: config.database.database,
  password: config.database.password,
  port: config.database.port,
  ssl: config.database.ssl ? { rejectUnauthorized: true } : false,
  max: config.database.maxConnections,
  idleTimeoutMillis: config.database.idleTimeoutMillis,
  options: `--timezone=${DEFAULT_APP_TIMEZONE}`,
});

// Request logging and security middleware (pool passed so rate limit store is shared across processes)
app.use(requestLoggerMiddleware(logger));
app.use(createSecurityMiddleware(config, logger, { pool }));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'MuseBar API is running' });
});

// Import and use routes
import categoriesRouter from './routes/categories';
import productsRouter from './routes/products';
import ordersRouter from './routes/orders/index';
import legalRouter from './routes/legal/index';
import authRouter from './routes/auth';
import docsRouter from './routes/docs';
import createUserManagementRouter from './routes/userManagement';
import establishmentsRouter from './routes/enhancedEstablishments';
import adminDashboardRouter from './routes/adminDashboard';
import establishmentSearchRouter from './routes/establishmentSearch';
import setupRouter from './routes/setup';
import emailTestRouter from './routes/emailTest';
import establishmentAccountCreationRouter from './routes/establishmentAccountCreation';
import printingRouter from './routes/printing';
import printingCompatRouter from './routes/printingCompat';
import settingsRouter from './routes/settings';

app.use('/api/categories', categoriesRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/legal', legalRouter);
app.use('/api/auth', authRouter);
app.use('/api/user-management', createUserManagementRouter(config, logger));
app.use('/api/establishments', establishmentsRouter);
app.use('/api/admin-dashboard', adminDashboardRouter);
app.use('/api/establishment-search', establishmentSearchRouter);
app.use('/api/setup', setupRouter);
app.use('/api/establishment-account-creation', establishmentAccountCreationRouter);
app.use('/api/printing', printingRouter);
app.use('/api/settings', settingsRouter);
app.use('/', printingCompatRouter);

// Development-only email test routes
if (NODE_ENV === 'development') {
  app.use('/api', emailTestRouter);
}

// API Documentation
app.use('/api/docs', docsRouter);

// Client error logging endpoint
import { asyncHandler, notFound, createErrorHandler } from './middleware/errorHandler';
import { initializeErrorRecovery as initErrorRecovery } from './utils/errorRecovery';

app.post('/api/client-errors', asyncHandler(async (req: Request, res: Response) => {
  const errorData = req.body;

  logger.error(
    `Client Error [${errorData.errorId}]: ${errorData.message}`,
    new Error(errorData.message),
    {
      ...errorData,
      source: 'CLIENT'
    },
    'CLIENT_ERROR_HANDLER'
  );

  res.json({ success: true, message: 'Error logged successfully' });
}));

// Error handling: single unified handler (replaces former errorHandler + errorHandling)
initErrorRecovery(logger);
app.use(notFound);
app.use(createErrorHandler(logger));

// Initialize services

// Route services are already initialized above

// Start the server on all network interfaces
app.listen(config.server.port, '0.0.0.0', () => {
  // MOSEHXL API Server running
  
  // Start the automatic closure scheduler (only in production)
  if (NODE_ENV === 'production') {
    ClosureScheduler.start().catch(error => {
      logger.error('Failed to start closure scheduler', error instanceof Error ? error : new Error(String(error)));
    });
    // Automatic closure scheduler started
  } else {
    // Automatic closure scheduler disabled in development mode
  }
});

export default app;
