import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getArchivedCategories,
  getCategories,
  updateCategory,
} from './categories';
import { request } from './core';

vi.mock('./core', () => ({
  request: vi.fn(),
}));

const mockedRequest = vi.mocked(request);

const raw = {
  id: 4,
  name: 'Bières',
  description: 'Pression',
  color: '#112233',
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
};

describe('categories API DTO mapper', () => {
  beforeEach(() => {
    mockedRequest.mockReset();
  });

  it('maps category records with defaults', async () => {
    mockedRequest.mockResolvedValueOnce([
      { ...raw, color: '', description: null, is_active: undefined },
    ]);
    const [cat] = await getCategories();
    expect(cat).toMatchObject({
      id: '4',
      name: 'Bières',
      description: '',
      color: '#1976d2',
      isActive: true,
    });
  });

  it('forces archived categories inactive', async () => {
    mockedRequest.mockResolvedValueOnce([{ ...raw, is_active: true }]);
    const [cat] = await getArchivedCategories();
    expect(cat?.isActive).toBe(false);
  });

  it('updateCategory with empty patch re-fetches and maps', async () => {
    mockedRequest.mockResolvedValueOnce(raw);
    const cat = await updateCategory('4', {});
    expect(mockedRequest).toHaveBeenCalledWith('/categories/4');
    expect(cat).toMatchObject({ id: '4', name: 'Bières', color: '#112233' });
  });

  it('updateCategory sends only provided fields', async () => {
    mockedRequest.mockResolvedValueOnce({ ...raw, name: 'Vins', color: '#ff0000' });
    const cat = await updateCategory('4', { name: 'Vins', color: '#ff0000', isActive: false });
    expect(mockedRequest).toHaveBeenCalledWith(
      '/categories/4',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ name: 'Vins', color: '#ff0000', is_active: false }),
      })
    );
    expect(cat.name).toBe('Vins');
  });
});
