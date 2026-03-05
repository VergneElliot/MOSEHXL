import { Router, Request, Response } from 'express';
import { PrintingServiceFactory, IPrintingService, PrintingConfig } from '../services/printing';
import { pool } from '../app';
import { authenticateToken } from '../middleware/auth';
import { getLogger } from '../utils/logger';

const router = Router();

// Cache for printing services per establishment
const printingServices: Map<number, IPrintingService> = new Map();

/**
 * Get printing service for establishment
 */
async function getPrintingService(establishmentId: number): Promise<IPrintingService> {
  // Check cache first
  if (printingServices.has(establishmentId)) {
    return printingServices.get(establishmentId)!;
  }

  try {
    // Get configuration from database
    const configResult = await pool.query(
      `SELECT * FROM printing_configurations 
       WHERE establishment_id = $1 AND is_active = true 
       ORDER BY created_at DESC LIMIT 1`,
      [establishmentId]
    );

    let config: PrintingConfig;
    
    if (configResult.rows.length > 0) {
      const dbConfig = configResult.rows[0];
      config = {
        provider: dbConfig.provider,
        establishmentId,
        ...dbConfig.config
      };
    } else {
      // Default configuration
      config = {
        provider: 'composite',
        establishmentId,
        providers: [
          { provider: 'network' },
          { provider: 'browser' }
        ]
      };
    }

    // Create and cache service
    const service = await PrintingServiceFactory.create(config);
    printingServices.set(establishmentId, service);
    
    return service;
  } catch (error) {
    getLogger().error('Error getting printing service', error instanceof Error ? error : undefined);
    
    // Fallback to browser printing
    const fallbackService = await PrintingServiceFactory.create({
      provider: 'browser',
      establishmentId
    });
    
    return fallbackService;
  }
}

// Middleware to ensure establishment context
const ensureEstablishment = (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  if (!user || !user.establishment_id) {
    return res.status(400).json({ error: 'Establishment context required' });
  }
  next();
};

/** In-process handler: get status and printers. Used by routes and by printingCompat. */
export async function getStatusResponse(user: { establishment_id: number }) {
  const service = await getPrintingService(user.establishment_id);
  const status = await service.checkPrinterStatus();
  const printers = await service.listPrinters();
  return { status, printers, establishment_id: user.establishment_id };
}

/** In-process handler: test print. Used by routes and by printingCompat. */
export async function testPrintResponse(user: { establishment_id: number }, printerId?: string) {
  const service = await getPrintingService(user.establishment_id);
  return await service.testPrint(printerId);
}

