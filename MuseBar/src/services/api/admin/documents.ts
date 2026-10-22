/**
 * Administration space API client — documents (DO Spaces backed).
 */

import { getToken, request } from '../core';
import { apiConfig } from '../../../config/api';

export interface AdminDocumentDto {
  id: number;
  title: string;
  category: string;
  tags: string[];
  file_name: string;
  mime_type: string;
  size_bytes: number;
  expires_at: string | null;
  source: string;
  created_at: string;
}

export async function listDocuments(params?: { category?: string; q?: string }) {
  const qs = new URLSearchParams();
  if (params?.category) qs.set('category', params.category);
  if (params?.q) qs.set('q', params.q);
  const suffix = qs.toString() ? `?${qs}` : '';
  return request<{
    documents: AdminDocumentDto[];
    storageConfigured: boolean;
  }>(`/admin/documents${suffix}`);
}

export async function getDocumentCategories() {
  return request<{ categories: Array<{ id: string; label: string }> }>(
    '/admin/documents/categories'
  );
}

export async function uploadDocument(form: FormData) {
  if (!apiConfig.isReady()) await apiConfig.initialize();
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(apiConfig.getEndpoint('/api/admin/documents'), {
    method: 'POST',
    headers,
    credentials: 'include',
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `Upload failed (${res.status})`);
  }
  return res.json() as Promise<{ document: AdminDocumentDto }>;
}

export async function updateDocument(
  id: number,
  patch: Partial<{ title: string; category: string; tags: string[]; expires_at: string | null }>
) {
  return request<{ document: AdminDocumentDto }>(`/admin/documents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function deleteDocument(id: number) {
  return request<{ success: boolean }>(`/admin/documents/${id}`, { method: 'DELETE' });
}

export async function getDocumentDownloadUrl(id: number) {
  return request<{ url: string; file_name: string }>(`/admin/documents/${id}/download-url`);
}
