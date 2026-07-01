import express from 'express';

import { ProductOptionGroupModel } from '../models/database/productOptionGroupModel';
import { AuditTrailModel } from '../models/auditTrail';
import { getEstablishmentId, requireAuth, requireAnyPermission, requirePermission } from './auth';
import { P } from '../permissions/registry';
import { validateParams, paramValidations } from '../middleware/validation';
import { Logger } from '../utils/logger';
import { AppError, asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler';

const router = express.Router();

const readCatalog = requireAnyPermission([P.access_pos, P.access_menu]);
const menuWrite = requirePermission(P.access_menu);

async function logAuditOrThrow(
  entry: Parameters<typeof AuditTrailModel.logAction>[0],
  context: string
): Promise<void> {
  try {
    await AuditTrailModel.logAction(entry);
  } catch (error) {
    Logger.getInstance().error(
      `Audit trail logging failed (${context})`,
      error as Error,
      'PRODUCT_OPTION_GROUPS_ROUTE'
    );
    throw new AppError('Failed to persist audit trail entry', 500, 'AUDIT_LOG_FAILURE', { context });
  }
}

function parseChoicesInput(value: unknown): Array<{ id?: number; label: string; display_order?: number; is_active?: boolean }> | undefined {
  if (value == null) return undefined;
  if (!Array.isArray(value)) throw new ValidationError('choices must be an array');
  return value.map((choice, index) => {
    if (!choice || typeof choice !== 'object') {
      throw new ValidationError(`choices[${index}] must be an object`);
    }
    const record = choice as Record<string, unknown>;
    const label = typeof record.label === 'string' ? record.label.trim() : '';
    if (!label) throw new ValidationError(`choices[${index}].label is required`);
    if (label.length > 100) throw new ValidationError(`choices[${index}].label is too long`);
    const parsed: { id?: number; label: string; display_order?: number; is_active?: boolean } = { label };
    if (record.id != null) {
      const id = Number(record.id);
      if (!Number.isInteger(id) || id < 1) throw new ValidationError(`choices[${index}].id is invalid`);
      parsed.id = id;
    }
    if (record.display_order != null) parsed.display_order = Number(record.display_order);
    if (record.is_active != null) parsed.is_active = record.is_active === true;
    return parsed;
  });
}

function validateGroupPayload(body: Record<string, unknown>, isCreate: boolean): void {
  if (isCreate) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new ValidationError('Group name is required');
    if (name.length > 100) throw new ValidationError('Group name is too long');
  } else if (body.name != null) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new ValidationError('Group name cannot be empty');
    if (name.length > 100) throw new ValidationError('Group name is too long');
  }

  const isRequired = body.is_required === true;
  const allowFreeText = body.allow_free_text === true;
  const choices = parseChoicesInput(body.choices) ?? [];

  if (isCreate && isRequired && !allowFreeText && choices.length === 0) {
    throw new ValidationError('A required preset-only group must include at least one choice');
  }

  if (body.free_text_max_length != null) {
    const maxLength = Number(body.free_text_max_length);
    if (!Number.isInteger(maxLength) || maxLength < 1 || maxLength > 500) {
      throw new ValidationError('free_text_max_length must be between 1 and 500');
    }
  }

  if (body.free_text_label != null && typeof body.free_text_label === 'string' && body.free_text_label.length > 100) {
    throw new ValidationError('free_text_label is too long');
  }
}

router.use(requireAuth);

router.get('/', readCatalog, asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  const groups = await ProductOptionGroupModel.getAllActive(establishmentId);
  res.json(groups);
}));

router.get('/:id', readCatalog, validateParams([paramValidations.id]), asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  const id = parseInt(req.params.id ?? '', 10);
  const group = await ProductOptionGroupModel.getById(id, establishmentId);
  if (!group) throw new NotFoundError('Product option group');
  res.json(group);
}));

router.post('/', menuWrite, asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  validateGroupPayload(req.body, true);
  const choices = parseChoicesInput(req.body.choices);
  const group = await ProductOptionGroupModel.create(
    {
      name: String(req.body.name).trim(),
      is_required: req.body.is_required === true,
      allow_free_text: req.body.allow_free_text === true,
      free_text_label: typeof req.body.free_text_label === 'string' ? req.body.free_text_label : null,
      free_text_max_length:
        req.body.free_text_max_length != null ? Number(req.body.free_text_max_length) : undefined,
      display_order: req.body.display_order != null ? Number(req.body.display_order) : undefined,
      choices: choices?.map((choice) => ({ label: choice.label, display_order: choice.display_order })),
    },
    establishmentId
  );
  await logAuditOrThrow({
    user_id: String(req.user!.id),
    action_type: 'CREATE_PRODUCT_OPTION_GROUP',
    resource_type: 'PRODUCT_OPTION_GROUP',
    resource_id: String(group.id),
    action_details: { name: group.name, establishmentId },
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'CREATE_PRODUCT_OPTION_GROUP');
  res.status(201).json(group);
}));

router.put('/:id', menuWrite, validateParams([paramValidations.id]), asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  validateGroupPayload(req.body, false);
  const id = parseInt(req.params.id ?? '', 10);
  const choices = parseChoicesInput(req.body.choices);
  const group = await ProductOptionGroupModel.update(
    id,
    {
      name: req.body.name != null ? String(req.body.name).trim() : undefined,
      is_required: req.body.is_required != null ? req.body.is_required === true : undefined,
      allow_free_text: req.body.allow_free_text != null ? req.body.allow_free_text === true : undefined,
      free_text_label:
        req.body.free_text_label !== undefined
          ? (typeof req.body.free_text_label === 'string' ? req.body.free_text_label : null)
          : undefined,
      free_text_max_length:
        req.body.free_text_max_length != null ? Number(req.body.free_text_max_length) : undefined,
      display_order: req.body.display_order != null ? Number(req.body.display_order) : undefined,
      is_active: req.body.is_active != null ? req.body.is_active === true : undefined,
      choices,
    },
    establishmentId
  );
  if (!group) throw new NotFoundError('Product option group');
  await logAuditOrThrow({
    user_id: String(req.user!.id),
    action_type: 'UPDATE_PRODUCT_OPTION_GROUP',
    resource_type: 'PRODUCT_OPTION_GROUP',
    resource_id: String(id),
    action_details: req.body,
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'UPDATE_PRODUCT_OPTION_GROUP');
  res.json(group);
}));

router.delete('/:id', menuWrite, validateParams([paramValidations.id]), asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  const id = parseInt(req.params.id ?? '', 10);
  const result = await ProductOptionGroupModel.delete(id, establishmentId);
  if (!result.deleted) throw new NotFoundError('Product option group');
  await logAuditOrThrow({
    user_id: String(req.user!.id),
    action_type: result.action === 'hard' ? 'DELETE_PRODUCT_OPTION_GROUP' : 'ARCHIVE_PRODUCT_OPTION_GROUP',
    resource_type: 'PRODUCT_OPTION_GROUP',
    resource_id: String(id),
    action_details: { deletion_type: result.action },
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'DELETE_PRODUCT_OPTION_GROUP');
  res.json({
    message:
      result.action === 'soft'
        ? 'Paramètre archivé (encore assigné à des produits)'
        : 'Paramètre supprimé définitivement',
    action: result.action,
  });
}));

export default router;
