import { describe, expect, it } from 'vitest';
import { mapBusinessInfoFromBackend } from './businessInfoMapper';

describe('mapBusinessInfoFromBackend', () => {
  it('maps snake_case tax id and preserves fields', () => {
    expect(
      mapBusinessInfoFromBackend({
        name: 'Muse',
        address: '1 rue',
        phone: '01',
        email: 'a@b.c',
        siret: '123',
        tax_identification: 'FR99',
      })
    ).toEqual({
      name: 'Muse',
      address: '1 rue',
      phone: '01',
      email: 'a@b.c',
      siret: '123',
      taxIdentification: 'FR99',
    });
  });

  it('coerces missing strings to empty', () => {
    expect(
      mapBusinessInfoFromBackend({
        name: '',
        address: null as unknown as string,
        phone: undefined as unknown as string,
        email: '',
        siret: '',
        tax_identification: '',
      })
    ).toEqual({
      name: '',
      address: '',
      phone: '',
      email: '',
      siret: '',
      taxIdentification: '',
    });
  });
});
