import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { ClosureScheduler } from './utils/closureScheduler';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

// Environment-specific configuration
const NODE_ENV = process.env.NODE_ENV || 'production';
const DEFAULT_DB_NAME = NODE_ENV === 'development' ? 'mosehxl_development' : 'mosehxl_production';

console.log(`🌍 Starting MOSEHXL in ${NODE_ENV} mode`);

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

// Database connection with environment-specific defaults
export const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || DEFAULT_DB_NAME,
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
});

console.log(`📊 Connecting to database: ${process.env.DB_NAME || DEFAULT_DB_NAME}`);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'MuseBar API is running' });
});

// Import and use routes
import categoriesRouter from './routes/categories';
import productsRouter from './routes/products';
import ordersRouter from './routes/orders';
import legalRouter from './routes/legal';
import authRouter from './routes/auth';

app.use('/api/categories', categoriesRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/legal', legalRouter);
app.use('/api/auth', authRouter);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server on all network interfaces
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MOSEHXL API Server running on port ${PORT}`);
  console.log(`🔧 Environment: ${NODE_ENV}`);
  console.log(`🌐 Server accessible on:`);
  console.log(`   - Local: http://localhost:${PORT}`);
  console.log(`   - Network: http://[YOUR-LOCAL-IP]:${PORT}`);
  console.log(`💡 To find your local IP, run: hostname -I | awk '{print $1}'`);
  
  // Start the automatic closure scheduler (only in production)
  if (NODE_ENV === 'production') {
    ClosureScheduler.start().catch(error => {
      console.error('❌ Failed to start closure scheduler:', error);
    });
    console.log('⏰ Automatic closure scheduler started');
  } else {
    console.log('⏸️  Automatic closure scheduler disabled in development mode');
  }
});

export default app;
