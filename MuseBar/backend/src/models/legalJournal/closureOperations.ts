/**
 * Closure Operations
 * Daily, weekly, monthly, and annual closure bulletin generation
 */

import { ClosureBulletin, ClosureType } from './types';
import type { DailyClosureMode } from './businessDayPeriod';
import {
  createDailyClosure,
  previewDailyClosure,
  suggestBusinessDayDate,
} from './closureDailyCreate';
import {
  createAnnualClosure,
  createMonthlyClosure,
  createWeeklyClosure,
} from './closurePeriodCreate';
import {
  closeOpenClosureBulletin,
  deleteOpenClosureBulletin,
  getClosureBulletins,
  getClosureBulletinsPaginated,
  setSupersededBy,
  voidClosureBulletin,
} from './closureOperationsRead';

export { __testComputeReconciliation } from './closureOperationsMath';

export class ClosureOperations {
  static async createDailyClosure(
    date: Date,
    establishmentId: string,
    timezone?: string,
    force = false,
    fondDeCaisse?: number,
    closeImmediately = true,
    mode: DailyClosureMode = 'business_day'
  ): Promise<ClosureBulletin> {
    return createDailyClosure(
      date,
      establishmentId,
      timezone,
      force,
      fondDeCaisse,
      closeImmediately,
      mode
    );
  }

  static async suggestBusinessDayDate(establishmentId: string) {
    return suggestBusinessDayDate(establishmentId);
  }

  static async previewDailyClosure(
    date: Date,
    establishmentId: string,
    mode: DailyClosureMode = 'business_day',
    force = false
  ) {
    return previewDailyClosure(date, establishmentId, mode, force);
  }

  static async voidClosureBulletin(
    closureBulletinId: number,
    establishmentId: string,
    reason: string,
    voidedBy: string
  ): Promise<ClosureBulletin | null> {
    return voidClosureBulletin(closureBulletinId, establishmentId, reason, voidedBy);
  }

  static async setSupersededBy(
    voidedBulletinId: number,
    supersedingBulletinId: number,
    establishmentId: string
  ): Promise<void> {
    return setSupersededBy(voidedBulletinId, supersedingBulletinId, establishmentId);
  }

  static async createWeeklyClosure(
    date: Date,
    establishmentId: string,
    force = false,
    fondDeCaisse?: number,
    closeImmediately = true
  ): Promise<ClosureBulletin> {
    return createWeeklyClosure(date, establishmentId, force, fondDeCaisse, closeImmediately);
  }

  static async createMonthlyClosure(
    date: Date,
    establishmentId: string,
    force = false,
    fondDeCaisse?: number,
    closeImmediately = true
  ): Promise<ClosureBulletin> {
    return createMonthlyClosure(date, establishmentId, force, fondDeCaisse, closeImmediately);
  }

  static async createAnnualClosure(
    date: Date,
    establishmentId: string,
    force = false,
    fondDeCaisse?: number,
    closeImmediately = true
  ): Promise<ClosureBulletin> {
    return createAnnualClosure(date, establishmentId, force, fondDeCaisse, closeImmediately);
  }

  static async closeOpenClosureBulletin(
    closureBulletinId: number,
    establishmentId: string
  ): Promise<ClosureBulletin | null> {
    return closeOpenClosureBulletin(closureBulletinId, establishmentId);
  }

  static async deleteOpenClosureBulletin(
    closureBulletinId: number,
    establishmentId: string
  ): Promise<boolean> {
    return deleteOpenClosureBulletin(closureBulletinId, establishmentId);
  }

  static async getClosureBulletins(
    establishmentId: string,
    type?: ClosureType
  ): Promise<ClosureBulletin[]> {
    return getClosureBulletins(establishmentId, type);
  }

  static async getClosureBulletinsPaginated(
    establishmentId: string,
    type?: ClosureType,
    opts?: { limit?: number; offset?: number }
  ): Promise<{ bulletins: ClosureBulletin[]; total: number }> {
    return getClosureBulletinsPaginated(establishmentId, type, opts);
  }
}
