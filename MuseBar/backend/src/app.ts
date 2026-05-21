import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ClosureScheduler } from './utils/closureScheduler';
import { initializeLogger, requestLoggerMiddleware } from './utils/logger';
import { initializeEnvironment } from './config/environment';
import { createSecurityMiddleware } from './middleware/security';
import {
  getClientErrorPayloadSizeBytes,
  isClientErrorPayloadTooLarge,
  MAX_CLIENT_ERROR_REPORT_BYTES,
  sanitizeClientErrorForLog
} from './utils/clientErrorReporting';
import type { Request, Response } from 'express';
import { logSoftwareEventForAllEstablishmentsBestEffort } from './services/legal/softwareEventJournal';
import { TimeChangeMonitor } from './services/legal/timeChangeMonitor';
import { pool } from './db/pool';

// Load environment variables
dotenv.config();

const app = express();
app.disable('x-powered-by');

// Initialize environment config and logger
const config = initializeEnvironment();
const logger = initializeLogger(config);

// Environment-specific configuration
const NODE_ENV = process.env.NODE_ENV || 'production';
const isDevelopment = NODE_ENV === 'development';
const APP_VERSION = process.env.APP_VERSION || process.env.npm_package_version || 'unknown';

const developmentCorsOrigins: Array<string | RegExp> = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  // Allow local network frontend during development only.
  /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:3000$/,
  /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:3000$/,
  /^http:\/\/172\.1[6-9]\.\d{1,3}\.\d{1,3}:3000$/,
  /^http:\/\/172\.2[0-9]\.\d{1,3}\.\d{1,3}:3000$/,
  /^http:\/\/172\.3[0-1]\.\d{1,3}\.\d{1,3}:3000$/,
];

const configuredCorsOrigins = config.server.corsOrigins.filter(Boolean);
const allowedCorsOrigins: Array<string | RegExp> = isDevelopment
  ? [...developmentCorsOrigins, ...configuredCorsOrigins]
  : [...configuredCorsOrigins];

function isAllowedOrigin(origin: string): boolean {
  return allowedCorsOrigins.some((entry) =>
    typeof entry === 'string' ? entry === origin : entry.test(origin)
  );
}

// Starting MOSEHXL in production mode

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Non-browser requests may not send Origin; allow them.
    if (!origin) return callback(null, true);
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

// Trust proxy if configured
app.set('trust proxy', config.server.trustProxy);

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
import authSessionRouter from './routes/authSession';
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
app.use('/api/auth', authSessionRouter);
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
if (config.features.swaggerEnabled) {
  app.use('/api/docs', docsRouter);
}

// Client error logging endpoint
import { asyncHandler, notFound, createErrorHandler } from './middleware/errorHandler';
import { initializeErrorRecovery as initErrorRecovery } from './utils/errorRecovery';

if (isDevelopment) {
  app.post('/api/client-errors', asyncHandler(async (req: Request, res: Response) => {
    const payloadBytes = getClientErrorPayloadSizeBytes(req.body);
    if (isClientErrorPayloadTooLarge(req.body)) {
      return res.status(413).json({
        error: `Payload too large (max ${MAX_CLIENT_ERROR_REPORT_BYTES} bytes)`,
      });
    }
    const errorData = sanitizeClientErrorForLog(req.body);

    logger.error(
      `Client Error [${errorData.errorId}]: ${errorData.message}`,
      {
        ...errorData,
        payload_size_bytes: payloadBytes,
        source: 'CLIENT'
      },
      'CLIENT_ERROR_HANDLER'
    );

    res.json({ success: true, message: 'Error logged successfully' });
  }));
} else {
  const clientErrorReportKey = process.env.CLIENT_ERROR_REPORT_KEY;
  if (clientErrorReportKey && clientErrorReportKey.length >= 16) {
    app.post('/api/client-errors', asyncHandler(async (req: Request, res: Response) => {
      const provided = req.header('x-client-error-key') ?? '';
      if (provided !== clientErrorReportKey) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const payloadBytes = getClientErrorPayloadSizeBytes(req.body);
      if (isClientErrorPayloadTooLarge(req.body)) {
        return res.status(413).json({
          error: `Payload too large (max ${MAX_CLIENT_ERROR_REPORT_BYTES} bytes)`,
        });
      }
      const errorData = sanitizeClientErrorForLog(req.body);
      logger.error(
        `Client Error [${errorData.errorId}]: ${errorData.message}`,
        {
          ...errorData,
          payload_size_bytes: payloadBytes,
          source: 'CLIENT'
        },
        'CLIENT_ERROR_HANDLER'
      );
      return res.json({ success: true, message: 'Error logged successfully' });
    }));
  } else {
    logger.warn(
      'CLIENT_ERROR_REPORT_KEY is not configured; /api/client-errors endpoint disabled in production',
      undefined,
      'CLIENT_ERROR_HANDLER'
    );
  }
}

