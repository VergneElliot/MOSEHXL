import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { ClosureScheduler } from './utils/closureScheduler';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Environment-specific configuration
const NODE_ENV = process.env.NODE_ENV || 'production';
const DEFAULT_DB_NAME = NODE_ENV === 'development' ? 'mosehxl_development' : 'mosehxl_production';

console.log(`🌍 Starting MOSEHXL in ${NODE_ENV} mode`);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
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

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 MOSEHXL API Server running on port ${PORT}`);
  console.log(`🔧 Environment: ${NODE_ENV}`);
  console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
  
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
