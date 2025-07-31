/**
 * Professional MuseBar Backend Application
 * Enhanced with comprehensive security, logging, monitoring, and error handling
 */

import express from 'express';
import cors from 'cors';

// Import our professional modules
import { initializeEnvironment, EnvironmentConfig } from './config/environment';
import { initializeLogger, requestLoggerMiddleware } from './utils/logger';
import { DatabaseManager, getDatabaseHealth } from './config/database';
import { createSecurityMiddleware, createCorsOptions } from './middleware/security';
import { createErrorHandler, notFound } from './middleware/errorHandler';

// Import routes
import categoriesRouter from './routes/categories';
import productsRouter from './routes/products';
import ordersRouter from './routes/orders';
import legalRouter from './routes/legal';
import authRouter from './routes/auth';
import docsRouter from './routes/docs';
import userManagementRouter from './routes/userManagement';

// Import utilities
import { ClosureScheduler } from './utils/closureScheduler';

/**
 * Professional Application Class
 */
class MuseBarApplication {
  private app: express.Application;
  private config!: EnvironmentConfig; // Initialized in initializeApplication()
  private logger!: any; // Initialized in initializeApplication()
  private database!: DatabaseManager; // Initialized in initializeApplication()
  private securityMiddleware: any;

  constructor() {
    this.app = express();
    this.initializeApplication();
  }

  /**
   * Initialize the complete application
   */
  private async initializeApplication(): Promise<void> {
    try {
      // 1. Initialize environment and configuration
      this.config = initializeEnvironment();
      
      // 2. Initialize logging system
      this.logger = initializeLogger(this.config);
      this.logger.info('Application initialization started', {}, 'STARTUP');

      // 3. Initialize database connection
      this.database = DatabaseManager.getInstance(this.config, this.logger);
      await this.database.performHealthCheck();

      // 4. Setup middleware stack
      this.setupMiddleware();

      // 5. Setup routes
      this.setupRoutes();

      // 6. Setup error handling
      this.setupErrorHandling();

      // 7. Start server
      this.startServer();

      this.logger.info('Application initialization completed successfully', {}, 'STARTUP');

    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      process.exit(1);
    }
  }

