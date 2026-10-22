import { describe, expect, it } from 'vitest';
import type { ClosureBulletinData } from '../printing/types';
import { generateClosureBulletinHTML } from './emailClosureHtml';

const bulletin: ClosureBulletinData = {
  id: 11,
  closure_type: 'DAILY',
  period_start: '2026-10-21T02:00:00.000Z',
  period_end: '2026-10-22T01:59:59.999Z',
  total_transactions: 8,
  fond_de_caisse: 50,
  total_amount: 200,
  total_vat: 30,
  vat_breakdown: {
    vat_10: { amount: 100, vat: 10, ttc: 110 },
    vat_20: { amount: 70, vat: 20, ttc: 90 },
  },
  payment_methods_breakdown: { cash: 80, card: 120 },
  first_sequence: 1,
  last_sequence: 8,
  closure_hash: 'closurehash0123456789',
  is_closed: true,
  closed_at: '2026-10-22T02:05:00.000Z',
  created_at: '2026-10-22T02:05:00.000Z',
  tips_total: 5,
  change_total: 2,
  business_info: {
    name: 'MuseBar',
    address: 'Paris',
    phone: '01',
    email: 'a@b.c',
    siret: 'SIRET1',
  },
  compliance_info: { cash_register_id: 'CR-est' },
};

describe('generateClosureBulletinHTML', () => {
  it('renders French closure bulletin sections', () => {
    const html = generateClosureBulletinHTML(bulletin);
    expect(html).toContain('MuseBar');
    expect(html).toContain('BULLETIN DE CLÔTURE');
    expect(html).toContain('Journalière');
    expect(html).toContain('Bulletin #11');
    expect(html).toContain('RÉSUMÉ PÉRIODE');
    expect(html).toContain('DÉTAIL TVA');
    expect(html).toContain('MODES DE PAIEMENT');
    expect(html).toContain('Espèces');
    expect(html).toContain('Carte');
    expect(html).toContain('Total des pourboires');
    expect(html).toContain('Total de la monnaie rendue');
    expect(html).toContain('Article 286-I-3 bis du CGI');
    expect(html).toContain('Registre: CR-est');
    expect(html).toContain('Hash de clôture: closurehash01234...');
  });
});
