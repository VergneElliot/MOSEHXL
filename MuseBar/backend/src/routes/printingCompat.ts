import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

/**
 * Compatibility layer for existing thermal print endpoints
 * Redirects to new universal printing API
 */

// POST /api/legal/receipt/:orderId/thermal-print
router.post('/api/legal/receipt/:orderId/thermal-print', async (req: Request, res: Response) => {
  try {
    // Forward to new printing endpoint
    const response = await axios.post(
      `http://localhost:${process.env.PORT || 3001}/api/printing/receipt/${req.params.orderId}`,
      req.body,
      {
        headers: {
          ...req.headers,
          host: undefined // Remove host header to avoid conflicts
        },
        params: req.query
      }
    );
    
    // Map response for backward compatibility
    const result = response.data;
    res.json({
      success: result.success,
      message: result.message,
      receipt_data: result.receipt_data,
      receipt_content: result.metadata?.html || result.metadata?.content || ''
    });
  } catch (error: any) {
    const status = error.response?.status || 500;
    const data = error.response?.data || { error: 'Printing failed' };
    res.status(status).json(data);
  }
});

// POST /api/legal/closure/:bulletinId/thermal-print
router.post('/api/legal/closure/:bulletinId/thermal-print', async (req: Request, res: Response) => {
  try {
    // Forward to new printing endpoint
    const response = await axios.post(
      `http://localhost:${process.env.PORT || 3001}/api/printing/closure/${req.params.bulletinId}`,
      req.body,
      {
        headers: {
          ...req.headers,
          host: undefined
        },
        params: req.query
      }
    );
    
    // Map response for backward compatibility
    const result = response.data;
    res.json({
      success: result.success,
      message: result.message,
      bulletin_content: result.metadata?.html || result.metadata?.content || ''
    });
  } catch (error: any) {
    const status = error.response?.status || 500;
    const data = error.response?.data || { error: 'Printing failed' };
    res.status(status).json(data);
  }
});

// GET /api/legal/thermal-printer/status
router.get('/api/legal/thermal-printer/status', async (req: Request, res: Response) => {
  try {
    // Forward to new printing endpoint
    const response = await axios.get(
      `http://localhost:${process.env.PORT || 3001}/api/printing/status`,
      {
        headers: {
          ...req.headers,
          host: undefined
        }
      }
    );
    
    // Map response for backward compatibility
    const result = response.data;
    res.json({
      available: result.status?.available || false,
      status: result.status?.status || 'Unknown'
    });
  } catch (error: any) {
    const status = error.response?.status || 500;
    const data = error.response?.data || { available: false, status: 'Error checking printer' };
    res.status(status).json(data);
  }
});

// POST /api/legal/thermal-printer/test
router.post('/api/legal/thermal-printer/test', async (req: Request, res: Response) => {
  try {
    // Forward to new printing endpoint
    const response = await axios.post(
      `http://localhost:${process.env.PORT || 3001}/api/printing/test`,
      req.body,
      {
        headers: {
          ...req.headers,
          host: undefined
        }
      }
    );
    
    res.json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    const data = error.response?.data || { success: false, message: 'Test print failed' };
    res.status(status).json(data);
  }
});

export default router;
