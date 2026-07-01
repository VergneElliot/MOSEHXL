import { describe, expect, it } from 'vitest';

import { slugifyKitchenPrinterName } from '../../models/database/kitchenPrinterModel';
import { toKitchenPrinterLineSnapshots } from './kitchenPrinterSnapshot';

describe('kitchen printer snapshot helpers', () => {
  it('slugifyKitchenPrinterName normalizes accents and spaces', () => {
    expect(slugifyKitchenPrinterName('Bar Principal')).toBe('bar_principal');
    expect(slugifyKitchenPrinterName('Cuisine a l etage')).toBe('cuisine_a_l_etage');
  });

  it('toKitchenPrinterLineSnapshots keeps id, name, and slug', () => {
    const snapshots = toKitchenPrinterLineSnapshots([
      {
        id: 3,
        establishment_id: 'est-1',
        name: 'Bar',
        slug: 'bar',
        connection_type: 'bridge',
        connection_config: {},
        display_order: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    expect(snapshots).toEqual([{ id: 3, name: 'Bar', slug: 'bar' }]);
  });
});
