import { pool } from '../db/pool';
import { isKnownDocumentCategory } from '../services/admin/documentCategories';

export interface AdminDocument {
  id: number;
  establishment_id: string;
  title: string;
  category: string;
  tags: string[];
  storage_key: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  expires_at: string | null;
  source: 'manual' | 'email';
  uploaded_by: number | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export class AdminDocumentModel {
  static async list(
    establishmentId: string,
    opts: { category?: string; q?: string; includeDeleted?: boolean } = {}
  ): Promise<AdminDocument[]> {
    const conditions = ['establishment_id = $1'];
    const values: unknown[] = [establishmentId];
    if (!opts.includeDeleted) conditions.push('deleted_at IS NULL');
    if (opts.category) {
      values.push(opts.category);
      conditions.push(`category = $${values.length}`);
    }
    if (opts.q) {
      values.push(`%${opts.q}%`);
      conditions.push(`(title ILIKE $${values.length} OR file_name ILIKE $${values.length})`);
    }
    const result = await pool.query(
      `SELECT * FROM admin_documents WHERE ${conditions.join(' AND ')}
       ORDER BY expires_at ASC NULLS LAST, created_at DESC`,
      values
    );
    return result.rows as AdminDocument[];
  }

  static async getById(establishmentId: string, id: number): Promise<AdminDocument | null> {
    const result = await pool.query(
      `SELECT * FROM admin_documents
       WHERE establishment_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [establishmentId, id]
    );
    return (result.rows[0] as AdminDocument) ?? null;
  }

  static async create(input: {
    establishment_id: string;
    title: string;
    category: string;
    tags?: string[];
    storage_key: string;
    file_name: string;
    mime_type: string;
    size_bytes: number;
    expires_at?: string | null;
    source?: 'manual' | 'email';
    uploaded_by?: number | null;
  }): Promise<AdminDocument> {
    const category = isKnownDocumentCategory(input.category) ? input.category : 'autre';
    const result = await pool.query(
      `INSERT INTO admin_documents (
         establishment_id, title, category, tags, storage_key, file_name,
         mime_type, size_bytes, expires_at, source, uploaded_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        input.establishment_id,
        input.title,
        category,
        input.tags ?? [],
        input.storage_key,
        input.file_name,
        input.mime_type,
        input.size_bytes,
        input.expires_at ?? null,
        input.source ?? 'manual',
        input.uploaded_by ?? null,
      ]
    );
    return result.rows[0] as AdminDocument;
  }

  static async updateMetadata(
    establishmentId: string,
    id: number,
    patch: {
      title?: string;
      category?: string;
      tags?: string[];
      expires_at?: string | null;
    }
  ): Promise<AdminDocument | null> {
    const existing = await this.getById(establishmentId, id);
    if (!existing) return null;
    const title = patch.title ?? existing.title;
    const category =
      patch.category != null
        ? isKnownDocumentCategory(patch.category)
          ? patch.category
          : 'autre'
        : existing.category;
    const tags = patch.tags ?? existing.tags;
    const expiresAt = patch.expires_at !== undefined ? patch.expires_at : existing.expires_at;
    const result = await pool.query(
      `UPDATE admin_documents
       SET title = $3, category = $4, tags = $5, expires_at = $6, updated_at = CURRENT_TIMESTAMP
       WHERE establishment_id = $1 AND id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [establishmentId, id, title, category, tags, expiresAt]
    );
    return (result.rows[0] as AdminDocument) ?? null;
  }

  static async softDelete(establishmentId: string, id: number): Promise<boolean> {
    const result = await pool.query(
      `UPDATE admin_documents
       SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE establishment_id = $1 AND id = $2 AND deleted_at IS NULL`,
      [establishmentId, id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
