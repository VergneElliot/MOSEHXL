import express from 'express';

import { pool } from '../db/pool';
import {
  KitchenPrinterModel,
  slugifyKitchenPrinterName,
  type KitchenPrinterConnectionType,
} from '../models/database/kitchenPrinterModel';
import { AuditTrailModel } from '../models/auditTrail';
import { getEstablishmentId, requireAuth, requireAnyPermission, requirePermission } from './auth';
import { P } from '../permissions/registry';
import { validateParams, paramValidations } from '../middleware/validation';
import { Logger } from '../utils/logger';
import { AppError, asyncHandler, NotFoundError, ValidationError } from '../middleware/errorHandler';
import { enqueueKitchenPrinterTestPrint } from '../services/kitchenPrinting/kitchenPrinterTestPrintService';

const router = express.Router();

const readCatalog = requireAnyPermission([P.access_pos, P.access_menu]);
const menuWrite = requirePermission(P.access_menu);

const SLUG_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;

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
      'KITCHEN_PRINTERS_ROUTE'
    );
    throw new AppError('Failed to persist audit trail entry', 500, 'AUDIT_LOG_FAILURE', { context });
  }
}

function parseConnectionType(value: unknown): KitchenPrinterConnectionType {
  if (value === 'bridge' || value === 'network_escpos') return value;
  throw new ValidationError('connection_type must be bridge or network_escpos');
}

function parseConnectionConfig(
  connectionType: KitchenPrinterConnectionType,
  value: unknown
): Record<string, unknown> {
  if (value == null) return connectionType === 'bridge' ? { bridgeTarget: '' } : { host: '', port: 9100 };
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError('connection_config must be an object');
  }
  const config = value as Record<string, unknown>;

  if (connectionType === 'network_escpos') {
    const host = typeof config.host === 'string' ? config.host.trim() : '';
    if (!host) throw new ValidationError('connection_config.host is required for network_escpos');
    const port = config.port != null ? Number(config.port) : 9100;
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new ValidationError('connection_config.port must be between 1 and 65535');
    }
    return { host, port };
  }

  const bridgeTarget =
    typeof config.bridgeTarget === 'string' && config.bridgeTarget.trim()
      ? config.bridgeTarget.trim()
      : '';
  return { bridgeTarget };
}

function validatePrinterPayload(body: Record<string, unknown>, isCreate: boolean): {
  name?: string;
  slug?: string;
  connection_type: KitchenPrinterConnectionType;
  connection_config: Record<string, unknown>;
  display_order?: number;
} {
  const connection_type = parseConnectionType(body.connection_type ?? 'bridge');

  if (isCreate) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new ValidationError('Printer name is required');
    if (name.length > 100) throw new ValidationError('Printer name is too long');
    const slugInput =
      typeof body.slug === 'string' && body.slug.trim()
        ? body.slug.trim().toLowerCase()
        : slugifyKitchenPrinterName(name);
    if (!SLUG_PATTERN.test(slugInput)) {
      throw new ValidationError('slug must be lowercase letters, digits, or underscores');
    }
    const connection_config = parseConnectionConfig(connection_type, body.connection_config);
    if (connection_type === 'bridge' && !connection_config.bridgeTarget) {
      connection_config.bridgeTarget = slugInput;
    }
    return {
      name,
      slug: slugInput,
      connection_type,
      connection_config,
      display_order: body.display_order != null ? Number(body.display_order) : undefined,
    };
  }

  const parsed: {
    name?: string;
    slug?: string;
    connection_type: KitchenPrinterConnectionType;
    connection_config: Record<string, unknown>;
    display_order?: number;
  } = {
    connection_type,
    connection_config: parseConnectionConfig(connection_type, body.connection_config ?? {}),
  };

  if (body.name != null) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new ValidationError('Printer name cannot be empty');
    if (name.length > 100) throw new ValidationError('Printer name is too long');
    parsed.name = name;
  }
  if (body.slug != null) {
    const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
    if (!SLUG_PATTERN.test(slug)) {
      throw new ValidationError('slug must be lowercase letters, digits, or underscores');
    }
    parsed.slug = slug;
  }
  if (body.display_order != null) parsed.display_order = Number(body.display_order);
  return parsed;
}

router.use(requireAuth);

router.get('/', readCatalog, asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  const printers = await KitchenPrinterModel.getAllActive(establishmentId);
  res.json(printers);
}));

