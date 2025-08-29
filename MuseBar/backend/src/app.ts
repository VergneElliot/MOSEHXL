import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { ClosureScheduler } from './utils/closureScheduler';
import { Logger, requestLoggerMiddleware } from './utils/logger';
import { EnvironmentConfig, initializeEnvironment } from './config/environment';
import { createSecurityMiddleware } from './middleware/security';

// Load environment variables
dotenv.config();

const app = express();

// Initialize environment config and logger
const config = initializeEnvironment();
const logger = Logger.getInstance(config);

// Environment-specific configuration
const NODE_ENV = process.env.NODE_ENV || 'production';
const DEFAULT_DB_NAME = NODE_ENV === 'development' ? 'mosehxl_development' : 'mosehxl_production';

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

// Request logging and security middleware
app.use(requestLoggerMiddleware(logger));
app.use(createSecurityMiddleware(config, logger));

// Database connection with environment-specific defaults
export const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || DEFAULT_DB_NAME,
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
});

// Connecting to database

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
import userManagementRouter from './routes/userManagement';
import establishmentsRouter from './routes/establishments';
import setupRouter from './routes/setup';
import emailTestRouter from './routes/emailTest';

app.use('/api/categories', categoriesRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/legal', legalRouter);
app.use('/api/auth', authRouter);
app.use('/api/user-management', userManagementRouter(config, logger));
app.use('/api/establishments', establishmentsRouter);
app.use('/api/setup', setupRouter);

// Development-only email test routes
if (NODE_ENV === 'development') {
  app.use('/api', emailTestRouter);
}

// API Documentation
app.use('/api/docs', docsRouter);

// Client error logging endpoint
import { asyncHandler } from './middleware/errorHandling';
app.post('/api/client-errors', asyncHandler(async (req: any, res: any) => {
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

// Error handling middleware
import { createErrorHandler } from './middleware/errorHandler';
import { createEnhancedErrorHandler } from './middleware/errorHandling';
import { initializeErrorRecovery as initErrorRecovery } from './utils/errorRecovery';
import { notFound } from './middleware/errorHandler';

// Initialize error recovery system
initErrorRecovery(logger);

// Use enhanced error handler
const enhancedErrorHandler = createEnhancedErrorHandler(logger);
// 404 handler
app.use(notFound);
app.use(enhancedErrorHandler);

// Initialize services

// Initialize route services
import { initializeUserManagementRoutes } from './routes/userManagement';
import { initializeEstablishmentRoutes } from './routes/establishments';

initializeUserManagementRoutes(config, logger);
initializeEstablishmentRoutes(config, logger);

// Start the server on all network interfaces
app.listen(config.server.port, '0.0.0.0', () => {
  // MOSEHXL API Server running
  
  // Start the automatic closure scheduler (only in production)
  if (NODE_ENV === 'production') {
    ClosureScheduler.start().catch(error => {
      console.error('❌ Failed to start closure scheduler:', error);
    });
    // Automatic closure scheduler started
  } else {
    // Automatic closure scheduler disabled in development mode
  }
});

export default app;