// GET /api/printing/status
router.get('/status', authenticateToken, ensureEstablishment, async (req: Request, res: Response) => {
  try {
    const data = await getStatusResponse((req as any).user);
    res.json(data);
  } catch (error) {
    getLogger().error('Error checking printer status', error instanceof Error ? error : undefined);
    res.status(500).json({ 
      error: 'Failed to check printer status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/printing/printers
router.get('/printers', authenticateToken, ensureEstablishment, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const service = await getPrintingService(user.establishment_id);
    
    const printers = await service.listPrinters();
    
    res.json({
      printers,
      establishment_id: user.establishment_id
    });
  } catch (error) {
    getLogger().error('Error listing printers', error instanceof Error ? error : undefined);
    res.status(500).json({ 
      error: 'Failed to list printers',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/printing/test
router.post('/test', authenticateToken, ensureEstablishment, async (req: Request, res: Response) => {
  try {
    const result = await testPrintResponse((req as any).user, req.body?.printerId);
    res.json(result);
  } catch (error) {
    getLogger().error('Error test printing', error instanceof Error ? error : undefined);
    res.status(500).json({ 
      error: 'Test print failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/** In-process handler: print receipt. Used by routes and by printingCompat. */
export async function printReceiptResponse(
  user: { establishment_id: number; username?: string },
  orderId: number,
  type: string = 'detailed'
): Promise<{ result: any; receiptData: any }> {
  const establishmentId = user.establishment_id;
  const receiptResult = await pool.query(
    `SELECT 
      o.id as order_id,
      o.receipt_number as sequence_number,
      o.total_amount,
      o.tax_amount as total_tax,
      o.payment_method,
      o.created_at,
      o.tips,
      o.change AS change,
      o.receipt_hash,
      json_agg(
        json_build_object(
          'product_name', oi.product_name,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'total_price', oi.total_price,
          'tax_rate', p.tax_rate
        )
      ) as items,
      e.name as business_name,
      e.address as business_address,
      e.phone as business_phone,
      e.email as business_email,
      e.siret,
      e.tax_identification
    FROM orders o
    JOIN establishments e ON e.id = $2
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE o.id = $1 AND o.establishment_id = $2
    GROUP BY o.id, e.id`,
    [orderId, establishmentId]
  );

  if (receiptResult.rows.length === 0) {
    const err: any = new Error('Receipt not found');
    err.statusCode = 404;
    throw err;
  }

  const receiptRow = receiptResult.rows[0];
  const receiptData = {
    order_id: receiptRow.order_id,
    sequence_number: receiptRow.sequence_number,
    total_amount: parseFloat(receiptRow.total_amount),
    total_tax: parseFloat(receiptRow.total_tax),
    payment_method: receiptRow.payment_method,
    created_at: receiptRow.created_at,
    items: receiptRow.items,
    business_info: {
      name: receiptRow.business_name,
      address: receiptRow.business_address,
      phone: receiptRow.business_phone,
      email: receiptRow.business_email,
      siret: receiptRow.siret,
      tax_identification: receiptRow.tax_identification
    },
    receipt_type: type as 'detailed' | 'summary',
    tips: receiptRow.tips ? parseFloat(receiptRow.tips) : undefined,
    change: receiptRow.change ? parseFloat(receiptRow.change) : undefined,
    compliance_info: {
      receipt_hash: receiptRow.receipt_hash,
      cash_register_id: `CR-${user.establishment_id}`,
      operator_id: user.username
    }
  };

  const vatBreakdown: any[] = [];
  const vat10Items = receiptRow.items?.filter((item: any) => item.tax_rate === 10) || [];
  const vat20Items = receiptRow.items?.filter((item: any) => item.tax_rate === 20) || [];
  if (vat10Items.length > 0) {
    const subtotal = vat10Items.reduce((sum: number, item: any) => sum + parseFloat(item.total_price), 0);
    const vat = subtotal * 0.1 / 1.1;
    vatBreakdown.push({ rate: 10, subtotal_ht: subtotal - vat, vat });
  }
  if (vat20Items.length > 0) {
    const subtotal = vat20Items.reduce((sum: number, item: any) => sum + parseFloat(item.total_price), 0);
    const vat = subtotal * 0.2 / 1.2;
    vatBreakdown.push({ rate: 20, subtotal_ht: subtotal - vat, vat });
  }
  (receiptData as any).vat_breakdown = vatBreakdown;

  const service = await getPrintingService(user.establishment_id);
  const result = await service.printReceipt(receiptData);
  await pool.query(
    `INSERT INTO printing_history 
     (establishment_id, print_type, provider, status, metadata) 
     VALUES ($1, $2, $3, $4, $5)`,
    [
      user.establishment_id,
      'receipt',
      result.provider || 'unknown',
      result.success ? 'success' : 'failed',
      JSON.stringify({
        order_id: orderId,
        receipt_number: receiptRow.sequence_number,
        ...result.metadata
      })
    ]
  );
  return { result, receiptData };
}

/** In-process handler: print closure bulletin. Used by routes and by printingCompat. */
export async function printClosureBulletinResponse(
  user: { establishment_id: number; username?: string },
  bulletinId: number
): Promise<{ result: any; bulletinData: any }> {
  const bulletinResult = await pool.query(
    `SELECT 
      cb.*,
      e.name as business_name,
      e.address as business_address,
      e.phone as business_phone,
      e.email as business_email,
      e.siret,
      e.tax_identification
    FROM closure_bulletins cb
    JOIN establishments e ON cb.establishment_id = e.id
    WHERE cb.id = $1 AND cb.establishment_id = $2`,
    [bulletinId, user.establishment_id]
  );

  if (bulletinResult.rows.length === 0) {
    const err: any = new Error('Closure bulletin not found');
    err.statusCode = 404;
    throw err;
  }

  const bulletin = bulletinResult.rows[0];
  const bulletinData = {
    id: bulletin.id,
    closure_type: bulletin.closure_type,
    period_start: bulletin.period_start,
    period_end: bulletin.period_end,
    total_transactions: bulletin.total_transactions,
    total_amount: parseFloat(bulletin.total_amount),
    total_vat: parseFloat(bulletin.total_vat),
    vat_breakdown: bulletin.vat_breakdown,
    payment_methods_breakdown: bulletin.payment_methods_breakdown,
    first_sequence: bulletin.first_sequence,
    last_sequence: bulletin.last_sequence,
    closure_hash: bulletin.closure_hash,
    is_closed: bulletin.is_closed,
    closed_at: bulletin.closed_at,
    created_at: bulletin.created_at,
    tips_total: bulletin.tips_total ? parseFloat(bulletin.tips_total) : undefined,
    change_total: bulletin.change_total ? parseFloat(bulletin.change_total) : undefined,
    business_info: {
      name: bulletin.business_name,
      address: bulletin.business_address,
      phone: bulletin.business_phone,
      email: bulletin.business_email,
      siret: bulletin.siret,
      tax_identification: bulletin.tax_identification
    },
    compliance_info: {
      cash_register_id: `CR-${user.establishment_id}`,
      operator_id: user.username
    }
  };

  const service = await getPrintingService(user.establishment_id);
  const result = await service.printClosureBulletin(bulletinData);
  await pool.query(
    `INSERT INTO printing_history 
     (establishment_id, print_type, provider, status, metadata) 
     VALUES ($1, $2, $3, $4, $5)`,
    [
      user.establishment_id,
      'closure_bulletin',
      result.provider || 'unknown',
      result.success ? 'success' : 'failed',
      JSON.stringify({
        bulletin_id: bulletinId,
        closure_type: bulletin.closure_type,
        ...result.metadata
      })
    ]
  );
  return { result, bulletinData };
}

// POST /api/printing/receipt/:orderId
router.post('/receipt/:orderId', authenticateToken, ensureEstablishment, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const orderId = parseInt(req.params.orderId);
    const type = (req.query.type as string) || 'detailed';
    const { result, receiptData } = await printReceiptResponse(user, orderId, type);
    res.json({ ...result, receipt_data: receiptData });
  } catch (error: any) {
    if (error?.statusCode === 404) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    getLogger().error('Error printing receipt', error instanceof Error ? error : undefined);
    res.status(500).json({ 
      error: 'Failed to print receipt',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/printing/closure/:bulletinId
router.post('/closure/:bulletinId', authenticateToken, ensureEstablishment, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const bulletinId = parseInt(req.params.bulletinId);
    const { result, bulletinData } = await printClosureBulletinResponse(user, bulletinId);
    res.json({ ...result, bulletin_data: bulletinData });
  } catch (error: any) {
    if (error?.statusCode === 404) {
      return res.status(404).json({ error: 'Closure bulletin not found' });
    }
    getLogger().error('Error printing closure bulletin', error instanceof Error ? error : undefined);
    res.status(500).json({ 
      error: 'Failed to print closure bulletin',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/printing/configuration
router.get('/configuration', authenticateToken, ensureEstablishment, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    const configResult = await pool.query(
      `SELECT * FROM printing_configurations 
       WHERE establishment_id = $1 
       ORDER BY created_at DESC`,
      [user.establishment_id]
    );
    
    res.json({
      configurations: configResult.rows,
      establishment_id: user.establishment_id
    });
  } catch (error) {
    getLogger().error('Error getting printing configuration', error instanceof Error ? error : undefined);
    res.status(500).json({ 
      error: 'Failed to get printing configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/printing/configuration
router.post('/configuration', authenticateToken, ensureEstablishment, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { provider, config } = req.body;
    
    if (!provider) {
      return res.status(400).json({ error: 'Provider is required' });
    }
    
    // Deactivate existing configurations
    await pool.query(
      `UPDATE printing_configurations 
       SET is_active = false 
       WHERE establishment_id = $1`,
      [user.establishment_id]
    );
    
    // Insert new configuration
    const result = await pool.query(
      `INSERT INTO printing_configurations 
       (establishment_id, provider, config, is_active) 
       VALUES ($1, $2, $3, true) 
       RETURNING *`,
      [user.establishment_id, provider, JSON.stringify(config || {})]
    );
    
    // Clear cached service
    printingServices.delete(user.establishment_id);
    
    res.json({
      configuration: result.rows[0],
      message: 'Printing configuration updated successfully'
    });
  } catch (error) {
    getLogger().error('Error updating printing configuration', error instanceof Error ? error : undefined);
    res.status(500).json({ 
      error: 'Failed to update printing configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/printing/history
router.get('/history', authenticateToken, ensureEstablishment, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { limit = 50, offset = 0 } = req.query;
    
    const historyResult = await pool.query(
      `SELECT * FROM printing_history 
       WHERE establishment_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [user.establishment_id, limit, offset]
    );
    
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM printing_history WHERE establishment_id = $1`,
      [user.establishment_id]
    );
    
    res.json({
      history: historyResult.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    getLogger().error('Error getting printing history', error instanceof Error ? error : undefined);
    res.status(500).json({ 
      error: 'Failed to get printing history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Export router
export default router;
