import express from 'express';
import { requireAuth, requireAdmin } from './auth';
import { EstablishmentService } from '../services/EstablishmentService';
import { Logger } from '../utils/logger';

const router = express.Router();

// POST /api/establishments - Create new establishment (system admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const establishmentService = new EstablishmentService(Logger.getInstance());
    const result = await establishmentService.createEstablishment(
      req.body,
      String((req as any).user.id),
      req.ip,
      req.headers['user-agent']
    );

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating establishment:', error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Failed to create establishment' 
    });
  }
});

// GET /api/establishments - List all establishments (system admin only)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const establishmentService = new EstablishmentService(Logger.getInstance());
    const result = await establishmentService.getAllEstablishments();
    res.json(result);
  } catch (error) {
    console.error('Error fetching establishments:', error);
    res.status(500).json({ error: 'Failed to fetch establishments' });
  }
});

// GET /api/establishments/:id - Get establishment details (system admin only)
router.get('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const establishmentService = new EstablishmentService(Logger.getInstance());
    const result = await establishmentService.getEstablishmentById(id);
    res.json(result);
  } catch (error) {
    console.error('Error fetching establishment:', error);
    if (error instanceof Error && error.message === 'Establishment not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch establishment' });
    }
  }
});

// Initialize establishment routes
export function initializeEstablishmentRoutes(config: any, logger: any) {
  // Any initialization logic can go here
  logger.info('Establishment routes initialized');
}

export default router;