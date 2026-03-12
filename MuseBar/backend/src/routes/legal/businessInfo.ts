import express from 'express';
import { pool } from '../../app';
import { requireAuth, getEstablishmentId } from '../auth';

const router = express.Router();

router.use(requireAuth);

// GET /api/legal/business-info
router.get('/business-info', async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;

  try {
    const result = await pool.query(
      `SELECT name, address, phone, email, siret, tax_identification
       FROM business_settings
       WHERE establishment_id = $1
       ORDER BY updated_at DESC
       LIMIT 1`,
      [establishmentId]
    );

    if (result.rows.length === 0) {
      return res.json({
        name: '',
        address: '',
        phone: '',
        email: '',
        siret: '',
        tax_identification: '',
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching business info:', error);
    res.status(500).json({ error: 'Failed to fetch business info' });
  }
});

// PUT /api/legal/business-info
router.put('/business-info', async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;

  const { name, address, phone, email, siret, tax_identification } = req.body || {};

  try {
    const result = await pool.query(
      `INSERT INTO business_settings (
         establishment_id, name, address, phone, email, siret, tax_identification, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (establishment_id)
       DO UPDATE SET
         name = EXCLUDED.name,
         address = EXCLUDED.address,
         phone = EXCLUDED.phone,
         email = EXCLUDED.email,
         siret = EXCLUDED.siret,
         tax_identification = EXCLUDED.tax_identification,
         updated_at = CURRENT_TIMESTAMP
       RETURNING name, address, phone, email, siret, tax_identification`,
      [establishmentId, name, address, phone, email, siret, tax_identification]
    );

    res.json(result.rows[0]);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error saving business info:', error);
    res.status(500).json({ error: 'Failed to save business info' });
  }
});

export default router;

