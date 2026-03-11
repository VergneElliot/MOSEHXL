import { request } from './core';
import { Category } from '../../types';

export async function getCategories(): Promise<Category[]> {
  const categories = await request<any[]>('/categories');
  return categories.map(cat => ({
    id: cat.id.toString(),
    name: cat.name,
    description: cat.description || '',
    color: cat.color || '#1976d2',
    isActive: cat.is_active !== false,
    createdAt: new Date(cat.created_at),
    updatedAt: new Date(cat.updated_at),
  }));
}

export async function getArchivedCategories(): Promise<Category[]> {
  const categories = await request<any[]>('/categories/archived');
  return categories.map(cat => ({
    id: cat.id.toString(),
    name: cat.name,
    description: cat.description || '',
    color: cat.color || '#1976d2',
    isActive: false,
    createdAt: new Date(cat.created_at),
    updatedAt: new Date(cat.updated_at),
  }));
}

export async function getAllCategoriesIncludingArchived(): Promise<Category[]> {
  const categories = await request<any[]>('/categories/all');
  return categories.map(cat => ({
    id: cat.id.toString(),
    name: cat.name,
    description: cat.description || '',
    color: cat.color || '#1976d2',
    isActive: cat.is_active !== false,
    createdAt: new Date(cat.created_at),
    updatedAt: new Date(cat.updated_at),
  }));
}

export async function createCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
  const result = await request<any>('/categories', {
    method: 'POST',
    body: JSON.stringify({
      name: category.name,
      default_tax_rate: 20.0,
      color: category.color || '#1976d2',
    }),
  });
  return {
    id: result.id.toString(),
    name: result.name,
    description: category.description,
    color: result.color || '#1976d2',
    isActive: result.is_active !== false,
    createdAt: new Date(result.created_at),
    updatedAt: new Date(result.updated_at),
  };
}

export async function updateCategory(id: string, category: Partial<Category>): Promise<Category> {
  const body: Record<string, unknown> = {};
  if (category.name !== undefined) body.name = category.name;
  if (category.description !== undefined) body.description = category.description;
  if (category.color !== undefined) body.color = category.color;
  if (category.isActive !== undefined) body.is_active = category.isActive;
  if (Object.keys(body).length === 0) {
    const current = await request<any>(`/categories/${id}`);
    return mapCategory(current);
  }
  const result = await request<any>(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return mapCategory(result, category.description);
}
function mapCategory(raw: any, description?: string): Category {
  return {
    id: raw.id.toString(),
    name: raw.name,
    description: description ?? raw.description ?? '',
    color: raw.color || '#1976d2',
    isActive: raw.is_active !== false,
    createdAt: new Date(raw.created_at),
    updatedAt: new Date(raw.updated_at),
  };
}

export async function deleteCategory(id: string): Promise<{ message: string; action?: string; reason?: string }> {
  return request(`/categories/${id}`, { method: 'DELETE' });
}

export async function restoreCategory(id: string): Promise<void> {
  await request(`/categories/${id}/restore`, { method: 'POST' });
}



