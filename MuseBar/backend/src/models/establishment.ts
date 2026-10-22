/**
 * Establishment Model
 *
 * Phase B1 (2026-04): The app commits to **shared-table multi-tenancy**.
 * `establishments.schema_name` is legacy metadata and is not used for runtime isolation.
 */

import type { Logger } from '../utils/logger';
import { initializeEstablishmentLogger } from './establishmentLog';
import {
  getAllEstablishments,
  getEstablishmentByEmail,
  getEstablishmentById,
  getEstablishmentStats,
  getSchemaNameForEstablishment,
} from './establishmentReadModel';
import { createEstablishment, updateEstablishment } from './establishmentWriteModel';
import { deleteEstablishment } from './establishmentDelete';
import { validateEstablishmentData } from './establishmentTypes';

export type {
  CreateEstablishmentData,
  Establishment,
  UpdateEstablishmentData,
} from './establishmentTypes';

export class EstablishmentModel {
  public static initialize(logger: Logger): void {
    initializeEstablishmentLogger(logger);
  }

  public static createEstablishment = createEstablishment;
  public static getSchemaNameForEstablishment = getSchemaNameForEstablishment;
  public static getById = getEstablishmentById;
  public static getByEmail = getEstablishmentByEmail;
  public static getAllEstablishments = getAllEstablishments;
  public static updateEstablishment = updateEstablishment;
  public static deleteEstablishment = deleteEstablishment;
  public static getEstablishmentStats = getEstablishmentStats;
  public static validateEstablishmentData = validateEstablishmentData;
}
