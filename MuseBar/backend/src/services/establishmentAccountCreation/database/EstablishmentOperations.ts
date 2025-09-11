import { PoolClient } from 'pg';
import { Logger } from '../../../utils/logger';
import { AuditTrailModel } from '../../../models/auditTrail';
import { BusinessInfo } from '../../routes/establishmentAccountCreation/types';

export interface EstablishmentUpdateData {
  establishmentId: string;
  businessInfo: BusinessInfo;
  status: string;
}

export interface UpdatedEstablishment {
  id: string;
  name: string;
  status: string;
  businessInfo: BusinessInfo;
}

export class EstablishmentOperations {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Update establishment with business information and status
   */
  public async updateEstablishmentWithBusinessInfo(
    client: PoolClient,
    updateData: EstablishmentUpdateData,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UpdatedEstablishment> {
    const { establishmentId, businessInfo, status } = updateData;

    try {
      // 1. Update establishment with business information
      const updateResult = await client.query(
        `UPDATE establishments 
         SET 
           business_name = $1,
           tax_id = $2,
           siret_number = $3,
           address = $4,
           postal_code = $5,
           city = $6,
           country = $7,
           business_type = $8,
           status = $9,
           updated_at = NOW()
         WHERE id = $10
         RETURNING id, business_name, status, tax_id, siret_number, address, postal_code, city, country, business_type`,
        [
          businessInfo.companyName,
          businessInfo.taxId,
          businessInfo.siretNumber,
          businessInfo.address,
          businessInfo.postalCode,
          businessInfo.city,
          businessInfo.country,
          businessInfo.businessType,
          status,
          establishmentId
        ]
      );

      if (updateResult.rows.length === 0) {
        throw new Error(`Establishment with ID ${establishmentId} not found`);
      }

      const establishment = updateResult.rows[0];
      this.logger.info('Establishment updated with business information', { 
        establishmentId: establishment.id,
        businessName: establishment.business_name,
        status: establishment.status
      });

      // 2. Log audit trail
      await AuditTrailModel.logAction({
        user_id: userId,
        action_type: 'ESTABLISHMENT_BUSINESS_INFO_UPDATED',
        resource_type: 'ESTABLISHMENT',
        resource_id: establishmentId,
        action_details: {
          establishment_name: establishment.business_name,
          business_info: businessInfo,
          status: status,
          update_type: 'business_info_completion'
        },
        ip_address: ipAddress,
        user_agent: userAgent
      });

      this.logger.info('Audit trail logged for establishment business info update', { 
        establishmentId, 
        userId 
      });

      return {
        id: establishment.id,
        name: establishment.business_name,
        status: establishment.status,
        businessInfo: {
          companyName: establishment.business_name,
          taxId: establishment.tax_id,
          siretNumber: establishment.siret_number,
          address: establishment.address,
          postalCode: establishment.postal_code,
          city: establishment.city,
          country: establishment.country,
          businessType: establishment.business_type
        }
      };

    } catch (error) {
      this.logger.error('Failed to update establishment with business information', error as Error, { 
        establishmentId, 
        businessInfo 
      });
      throw new Error(`Failed to update establishment: ${(error as Error).message}`);
    }
  }

  /**
   * Validate establishment update data
   */
  public validateEstablishmentUpdateData(updateData: EstablishmentUpdateData): { isValid: boolean; error?: string } {
    const { establishmentId, businessInfo, status } = updateData;

    // Establishment ID validation
    if (!establishmentId || establishmentId.trim() === '') {
      return { isValid: false, error: 'Establishment ID is required' };
    }

    // Status validation
    if (!status || status.trim() === '') {
      return { isValid: false, error: 'Status is required' };
    }

    const validStatuses = ['pending_setup', 'active', 'suspended', 'inactive'];
    if (!validStatuses.includes(status)) {
      return { isValid: false, error: 'Invalid status. Must be one of: pending_setup, active, suspended, inactive' };
    }

    // Business info validation (basic checks)
    if (!businessInfo) {
      return { isValid: false, error: 'Business information is required' };
    }

    if (!businessInfo.companyName || businessInfo.companyName.trim() === '') {
      return { isValid: false, error: 'Company name is required' };
    }

    return { isValid: true };
  }

  /**
   * Check if establishment exists and get current status
   */
  public async getEstablishmentStatus(
    client: PoolClient, 
    establishmentId: string
  ): Promise<{ exists: boolean; status?: string; name?: string }> {
    try {
      const result = await client.query(
        'SELECT id, status, business_name FROM establishments WHERE id = $1',
        [establishmentId]
      );

      if (result.rows.length === 0) {
        this.logger.debug('Establishment not found', { establishmentId });
        return { exists: false };
      }

      const establishment = result.rows[0];
      this.logger.debug('Establishment status retrieved', { 
        establishmentId, 
        status: establishment.status,
        name: establishment.business_name
      });

      return {
        exists: true,
        status: establishment.status,
        name: establishment.business_name
      };

    } catch (error) {
      this.logger.error('Failed to get establishment status', error as Error, { establishmentId });
      throw new Error(`Failed to get establishment status: ${(error as Error).message}`);
    }
  }

  /**
   * Sanitize business information data
   */
  public sanitizeBusinessInfo(businessInfo: BusinessInfo): BusinessInfo {
    return {
      companyName: businessInfo.companyName?.trim() || '',
      taxId: businessInfo.taxId?.trim() || '',
      siretNumber: businessInfo.siretNumber?.trim() || '',
      address: businessInfo.address?.trim() || '',
      postalCode: businessInfo.postalCode?.trim() || '',
      city: businessInfo.city?.trim() || '',
      country: businessInfo.country?.trim() || '',
      businessType: businessInfo.businessType?.trim() || ''
    };
  }

  /**
   * Update establishment status only
   */
  public async updateEstablishmentStatus(
    client: PoolClient,
    establishmentId: string,
    status: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const result = await client.query(
        'UPDATE establishments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
        [status, establishmentId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Establishment with ID ${establishmentId} not found`);
      }

      this.logger.info('Establishment status updated', { establishmentId, status });

      // Log audit trail
      await AuditTrailModel.logAction({
        user_id: userId,
        action_type: 'ESTABLISHMENT_STATUS_UPDATED',
        resource_type: 'ESTABLISHMENT',
        resource_id: establishmentId,
        action_details: {
          new_status: status,
          update_type: 'status_change'
        },
        ip_address: ipAddress,
        user_agent: userAgent
      });

    } catch (error) {
      this.logger.error('Failed to update establishment status', error as Error, { establishmentId, status });
      throw new Error(`Failed to update establishment status: ${(error as Error).message}`);
    }
  }
}