  /**
   * Setup comprehensive middleware stack
   */
  private setupMiddleware(): void {
    this.logger.info('Setting up middleware stack', {}, 'STARTUP');

    // Trust proxy for production deployments
    if (this.config.server.trustProxy) {
      this.app.set('trust proxy', 1);
    }

    // Request ID and logging middleware
    this.app.use(requestLoggerMiddleware(this.logger));

    // CORS configuration
    this.app.use(cors(createCorsOptions(this.config)));

    // Body parsing middleware
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req, res, buf) => {
        // Store raw body for webhook verification if needed
        (req as any).rawBody = buf;
      }
    }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Security middleware stack
    this.securityMiddleware = createSecurityMiddleware(this.config, this.logger, {
      enableRateLimit: this.config.app.environment === 'production',
      enableInputSanitization: true,
      enableSecurityHeaders: true,
      enableRequestSizeLimit: true,
      maxRequestSizeKB: 10 * 1024, // 10MB
    });
    this.app.use(this.securityMiddleware);

    this.logger.info('Middleware stack configured successfully', {}, 'STARTUP');
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    this.logger.info('Setting up API routes', {}, 'STARTUP');

    // Health check endpoints
    this.app.get('/health', this.createHealthCheckHandler());
    this.app.get('/api/health', this.createHealthCheckHandler());

    // System status endpoint
    this.app.get('/api/status', this.createStatusHandler());

    // API routes
    this.app.use('/api/categories', categoriesRouter);
    this.app.use('/api/products', productsRouter);
    this.app.use('/api/orders', ordersRouter);
    this.app.use('/api/legal', legalRouter);
    this.app.use('/api/auth', authRouter);
    this.app.use('/api/user-management', userManagementRouter);

    // API Documentation (if enabled)
    if (this.config.features.swaggerEnabled) {
      this.app.use('/api/docs', docsRouter);
      this.logger.info('API documentation enabled at /api/docs', {}, 'STARTUP');
    }

    // API metrics endpoint (development only)
    if (this.config.app.environment === 'development') {
      this.app.get('/api/metrics', this.createMetricsHandler());
    }

    this.logger.info('API routes configured successfully', {}, 'STARTUP');
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    this.logger.info('Setting up error handling', {}, 'STARTUP');

    // 404 handler for unknown routes
    this.app.use(notFound);

    // Global error handler
    this.app.use(createErrorHandler(this.logger));

    // Process-level error handlers
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error(
        'Unhandled Promise Rejection',
        reason instanceof Error ? reason : new Error(String(reason)),
        { promise: promise.toString() },
        'PROCESS'
      );
    });

    process.on('uncaughtException', (error) => {
      this.logger.error(
        'Uncaught Exception - Application will exit',
        error,
        {},
        'PROCESS'
      );
      
      // Graceful shutdown
      this.gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Graceful shutdown handlers
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));

    this.logger.info('Error handling configured successfully', {}, 'STARTUP');
  }

  /**
   * Start the server
   */
  private startServer(): void {
    const server = this.app.listen(this.config.server.port, this.config.server.host, () => {
      this.logger.info('🚀 MuseBar API Server started successfully', {
        port: this.config.server.port,
        host: this.config.server.host,
        environment: this.config.app.environment,
        nodeVersion: process.version,
        platform: process.platform,
      }, 'STARTUP');

      console.log(`🌐 Server accessible on:`);
      console.log(`   - Local: http://localhost:${this.config.server.port}`);
      console.log(`   - Network: http://[YOUR-LOCAL-IP]:${this.config.server.port}`);
      
      if (this.config.features.swaggerEnabled) {
        console.log(`📚 API Documentation: http://localhost:${this.config.server.port}/api/docs`);
      }
    });

    // Setup server error handling
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        this.logger.error(
          `Port ${this.config.server.port} is already in use`,
          error,
          { port: this.config.server.port },
          'STARTUP'
        );
      } else {
        this.logger.error(
          'Server error occurred',
          error,
          {},
          'STARTUP'
        );
      }
      process.exit(1);
    });

    // Start background services
    this.startBackgroundServices();

    // Store server reference for graceful shutdown
    (this as any).server = server;
  }

  /**
   * Start background services
   */
  private startBackgroundServices(): void {
    // Start automatic closure scheduler (only in production)
    if (this.config.features.autoClosureEnabled) {
      ClosureScheduler.start().then(() => {
        this.logger.info('Automatic closure scheduler started', {}, 'SCHEDULER');
      }).catch(error => {
        this.logger.error(
          'Failed to start closure scheduler',
          error,
          {},
          'SCHEDULER'
        );
      });
    } else {
      this.logger.info('Automatic closure scheduler disabled', {}, 'SCHEDULER');
    }
  }

  /**
   * Create health check handler
   */
  private createHealthCheckHandler() {
    return async (req: express.Request, res: express.Response) => {
      const startTime = Date.now();

      try {
        const dbHealth = getDatabaseHealth(this.database);
        const duration = Date.now() - startTime;

        const health = {
          status: dbHealth.status === 'healthy' ? 'OK' : 'DEGRADED',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: this.config.app.environment,
          version: this.config.app.version,
          checks: {
            database: dbHealth,
            memory: {
              used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
              total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
              external: Math.round(process.memoryUsage().external / 1024 / 1024),
            },
            responseTime: duration,
          },
        };

        const statusCode = health.status === 'OK' ? 200 : 503;
        res.status(statusCode).json(health);

      } catch (error) {
        this.logger.error(
          'Health check failed',
          error as Error,
          {},
          'HEALTH_CHECK',
          (req as any).requestId
        );

        res.status(503).json({
          status: 'ERROR',
          timestamp: new Date().toISOString(),
          error: 'Health check failed',
        });
      }
    };
  }

  /**
   * Create system status handler
   */
  private createStatusHandler() {
    return async (req: express.Request, res: express.Response) => {
      try {
        const dbStats = this.database.getStats();
        const securityStats = this.securityMiddleware?.getStats();

        const status = {
          application: {
            name: this.config.app.name,
            version: this.config.app.version,
            environment: this.config.app.environment,
            uptime: process.uptime(),
            pid: process.pid,
            nodeVersion: process.version,
          },
          database: {
            ...this.database.getInfo(),
            statistics: dbStats,
          },
          security: securityStats,
          system: {
            platform: process.platform,
            arch: process.arch,
            memory: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
          },
          features: this.config.features,
        };

        res.json(status);

      } catch (error) {
        this.logger.error(
          'Status endpoint failed',
          error as Error,
          {},
          'STATUS',
          (req as any).requestId
        );

        res.status(500).json({
          error: 'Failed to retrieve system status',
        });
      }
    };
  }

  /**
   * Create metrics handler (development only)
   */
  private createMetricsHandler() {
    return (req: express.Request, res: express.Response) => {
      // This would integrate with a metrics collection system
      // For now, return basic metrics
      const metrics = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        database: this.database.getStats(),
        security: this.securityMiddleware?.getStats(),
      };

      res.json(metrics);
    };
  }

  /**
   * Graceful shutdown handler
   */
  private async gracefulShutdown(signal: string): Promise<void> {
    this.logger.info(`Received ${signal}. Starting graceful shutdown...`, {}, 'SHUTDOWN');

    const shutdownTimeout = setTimeout(() => {
      this.logger.error('Shutdown timeout exceeded. Forcing exit.', undefined, {}, 'SHUTDOWN');
      process.exit(1);
    }, 30000); // 30 seconds timeout

    try {
      // Stop accepting new connections
      if ((this as any).server) {
        (this as any).server.close(() => {
          this.logger.info('HTTP server closed', {}, 'SHUTDOWN');
        });
      }

      // Cleanup security middleware
      if (this.securityMiddleware?.destroy) {
        this.securityMiddleware.destroy();
        this.logger.info('Security middleware cleaned up', {}, 'SHUTDOWN');
      }

      // Close database connections
      if (this.database) {
        await this.database.close();
        this.logger.info('Database connections closed', {}, 'SHUTDOWN');
      }

      clearTimeout(shutdownTimeout);
      this.logger.info('Graceful shutdown completed', {}, 'SHUTDOWN');
      process.exit(0);

    } catch (error) {
      clearTimeout(shutdownTimeout);
      this.logger.error(
        'Error during shutdown',
        error as Error,
        {},
        'SHUTDOWN'
      );
      process.exit(1);
    }
  }

  /**
   * Get Express app instance
   */
  public getApp(): express.Application {
    return this.app;
  }
}

// Create and export the application
const museBarApp = new MuseBarApplication();
export default museBarApp.getApp(); 