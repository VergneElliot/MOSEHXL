import { PoolClient } from 'pg';
import { Logger } from '../../../utils/logger';
import { AuditTrailModel } from '../../../models/auditTrail';
import { BusinessInfo } from '../../../routes/establishmentAccountCreation/types';

export interface EstablishmentUpdateData {
  establishmentId: string;
  businessInfo: BusinessInfo;
  status: string;
}

export interface UpdatedEstablishment {
  id: string;
  name: string;
  status: string;
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
      // 1. Update establishment status only
      const establishmentResult = await client.query(
        `UPDATE establishments 
         SET 
           business_type = $1,
           status = $2,
           updated_at = NOW()
         WHERE id = $3
         RETURNING id, name, status`,
        [
          businessInfo.businessType,
          status,
          establishmentId
        ]
      );

      if (establishmentResult.rows.length === 0) {
        throw new Error(`Establishment with ID ${establishmentId} not found`);
      }

      // 2. Create or update business_settings for this establishment
      const businessSettingsResult = await client.query(
        `INSERT INTO business_settings (
           name, address, phone, email, siret, tax_identification, establishment_id, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (establishment_id) DO UPDATE SET
           name = EXCLUDED.name,
           address = EXCLUDED.address,
           phone = EXCLUDED.phone,
           email = EXCLUDED.email,
           siret = EXCLUDED.siret,
           tax_identification = EXCLUDED.tax_identification,
           updated_at = NOW()
         RETURNING id, name`,
        [
          businessInfo.companyName,
          businessInfo.address,
          '',  // phone not in BusinessInfo interface
          businessInfo.companyName + '@example.com',  // email not in BusinessInfo interface
          businessInfo.siretNumber,
          businessInfo.taxId,
          establishmentId
        ]
      );

      const establishment = establishmentResult.rows[0];
      const businessSettings = businessSettingsResult.rows[0];
      
      this.logger.info('Establishment updated with business information', { 
        establishmentId: establishment.id,
        businessName: establishment.name,
        status: establishment.status,
        businessSettingsId: businessSettings.id
      });

      // 2. Log audit trail using transaction client to prevent deadlock
      await client.query(
        `INSERT INTO audit_trail (
          user_id, action_type, resource_type, resource_id, 
          action_details, ip_address, user_agent, session_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          'ESTABLISHMENT_BUSINESS_INFO_UPDATED',
          'ESTABLISHMENT',
          establishmentId,
          JSON.stringify({
            establishment_name: establishment.name,
            business_info: businessInfo,
            status: status,
            update_type: 'business_info_completion',
            business_settings_id: businessSettings.id
          }),
          ipAddress,
          userAgent,
          null // session_id
        ]
      );

      this.logger.info('Audit trail logged for establishment business info update', { 
        establishmentId, 
        userId 
      });

      return {
        id: establishment.id,
        name: establishment.name,
        status: establishment.status
      };

    } catch (error) {
      this.logger.error('Failed to update establishment with business information', error as Error);
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
        'SELECT id, status, name FROM establishments WHERE id = $1',
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
        name: establishment.name
      });

      return {
        exists: true,
        status: establishment.status,
        name: establishment.name
      };

    } catch (error) {
      this.logger.error('Failed to get establishment status', error as Error);
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
      this.logger.error('Failed to update establishment status', error as Error);
      throw new Error(`Failed to update establishment status: ${(error as Error).message}`);
    }
  }
}
