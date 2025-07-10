// Example configuration file - Copy to config.js and modify for your environment

module.exports = {
  production: {
    // Database Configuration
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'mosehxl_production',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'your_password_here'
    },
    
    // JWT Configuration
    jwt: {
      secret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_here'
    },
    
    // Server Configuration
    server: {
      port: process.env.PORT || 3001,
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
    },
    
    // Legal Compliance
    legal: {
      journalEnabled: true,
      strictMode: true
    },
    
    // Application Settings
    app: {
      name: 'MOSEHXL',
      version: '1.0.0',
      environment: 'production'
    }
  },
  
  development: {
    // Database Configuration
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'mosehxl_development',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres'
    },
    
    // JWT Configuration
    jwt: {
      secret: process.env.JWT_SECRET || 'development_jwt_secret_not_for_production'
    },
    
    // Server Configuration
    server: {
      port: process.env.PORT || 3001,
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
    },
    
    // Legal Compliance (relaxed for development)
    legal: {
      journalEnabled: true,
      strictMode: false
    },
    
    // Application Settings
    app: {
      name: 'MOSEHXL-DEV',
      version: '1.0.0-dev',
      environment: 'development'
    },
    
    // Debug Settings
    debug: {
      enabled: true,
      logLevel: 'debug'
    }
  }
}; 