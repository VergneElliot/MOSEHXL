import express from 'express';
import { requireAuth, getEstablishmentId, requirePermission } from '../auth';
import { P } from '../../permissions/registry';
import { BusinessInfoModel } from '../../models/legalJournal/businessInfoModel';

const router = express.Router();

// Do not `router.use(requirePermission(...))` for the whole router: this file is mounted
// at `/` next to `businessDayStats` in `legal/index.ts`, and global middleware would run
// for every `/api/legal/*` path and incorrectly gate `/legal/business-day-stats`.
const requireSettings = requirePermission(P.access_settings);

// GET /api/legal/business-info
router.get('/business-info', requireAuth, requireSettings, async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;

  try {
    const data = await BusinessInfoModel.getBusinessInfo(establishmentId);
    return res.json(data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching business info:', error);
    res.status(500).json({ error: 'Failed to fetch business info' });
  }
});

// PUT /api/legal/business-info
router.put('/business-info', requireAuth, requireSettings, async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;

  const { name, address, phone, email, siret, tax_identification } = req.body || {};

  try {
    const data = await BusinessInfoModel.upsertBusinessInfo(establishmentId, {
      name,
      address,
      phone,
      email,
      siret,
      tax_identification,
    });

    return res.json(data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error saving business info:', error);
    res.status(500).json({ error: 'Failed to save business info' });
  }
});

export default router;

