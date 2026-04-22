/**
 * Environment Validation and Configuration Management
 * Ensures all required environment variables are present and valid
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Required environment variables for the application.
 * In production, ARCHIVE_SECRET_KEY is also required for legal/archive signing.
 */
const REQUIRED_ENV_VARS: Record<string, string> = {
  // Database
  DB_HOST: 'Database host',
  DB_PORT: 'Database port',
  DB_NAME: 'Database name',
  DB_USER: 'Database user',
  DB_PASSWORD: 'Database password',

  // Application
  NODE_ENV: 'Node environment',

  // Security
  JWT_SECRET: 'JWT secret key',

  // Optional but recommended
  CORS_ORIGIN: 'CORS origin (optional)',
};

/**
 * Validates that all required environment variables are present
 * @throws Error if any required environment variables are missing
 */
export const validateEnvironment = (): void => {
  const missing: string[] = [];
  const invalid: string[] = [];

  // In production, archive signing requires a secret key (no hardcoded fallback)
  const requiredVars = { ...REQUIRED_ENV_VARS };
  if (process.env.NODE_ENV === 'production') {
    requiredVars.ARCHIVE_SECRET_KEY = 'Archive HMAC key for legal/export signing';
    requiredVars.SETUP_SECRET = 'Setup secret key (protects one-time bootstrap endpoints)';
  }

  // Check required variables
  Object.entries(requiredVars).forEach(([key, description]) => {
    const value = process.env[key];
    
    if (!value) {
      missing.push(`${key} (${description})`);
      return;
    }

    // Validate specific formats
    switch (key) {
      case 'DB_PORT':
      case 'PORT':
        if (isNaN(parseInt(value)) || parseInt(value) <= 0) {
          invalid.push(`${key} must be a positive number, got: ${value}`);
        }
        break;
      case 'NODE_ENV':
        if (!['development', 'production', 'test'].includes(value)) {
          invalid.push(`${key} must be 'development', 'production', or 'test', got: ${value}`);
        }
        break;
      case 'JWT_SECRET':
        if (value.length < 32) {
          invalid.push(`${key} must be at least 32 characters long for security`);
        }
        break;
      case 'ARCHIVE_SECRET_KEY':
        if (value.length < 32) {
          invalid.push(`${key} must be at least 32 characters long for security`);
        }
        break;
    }
  });

  // Optional-but-security-sensitive variables.
  // If provided, validate format/length; if omitted, features that depend on them must fail closed.
  if (process.env.SETUP_SECRET && process.env.SETUP_SECRET.length < 32) {
    invalid.push('SETUP_SECRET must be at least 32 characters long for security');
  }

  // Report errors
  if (missing.length > 0) {
    process.stderr.write('❌ Missing required environment variables:\n');
    missing.forEach(variable => process.stderr.write(`   - ${variable}\n`));
  }

  if (invalid.length > 0) {
    process.stderr.write('❌ Invalid environment variables:\n');
    invalid.forEach(error => process.stderr.write(`   - ${error}\n`));
  }

  if (missing.length > 0 || invalid.length > 0) {
    process.stderr.write('\n💡 Create a .env file in your backend directory with the required variables.\n');
    process.stderr.write('💡 See .env.example for a template.\n');
    process.exit(1);
  }

  process.stdout.write('✅ Environment validation passed\n');
};

/**
 * Type-safe environment configuration
 */
export interface EnvironmentConfig {
  // Database
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl: boolean;
    maxConnections: number;
    idleTimeoutMillis: number;
  };

  // Server
  server: {
    port: number;
    host: string;
    corsOrigins: string[];
    trustProxy: boolean;
  };

  // Security
  security: {
    jwtSecret: string;
    jwtExpiresIn: string;
    archiveSecretKey: string | undefined; // Required in production, optional in dev
    setupSecret: string | undefined; // Used to protect bootstrap endpoints (optional; must fail closed if unset)
    bcryptRounds: number;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
  };

  // Application
  app: {
    name: string;
    version: string;
    environment: 'development' | 'production' | 'test';
  };

  // Features
  features: {
    legalJournalEnabled: boolean;
    legalStrictMode: boolean;
    autoClosureEnabled: boolean;
    swaggerEnabled: boolean;
  };

  // Logging
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    enableFileLogging: boolean;
    enableDatabaseLogging: boolean;
  };
}

/**
 * Get validated and typed environment configuration
 */
export const getEnvironmentConfig = (): EnvironmentConfig => {
  const nodeEnv = process.env.NODE_ENV as 'development' | 'production' | 'test';
  const isProduction = nodeEnv === 'production';
  const isDevelopment = nodeEnv === 'development';

  return {
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || (isDevelopment ? 'mosehxl_development' : 'mosehxl_production'),
      user: process.env.DB_USER || 'postgres',
      // No fallback: validateEnvironment() ensures DB_PASSWORD is set before we get here
      password: process.env.DB_PASSWORD!,
      ssl: isProduction,
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    },

    server: {
      port: parseInt(process.env.PORT || '3001'),
      host: process.env.HOST || '0.0.0.0',
      corsOrigins: process.env.CORS_ORIGIN 
        ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
        : isDevelopment 
          ? ['http://localhost:3000', 'http://127.0.0.1:3000']
          : [],
      trustProxy: isProduction,
    },

    security: {
      // No fallback: validateEnvironment() ensures JWT_SECRET is set before we get here
      jwtSecret: process.env.JWT_SECRET!,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
      archiveSecretKey: process.env.ARCHIVE_SECRET_KEY,
      setupSecret: process.env.SETUP_SECRET,
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
      rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      // Default tuned for POS: menus, history, orders, change ops, refetches — almost all traffic is authenticated
      rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '500'),
    },

    app: {
      name: 'MuseBar POS',
      version: process.env.npm_package_version || '1.0.0',
      environment: nodeEnv,
    },

    features: {
      legalJournalEnabled: process.env.LEGAL_JOURNAL_ENABLED !== 'false',
      legalStrictMode: isProduction,
      autoClosureEnabled: isProduction && process.env.AUTO_CLOSURE_ENABLED !== 'false',
      swaggerEnabled: isDevelopment || process.env.SWAGGER_ENABLED === 'true',
    },

    logging: {
      level: (process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || (isDevelopment ? 'debug' : 'info'),
      enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true',
      enableDatabaseLogging: process.env.ENABLE_DB_LOGGING === 'true',
    },
  };
};

/**
 * Initialize and validate environment
 * Call this at the start of your application
 */
export const initializeEnvironment = (): EnvironmentConfig => {
  // Initialize environment configuration
  
  validateEnvironment();
  const config = getEnvironmentConfig();
  
  if (process.env.NODE_ENV !== 'test') {
    process.stdout.write(`🌍 Environment: ${config.app.environment}\n`);
    process.stdout.write(`📱 Application: ${config.app.name} v${config.app.version}\n`);
    process.stdout.write(`🚀 Server: ${config.server.host}:${config.server.port}\n`);
    process.stdout.write(`📊 Database: ${config.database.host}:${config.database.port}/${config.database.database}\n`);
    process.stdout.write(`🔐 Security: JWT (${config.security.jwtExpiresIn}), BCrypt (${config.security.bcryptRounds} rounds)\n`);
    process.stdout.write(`📝 Logging: ${config.logging.level} level\n`);
  }
  
  return config;
}; 