// Error handling: single unified handler (replaces former errorHandler + errorHandling)
initErrorRecovery(logger);
app.use(notFound);
app.use(createErrorHandler(logger));

// Initialize services

// Route services are already initialized above

let isShuttingDown = false;

async function logRuntimeLifecycleEvent(eventType: 'SERVER_STARTED' | 'SERVER_SHUTDOWN', reason?: string) {
  await logSoftwareEventForAllEstablishmentsBestEffort(eventType, {
    node_env: NODE_ENV,
    app_version: APP_VERSION,
    port: config.server.port,
    pid: process.pid,
    reason: reason ?? null,
    timestamp: new Date().toISOString(),
  });
}

// Start the server on all network interfaces
const server = app.listen(config.server.port, '0.0.0.0', async () => {
  try {
    // MOSEHXL API Server running
    await logRuntimeLifecycleEvent('SERVER_STARTED');
    await logSoftwareEventForAllEstablishmentsBestEffort('SOFTWARE_VERSION_REPORTED', {
      app_version: APP_VERSION,
      node_env: NODE_ENV,
      pid: process.pid,
      timestamp: new Date().toISOString(),
    });
    TimeChangeMonitor.start();

    // Start the automatic closure scheduler (only in production)
    if (NODE_ENV === 'production') {
      ClosureScheduler.start()
        .then(async () => {
          await logSoftwareEventForAllEstablishmentsBestEffort(
            'AUTO_CLOSURE_SCHEDULER_STARTED',
            {
              node_env: NODE_ENV,
              pid: process.pid,
              timestamp: new Date().toISOString(),
            }
          );
        })
        .catch(async (error) => {
          logger.error(
            'Failed to start closure scheduler',
            error instanceof Error ? error : new Error(String(error))
          );
          await logSoftwareEventForAllEstablishmentsBestEffort(
            'AUTO_CLOSURE_SCHEDULER_START_FAILED',
            {
              node_env: NODE_ENV,
              pid: process.pid,
              timestamp: new Date().toISOString(),
              error: error instanceof Error ? error.message : String(error),
            }
          );
        });
      // Automatic closure scheduler started
    } else {
      // Automatic closure scheduler disabled in development mode
    }
  } catch (error) {
    logger.error(
      'Critical runtime software-event journaling failed during startup',
      error instanceof Error ? error : new Error(String(error)),
      'LEGAL_JOURNAL'
    );

    server.close(() => {
      process.exit(1);
    });
  }
});

async function handleShutdownSignal(signal: NodeJS.Signals) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  try {
    ClosureScheduler.stop();
    TimeChangeMonitor.stop();
    await logRuntimeLifecycleEvent('SERVER_SHUTDOWN', signal);
  } catch (error) {
    logger.error(
      `Error while handling shutdown signal ${signal}`,
      error instanceof Error ? error : new Error(String(error))
    );
  } finally {
    server.close(() => {
      process.exit(0);
    });
  }
}

process.on('SIGINT', () => {
  void handleShutdownSignal('SIGINT');
});

process.on('SIGTERM', () => {
  void handleShutdownSignal('SIGTERM');
});

export default app;