router.get('/:id', readCatalog, validateParams([paramValidations.id]), asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  const id = parseInt(req.params.id ?? '', 10);
  const printer = await KitchenPrinterModel.getById(id, establishmentId);
  if (!printer) throw new NotFoundError('Kitchen printer');
  res.json(printer);
}));

router.post('/', menuWrite, asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  const payload = validatePrinterPayload(req.body, true);
  const printer = await KitchenPrinterModel.create(
    {
      name: payload.name!,
      slug: payload.slug,
      connection_type: payload.connection_type,
      connection_config: payload.connection_config,
      display_order: payload.display_order,
    },
    establishmentId
  );
  await logAuditOrThrow({
    user_id: String(req.user!.id),
    action_type: 'CREATE_KITCHEN_PRINTER',
    resource_type: 'KITCHEN_PRINTER',
    resource_id: String(printer.id),
    action_details: { name: printer.name, slug: printer.slug, establishmentId },
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'CREATE_KITCHEN_PRINTER');
  res.status(201).json(printer);
}));

router.put('/:id', menuWrite, validateParams([paramValidations.id]), asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  const id = parseInt(req.params.id ?? '', 10);
  const existing = await KitchenPrinterModel.getById(id, establishmentId);
  if (!existing) throw new NotFoundError('Kitchen printer');

  const connection_type =
    req.body.connection_type != null
      ? parseConnectionType(req.body.connection_type)
      : existing.connection_type;
  const updateInput: Parameters<typeof KitchenPrinterModel.update>[1] = {};

  if (req.body.name != null) {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name) throw new ValidationError('Printer name cannot be empty');
    if (name.length > 100) throw new ValidationError('Printer name is too long');
    updateInput.name = name;
  }
  if (req.body.slug != null) {
    const slug = typeof req.body.slug === 'string' ? req.body.slug.trim().toLowerCase() : '';
    if (!SLUG_PATTERN.test(slug)) {
      throw new ValidationError('slug must be lowercase letters, digits, or underscores');
    }
    updateInput.slug = slug;
  }
  if (req.body.connection_type != null) updateInput.connection_type = connection_type;
  if (req.body.connection_config != null) {
    updateInput.connection_config = parseConnectionConfig(connection_type, req.body.connection_config);
  }
  if (req.body.display_order != null) updateInput.display_order = Number(req.body.display_order);
  if (req.body.is_active != null) updateInput.is_active = req.body.is_active === true;

  const printer = await KitchenPrinterModel.update(id, updateInput, establishmentId);
  if (!printer) throw new NotFoundError('Kitchen printer');
  await logAuditOrThrow({
    user_id: String(req.user!.id),
    action_type: 'UPDATE_KITCHEN_PRINTER',
    resource_type: 'KITCHEN_PRINTER',
    resource_id: String(id),
    action_details: req.body,
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'UPDATE_KITCHEN_PRINTER');
  res.json(printer);
}));

router.delete('/:id', menuWrite, validateParams([paramValidations.id]), asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  const id = parseInt(req.params.id ?? '', 10);
  const result = await KitchenPrinterModel.delete(id, establishmentId);
  if (!result.deleted) throw new NotFoundError('Kitchen printer');
  await logAuditOrThrow({
    user_id: String(req.user!.id),
    action_type: result.action === 'hard' ? 'DELETE_KITCHEN_PRINTER' : 'ARCHIVE_KITCHEN_PRINTER',
    resource_type: 'KITCHEN_PRINTER',
    resource_id: String(id),
    action_details: { deletion_type: result.action },
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  }, 'DELETE_KITCHEN_PRINTER');
  res.json({
    message:
      result.action === 'soft'
        ? 'Imprimante archivée (encore assignée à des produits)'
        : 'Imprimante supprimée définitivement',
    action: result.action,
  });
}));

router.post('/:id/test-print', menuWrite, validateParams([paramValidations.id]), asyncHandler(async (req, res) => {
  const establishmentId = getEstablishmentId(req, res);
  if (!establishmentId) return;
  const id = parseInt(req.params.id ?? '', 10);
  const printer = await KitchenPrinterModel.getById(id, establishmentId);
  if (!printer) throw new NotFoundError('Kitchen printer');
  const { jobId } = await enqueueKitchenPrinterTestPrint(pool, establishmentId, printer, req.user?.id);
  res.status(202).json({
    message: 'Test kitchen ticket queued',
    job_id: jobId,
    kitchen_printer_id: printer.id,
    kitchen_printer_slug: printer.slug,
  });
}));

export default router;
