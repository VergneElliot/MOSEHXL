import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import config from '../config';
import { ClosureScheduler } from './utils/closureScheduler';

// Import middleware
import { errorHandler, notFound } from './middleware/errorHandler';
import { Logger } from './middleware/logger';

// Load environment variables
dotenv.config();

const app = express();

// Get environment configuration
const NODE_ENV = process.env.NODE_ENV || 'production';
const currentConfig = config[NODE_ENV as keyof typeof config];
const PORT = currentConfig.server.port;

console.log(`🌍 Starting ${currentConfig.app.name} in ${NODE_ENV} mode`);

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(cors({
  origin: currentConfig.server.corsOrigin.split(',').map((origin: string) => origin.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use(Logger.logRequest);

// Database connection with environment-specific configuration
export const pool = new Pool({
  user: currentConfig.database.user,
  host: currentConfig.database.host,
  database: currentConfig.database.database,
  password: currentConfig.database.password,
  port: currentConfig.database.port,
  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.connect()
  .then(client => {
    console.log(`📊 Connected to database: ${currentConfig.database.database}`);
    client.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  });

// Health check route with detailed status
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    res.status(200).json({
      success: true,
      status: 'OK',
      message: `${currentConfig.app.name} API is running`,
      environment: NODE_ENV,
      version: currentConfig.app.version,
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'ERROR',
      message: 'Service unavailable',
      error: 'Database connection failed'
    });
  }
});

// API Routes
import categoriesRouter from './routes/categories';
import productsRouter from './routes/products';
// import ordersRouter from './routes/orders.new'; // Use improved orders route
import ordersRouter from './routes/orders'; // Keep existing for now
import legalRouter from './routes/legal';
import authRouter from './routes/auth';

// Mount routes with API versioning
app.use('/api/v1/categories', categoriesRouter);
app.use('/api/v1/products', productsRouter);
app.use('/api/v1/orders', ordersRouter);
app.use('/api/v1/legal', legalRouter);
app.use('/api/v1/auth', authRouter);

// Maintain backward compatibility with non-versioned routes
app.use('/api/categories', categoriesRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/legal', legalRouter);
app.use('/api/auth', authRouter);

// Handle 404 for unknown routes
app.use(notFound);

// Global error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown handling
const gracefulShutdown = () => {
  console.log('🔄 Received shutdown signal, closing HTTP server...');
  
  pool.end(() => {
    console.log('📊 Database connection pool closed');
  });

  if (NODE_ENV === 'production') {
    ClosureScheduler.stop();
    console.log('⏸️ Closure scheduler stopped');
  }

  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start the server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ${currentConfig.app.name} API Server running on port ${PORT}`);
  console.log(`🔧 Environment: ${NODE_ENV}`);
  console.log(`🌐 Server accessible on:`);
  console.log(`   - Local: http://localhost:${PORT}`);
  console.log(`   - Health: http://localhost:${PORT}/api/health`);
  console.log(`   - API v1: http://localhost:${PORT}/api/v1/`);
  
  if (currentConfig.debug?.enabled) {
    console.log(`🐛 Debug mode enabled (${currentConfig.debug.logLevel})`);
  }

  // Start the automatic closure scheduler (only in production)
  if (NODE_ENV === 'production' && currentConfig.legal.journalEnabled) {
    ClosureScheduler.start().catch(error => {
      console.error('❌ Failed to start closure scheduler:', error);
    });
    console.log('⏰ Automatic closure scheduler started');
  } else {
    console.log('⏸️ Automatic closure scheduler disabled');
  }

  Logger.logSystemEvent('SERVER_START', {
    port: PORT,
    environment: NODE_ENV,
    version: currentConfig.app.version
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

export default app; 