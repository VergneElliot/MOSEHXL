import express from 'express';
import multer from 'multer';
import { getEstablishmentId, requireAuth, requireEstablishmentAdminOrPermission } from '../auth';
import { P } from '../../permissions/registry';
import { asyncHandler, NotFoundError, ValidationError, AppError } from '../../middleware/errorHandler';
import { AdminDocumentModel } from '../../models/adminDocument';
import { DOCUMENT_CATEGORIES } from '../../services/admin/documentCategories';
import {
  buildEstablishmentObjectKey,
  getPresignedDownloadUrl,
  isObjectStorageConfigured,
  ObjectStorageNotConfiguredError,
  putObject,
} from '../../services/storage/objectStorage';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.use(requireAuth, requireEstablishmentAdminOrPermission(P.access_documents));

router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    return res.json({ categories: DOCUMENT_CATEGORIES });
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const documents = await AdminDocumentModel.list(establishmentId, { category, q });
    return res.json({ documents, storageConfigured: isObjectStorageConfigured() });
  })
);

router.post(
  '/',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    if (!req.file) throw new ValidationError('Fichier requis');
    const title = String(req.body.title || req.file.originalname || 'Document').trim();
    const category = String(req.body.category || 'autre').trim();
    const expiresAt =
      typeof req.body.expires_at === 'string' && req.body.expires_at
        ? req.body.expires_at
        : null;
    const tags =
      typeof req.body.tags === 'string'
        ? req.body.tags.split(/[,;]+/).map((t: string) => t.trim()).filter(Boolean)
        : [];

    try {
      const key = buildEstablishmentObjectKey(establishmentId, 'documents', req.file.originalname);
      await putObject({
        key,
        body: req.file.buffer,
        contentType: req.file.mimetype || 'application/octet-stream',
      });
      const doc = await AdminDocumentModel.create({
        establishment_id: establishmentId,
        title,
        category,
        tags,
        storage_key: key,
        file_name: req.file.originalname,
        mime_type: req.file.mimetype || 'application/octet-stream',
        size_bytes: req.file.size,
        expires_at: expiresAt,
        source: 'manual',
        uploaded_by: req.user?.id ?? null,
      });
      return res.status(201).json({ document: doc });
    } catch (error) {
      if (error instanceof ObjectStorageNotConfiguredError) {
        throw new AppError(error.message, 503, 'OBJECT_STORAGE_NOT_CONFIGURED');
      }
      throw error;
    }
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const id = parseInt(req.params.id ?? '', 10);
    if (!Number.isFinite(id)) throw new ValidationError('Identifiant invalide');
    const updated = await AdminDocumentModel.updateMetadata(establishmentId, id, {
      title: typeof req.body.title === 'string' ? req.body.title : undefined,
      category: typeof req.body.category === 'string' ? req.body.category : undefined,
      tags: Array.isArray(req.body.tags)
        ? req.body.tags.map(String)
        : typeof req.body.tags === 'string'
          ? req.body.tags.split(/[,;]+/).map((t: string) => t.trim()).filter(Boolean)
          : undefined,
      expires_at:
        req.body.expires_at === null
          ? null
          : typeof req.body.expires_at === 'string'
            ? req.body.expires_at || null
            : undefined,
    });
    if (!updated) throw new NotFoundError('Document introuvable');
    return res.json({ document: updated });
  })
);

router.get(
  '/:id/download-url',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const id = parseInt(req.params.id ?? '', 10);
    if (!Number.isFinite(id)) throw new ValidationError('Identifiant invalide');
    const doc = await AdminDocumentModel.getById(establishmentId, id);
    if (!doc) throw new NotFoundError('Document introuvable');
    try {
      const url = await getPresignedDownloadUrl(doc.storage_key, 300);
      return res.json({ url, file_name: doc.file_name, expires_in: 300 });
    } catch (error) {
      if (error instanceof ObjectStorageNotConfiguredError) {
        throw new AppError(error.message, 503, 'OBJECT_STORAGE_NOT_CONFIGURED');
      }
      throw error;
    }
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const establishmentId = getEstablishmentId(req, res);
    if (!establishmentId) return;
    const id = parseInt(req.params.id ?? '', 10);
    if (!Number.isFinite(id)) throw new ValidationError('Identifiant invalide');
    const ok = await AdminDocumentModel.softDelete(establishmentId, id);
    if (!ok) throw new NotFoundError('Document introuvable');
    return res.json({ success: true });
  })
);

export default router;
