import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getArchivedProducts, getProducts } from './products';
import { request } from './core';

vi.mock('./core', () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

const baseProduct = {
  id: 11,
  name: 'IPA',
  description: 'Hoppy',
  price: '8.50',
  tax_rate: '20',
  category_id: 3,
  is_happy_hour_eligible: true,
  happy_hour_discount_percent: '10',
  happy_hour_discount_fixed: null,
  is_active: true,
  option_group_ids: [1],
  option_groups: [
    {
      id: 1,
      name: 'Size',
      is_required: true,
      allow_free_text: false,
      free_text_label: null,
      free_text_max_length: 80,
      display_order: 1,
      is_active: true,
      choices: [
        {
          id: 2,
          group_id: 1,
          label: 'Pinte',
          display_order: 0,
          is_active: true,
        },
      ],
    },
  ],
  kitchen_printer_ids: [9],
  kitchen_printers: [
    {
      id: 9,
      name: 'Cuisine',
      slug: 'cuisine',
      connection_type: 'bridge',
      connection_config: { bridgeTarget: 'lan-1', host: 'ignored' },
      display_order: 0,
      is_active: true,
    },
  ],
  print_pickup_slip: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
};

describe('products API DTO mapper', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  it('maps percent happy-hour discount, options, and printers', async () => {
    mockedRequest.mockResolvedValueOnce([baseProduct]);
    const [product] = await getProducts();
    expect(product).toMatchObject({
      id: '11',
      name: 'IPA',
      price: 8.5,
      taxRate: 0.2,
      categoryId: '3',
      happyHourDiscountType: 'percentage',
      happyHourDiscountValue: 0.1,
      printPickupSlip: true,
      optionGroupIds: ['1'],
      kitchenPrinterIds: ['9'],
    });
    expect(product?.optionGroups?.[0]).toMatchObject({
      id: '1',
      isRequired: true,
      choices: [{ id: '2', label: 'Pinte' }],
    });
    expect(product?.kitchenPrinters?.[0]).toMatchObject({
      id: '9',
      connectionType: 'bridge',
      connectionConfig: { bridgeTarget: 'lan-1', host: 'ignored' },
    });
  });

  it('prefers fixed discount when percent is absent', async () => {
    mockedRequest.mockResolvedValueOnce([
      {
        ...baseProduct,
        happy_hour_discount_percent: null,
        happy_hour_discount_fixed: '1.50',
        option_groups: null,
        kitchen_printers: null,
        option_group_ids: null,
        kitchen_printer_ids: null,
        print_pickup_slip: false,
        is_active: false,
      },
    ]);
    const [product] = await getProducts();
    expect(product).toMatchObject({
      happyHourDiscountType: 'fixed',
      happyHourDiscountValue: 1.5,
      isActive: false,
      optionGroups: [],
      kitchenPrinters: [],
      printPickupSlip: false,
    });
  });

  it('forces archived products inactive', async () => {
    mockedRequest.mockResolvedValueOnce([{ ...baseProduct, is_active: true }]);
    const [product] = await getArchivedProducts();
    expect(product?.isActive).toBe(false);
  });
});
