import { SmartContract } from './ISmartContract';
import { Level } from 'level';
import { UserRole } from '../enum';

/**
 * Certification data structure
 */
interface CertificationData {
  certificationId: string;
  name: string;
  description?: string;
  issuer: {
    id: string;
    name: string;
    role: UserRole;
  };
  issuedTo: {
    id: string;
    type: EntityType;
    name?: string;
  };
  issuedDate: number;
  expiryDate?: number;
  status: CertificationStatus;
  type: CertificationType;
  standards?: string[];
  metadata?: Record<string, any>;
  verificationHash?: string;
  verificationUrl?: string;
  documents?: CertificationDocument[];
}

/**
 * Document attachment for certification
 */
interface CertificationDocument {
  documentId: string;
  name: string;
  description?: string;
  fileType: string;
  fileHash: string;
  fileUrl?: string;
  uploadDate: number;
  uploadedBy: string;
}

/**
 * Certification verification result
 */
interface VerificationResult {
  valid: boolean;
  certificationId?: string;
  message?: string;
  issuedDate?: number;
  expiryDate?: number;
  issuer?: {
    id: string;
    name: string;
  };
  details?: Record<string, any>;
}

/**
 * Operation result
 */
interface CertificationResult {
  success: boolean;
  message?: string;
  certificationId?: string;
  documentId?: string;
  data?: CertificationData | CertificationDocument;
}

/**
 * Entity type enum
 */
enum EntityType {
  PRODUCT = 'PRODUCT',
  BATCH = 'BATCH',
  FARM = 'FARM',
  PRODUCER = 'PRODUCER',
  PROCESSOR = 'PROCESSOR',
  DISTRIBUTOR = 'DISTRIBUTOR',
  RETAILER = 'RETAILER'
}

/**
 * Certification status enum
 */
enum CertificationStatus {
  ISSUED = 'ISSUED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  SUSPENDED = 'SUSPENDED'
}

/**
 * Certification type enum
 */
enum CertificationType {
  ORGANIC = 'ORGANIC',
  FAIR_TRADE = 'FAIR_TRADE',
  NON_GMO = 'NON_GMO',
  SUSTAINABLE = 'SUSTAINABLE',
  QUALITY = 'QUALITY',
  SAFETY = 'SAFETY',
  ORIGIN = 'ORIGIN',
  RELIGIOUS = 'RELIGIOUS',
  ETHICAL = 'ETHICAL',
  CUSTOM = 'CUSTOM'
}

/**
 * Smart contract for managing digital certifications and verification
 * Provides a secure way to issue, verify, and manage certifications in the supply chain
 */
export class DigitalCertificationContract extends SmartContract {
  constructor(stateDB: Level<string, string>) {
    super(
      'certification-v1',
      'DigitalCertification',
      '1.0.0',
      stateDB
    );
  }

  /**
   * Initialize the contract
   */
  public async initialize(): Promise<boolean> {
    // Initialize approved issuers if needed
    return true;
  }

  /**
   * Execute a contract method
   * @param method Method to execute
   * @param params Method parameters
   * @param sender Identity of the caller
   */
  public async execute(method: string, params: any, sender: string): Promise<CertificationResult> {
    // Verify the sender is authorized to call this method
    const authorized = await this.verifySender(sender, method);
    if (!authorized) {
      return {
        success: false,
        message: `Unauthorized: User ${sender} cannot execute method ${method}`
      };
    }
    
    switch (method) {
      case 'issueCertification':
        return this.issueCertification(
          params.name,
          params.issuerId,
          params.issuerName,
          params.issuerRole,
          params.entityId,
          params.entityType,
          params.entityName,
          params.expiryDate,
          params.type,
          params.description,
          params.standards,
          params.metadata,
          params.verificationUrl
        );
      
      case 'revokeCertification':
        return this.revokeCertification(
          params.certificationId,
          params.reason
        );
      
      case 'renewCertification':
        return this.renewCertification(
          params.certificationId,
          params.newExpiryDate
        );
      
      case 'suspendCertification':
        return this.suspendCertification(
          params.certificationId,
          params.reason
        );
      
      case 'addCertificationDocument':
        return this.addCertificationDocument(
          params.certificationId,
          params.name,
          params.fileType,
          params.fileHash,
          params.uploadedBy,
          params.description,
          params.fileUrl
        );
      
      case 'removeCertificationDocument':
        return this.removeCertificationDocument(
          params.certificationId,
          params.documentId
        );
      
      case 'updateCertificationMetadata':
        return this.updateCertificationMetadata(
          params.certificationId,
          params.metadata
        );
      
      default:
        return {
          success: false,
          message: `Method ${method} not found in DigitalCertificationContract`
        };
    }
  }

  /**
   * Query contract state
   * @param method Method to query
   * @param params Method parameters
   */
  public async query(method: string, params: any): Promise<any> {
    switch (method) {
      case 'getCertification':
        return this.getCertification(params.certificationId);
      
      case 'verifyCertification':
        return this.verifyCertification(params.certificationId);
      
      case 'getEntityCertifications':
        return this.getEntityCertifications(params.entityId, params.entityType);
      
      case 'getIssuerCertifications':
        return this.getIssuerCertifications(params.issuerId);
      
      case 'getCertificationsByType':
        return this.getCertificationsByType(params.type);
      
      case 'getCertificationsByStatus':
        return this.getCertificationsByStatus(params.status);
      
      case 'getCertificationDocument':
        return this.getCertificationDocument(params.certificationId, params.documentId);
      
      default:
        throw new Error(`Query method ${method} not found in DigitalCertificationContract`);
    }
  }

  /**
   * Get contract's state schema
   */
  public getStateSchema(): Record<string, any> {
    return {
      certifications: 'Map<string, CertificationData>',
      entityCertifications: 'Map<string, string[]>',
      issuerCertifications: 'Map<string, string[]>',
      typeCertifications: 'Map<string, string[]>',
      statusCertifications: 'Map<string, string[]>'
    };
  }

  /**
   * Issue a new certification
   */
  private async issueCertification(
    name: string,
    issuerId: string,
    issuerName: string,
    issuerRole: UserRole,
    entityId: string,
    entityType: EntityType,
    entityName: string,
    expiryDate: number,
    type: CertificationType,
    description?: string,
    standards?: string[],
    metadata?: Record<string, any>,
    verificationUrl?: string
  ): Promise<CertificationResult> {
    // Generate a unique certification ID
    const certificationId = `cert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Create verification hash (could be improved with actual hash algorithms)
    const verificationData = {
      name,
      issuerId,
      entityId,
      type,
      issuedDate: Date.now(),
      expiryDate
    };
    const verificationHash = this.generateVerificationHash(verificationData);
    
    // Create certification data
    const certification: CertificationData = {
      certificationId,
      name,
      description,
      issuer: {
        id: issuerId,
        name: issuerName,
        role: issuerRole
      },
      issuedTo: {
        id: entityId,
        type: entityType,
        name: entityName
      },
      issuedDate: Date.now(),
      expiryDate,
      status: CertificationStatus.ISSUED,
      type,
      standards,
      metadata,
      verificationHash,
      verificationUrl,
      documents: []
    };
    
    // Save certification to state
    await this.writeState<CertificationData>(`certification:${certificationId}`, certification);
    
    // Update indexes
    await this.updateEntityCertificationsIndex(entityId, entityType, certificationId);
    await this.updateIssuerCertificationsIndex(issuerId, certificationId);
    await this.updateTypeCertificationsIndex(type, certificationId);
    await this.updateStatusCertificationsIndex(CertificationStatus.ISSUED, certificationId);
    
    // Emit certification issued event
    await this.emitEvent('CertificationIssued', { 
      certificationId, 
      name, 
      type, 
      issuerId, 
      entityId, 
      entityType 
    });
    
    return {
      success: true,
      certificationId,
      message: 'Certification issued successfully',
      data: certification
    };
  }

  /**
   * Revoke a certification
   */
  private async revokeCertification(
    certificationId: string,
    reason?: string
  ): Promise<CertificationResult> {
    // Get certification data
    const certification = await this.getCertification(certificationId);
    
    if (!certification) {
      return {
        success: false,
        message: `Certification with ID ${certificationId} not found`
      };
    }
    
    // Can only revoke certifications that are not already revoked
    if (certification.status === CertificationStatus.REVOKED) {
      return {
        success: false,
        message: `Certification ${certificationId} is already revoked`
      };
    }
    
    // Remove from old status index
    await this.removeFromStatusCertificationsIndex(certification.status, certificationId);
    
    // Update certification status
    const oldStatus = certification.status;
    certification.status = CertificationStatus.REVOKED;
    
    // Add reason to metadata if provided
    if (reason) {
      if (!certification.metadata) {
        certification.metadata = {};
      }
      certification.metadata.revocationReason = reason;
      certification.metadata.revocationDate = Date.now();
    }
    
    // Save updated certification
    await this.writeState<CertificationData>(`certification:${certificationId}`, certification);
    
    // Update status index
    await this.updateStatusCertificationsIndex(CertificationStatus.REVOKED, certificationId);
    
    // Emit certification revoked event
    await this.emitEvent('CertificationRevoked', { 
      certificationId, 
      oldStatus, 
      reason 
    });
    
    return {
      success: true,
      certificationId,
      message: 'Certification revoked successfully',
      data: certification
    };
  }

  /**
   * Renew a certification by extending its expiry date
   */
  private async renewCertification(
    certificationId: string,
    newExpiryDate: number
  ): Promise<CertificationResult> {
    // Get certification data
    const certification = await this.getCertification(certificationId);
    
    if (!certification) {
      return {
        success: false,
        message: `Certification with ID ${certificationId} not found`
      };
    }
    
    // Cannot renew revoked certifications
    if (certification.status === CertificationStatus.REVOKED) {
      return {
        success: false,
        message: `Cannot renew revoked certification ${certificationId}`
      };
    }
    
    // Validate new expiry date
    if (newExpiryDate <= Date.now()) {
      return {
        success: false,
        message: `New expiry date must be in the future`
      };
    }
    
    // Remove from old status index if status is changing
    if (certification.status === CertificationStatus.EXPIRED) {
      await this.removeFromStatusCertificationsIndex(certification.status, certificationId);
    }
    
    // Update certification expiry date and status
    const oldExpiryDate = certification.expiryDate;
    const oldStatus = certification.status;
    certification.expiryDate = newExpiryDate;
    
    // If was expired, set back to issued
    if (certification.status === CertificationStatus.EXPIRED) {
      certification.status = CertificationStatus.ISSUED;
      await this.updateStatusCertificationsIndex(CertificationStatus.ISSUED, certificationId);
    }
    
    // Add renewal info to metadata
    if (!certification.metadata) {
      certification.metadata = {};
    }
    if (!certification.metadata.renewalHistory) {
      certification.metadata.renewalHistory = [];
    }
    certification.metadata.renewalHistory.push({
      renewalDate: Date.now(),
      previousExpiryDate: oldExpiryDate,
      newExpiryDate
    });
    
    // Save updated certification
    await this.writeState<CertificationData>(`certification:${certificationId}`, certification);
    
    // Emit certification renewed event
    await this.emitEvent('CertificationRenewed', { 
      certificationId, 
      oldExpiryDate, 
      newExpiryDate, 
      oldStatus,
      newStatus: certification.status
    });
    
    return {
      success: true,
      certificationId,
      message: 'Certification renewed successfully',
      data: certification
    };
  }

  /**
   * Suspend a certification temporarily
   */
  private async suspendCertification(
    certificationId: string,
    reason?: string
  ): Promise<CertificationResult> {
    // Get certification data
    const certification = await this.getCertification(certificationId);
    
    if (!certification) {
      return {
        success: false,
        message: `Certification with ID ${certificationId} not found`
      };
    }
    
    // Cannot suspend revoked or already suspended certifications
    if (certification.status === CertificationStatus.REVOKED) {
      return {
        success: false,
        message: `Cannot suspend revoked certification ${certificationId}`
      };
    }
    
    if (certification.status === CertificationStatus.SUSPENDED) {
      return {
        success: false,
        message: `Certification ${certificationId} is already suspended`
      };
    }
    
    // Remove from old status index
    await this.removeFromStatusCertificationsIndex(certification.status, certificationId);
    
    // Update certification status
    const oldStatus = certification.status;
    certification.status = CertificationStatus.SUSPENDED;
    
    // Add reason to metadata if provided
    if (reason) {
      if (!certification.metadata) {
        certification.metadata = {};
      }
      certification.metadata.suspensionReason = reason;
      certification.metadata.suspensionDate = Date.now();
    }
    
    // Save updated certification
    await this.writeState<CertificationData>(`certification:${certificationId}`, certification);
    
    // Update status index
    await this.updateStatusCertificationsIndex(CertificationStatus.SUSPENDED, certificationId);
    
    // Emit certification suspended event
    await this.emitEvent('CertificationSuspended', { 
      certificationId, 
      oldStatus, 
      reason 
    });
    
    return {
      success: true,
      certificationId,
      message: 'Certification suspended successfully',
      data: certification
    };
  }

  /**
   * Add a document to a certification
   */
  private async addCertificationDocument(
    certificationId: string,
    name: string,
    fileType: string,
    fileHash: string,
    uploadedBy: string,
    description?: string,
    fileUrl?: string
  ): Promise<CertificationResult> {
    // Get certification data
    const certification = await this.getCertification(certificationId);
    
    if (!certification) {
      return {
        success: false,
        message: `Certification with ID ${certificationId} not found`
      };
    }
    
    // Generate a unique document ID
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Create document data
    const document: CertificationDocument = {
      documentId,
      name,
      description,
      fileType,
      fileHash,
      fileUrl,
      uploadDate: Date.now(),
      uploadedBy
    };
    
    // Add document to certification
    if (!certification.documents) {
      certification.documents = [];
    }
    certification.documents.push(document);
    
    // Save updated certification
    await this.writeState<CertificationData>(`certification:${certificationId}`, certification);
    
    // Emit document added event
    await this.emitEvent('CertificationDocumentAdded', { 
      certificationId, 
      documentId, 
      name, 
      uploadedBy 
    });
    
    return {
      success: true,
      certificationId,
      documentId,
      message: 'Document added to certification successfully',
      data: document
    };
  }

  /**
   * Remove a document from a certification
   */
  private async removeCertificationDocument(
    certificationId: string,
    documentId: string
  ): Promise<CertificationResult> {
    // Get certification data
    const certification = await this.getCertification(certificationId);
    
    if (!certification) {
      return {
        success: false,
        message: `Certification with ID ${certificationId} not found`
      };
    }
    
    // Check if certification has documents
    if (!certification.documents || certification.documents.length === 0) {
      return {
        success: false,
        message: `Certification ${certificationId} has no documents`
      };
    }
    
    // Find the document to remove
    const documentIndex = certification.documents.findIndex(doc => doc.documentId === documentId);
    
    if (documentIndex === -1) {
      return {
        success: false,
        message: `Document with ID ${documentId} not found in certification ${certificationId}`
      };
    }
    
    // Remove document
    const removedDocument = certification.documents[documentIndex];
    certification.documents.splice(documentIndex, 1);
    
    // Save updated certification
    await this.writeState<CertificationData>(`certification:${certificationId}`, certification);
    
    // Emit document removed event
    await this.emitEvent('CertificationDocumentRemoved', { 
      certificationId, 
      documentId 
    });
    
    return {
      success: true,
      certificationId,
      documentId,
      message: 'Document removed from certification successfully',
      data: removedDocument
    };
  }

  /**
   * Update certification metadata
   */
  private async updateCertificationMetadata(
    certificationId: string,
    metadata: Record<string, any>
  ): Promise<CertificationResult> {
    // Get certification data
    const certification = await this.getCertification(certificationId);
    
    if (!certification) {
      return {
        success: false,
        message: `Certification with ID ${certificationId} not found`
      };
    }
    
    // Update metadata
    certification.metadata = {
      ...certification.metadata,
      ...metadata,
      lastUpdated: Date.now()
    };
    
    // Save updated certification
    await this.writeState<CertificationData>(`certification:${certificationId}`, certification);
    
    // Emit metadata updated event
    await this.emitEvent('CertificationMetadataUpdated', { 
      certificationId
    });
    
    return {
      success: true,
      certificationId,
      message: 'Certification metadata updated successfully',
      data: certification
    };
  }

  /**
   * Get certification by ID
   */
  private async getCertification(certificationId: string): Promise<CertificationData | null> {
    return this.readState<CertificationData>(`certification:${certificationId}`);
  }

  /**
   * Verify a certification's validity
   */
  private async verifyCertification(certificationId: string): Promise<VerificationResult> {
    // Get certification data
    const certification = await this.getCertification(certificationId);
    
    if (!certification) {
      return {
        valid: false,
        message: `Certification with ID ${certificationId} not found`
      };
    }
    
    // Check if certification is expired
    const now = Date.now();
    const isExpired = certification.expiryDate && certification.expiryDate < now;
    
    // Check certification status
    const isValid = certification.status === CertificationStatus.ISSUED && !isExpired;
    
    // Prepare verification result
    const result: VerificationResult = {
      valid: isValid,
      certificationId,
      issuedDate: certification.issuedDate,
      expiryDate: certification.expiryDate,
      issuer: {
        id: certification.issuer.id,
        name: certification.issuer.name
      },
      details: {
        name: certification.name,
        type: certification.type,
        status: certification.status,
        entity: {
          id: certification.issuedTo.id,
          type: certification.issuedTo.type,
          name: certification.issuedTo.name
        }
      }
    };
    
    // Add reason if not valid
    if (!isValid) {
      if (isExpired) {
        result.message = 'Certification is expired';
      } else if (certification.status === CertificationStatus.REVOKED) {
        result.message = 'Certification has been revoked';
        if (certification.metadata?.revocationReason) {
          result.details!.revocationReason = certification.metadata.revocationReason;
        }
      } else if (certification.status === CertificationStatus.SUSPENDED) {
        result.message = 'Certification is currently suspended';
        if (certification.metadata?.suspensionReason) {
          result.details!.suspensionReason = certification.metadata.suspensionReason;
        }
      }
    }
    
    return result;
  }

  /**
   * Get all certifications for an entity
   */
  private async getEntityCertifications(entityId: string, entityType: EntityType): Promise<CertificationData[]> {
    const entityKey = `${entityId}:${entityType}`;
    const certificationIds = await this.readState<string[]>(`entity_certifications:${entityKey}`) || [];
    const certifications: CertificationData[] = [];
    
    for (const certificationId of certificationIds) {
      const certification = await this.getCertification(certificationId);
      if (certification) {
        certifications.push(certification);
      }
    }
    
    return certifications;
  }

  /**
   * Get all certifications issued by an issuer
   */
  private async getIssuerCertifications(issuerId: string): Promise<CertificationData[]> {
    const certificationIds = await this.readState<string[]>(`issuer_certifications:${issuerId}`) || [];
    const certifications: CertificationData[] = [];
    
    for (const certificationId of certificationIds) {
      const certification = await this.getCertification(certificationId);
      if (certification) {
        certifications.push(certification);
      }
    }
    
    return certifications;
  }

  /**
   * Get certifications by type
   */
  private async getCertificationsByType(type: CertificationType): Promise<CertificationData[]> {
    const certificationIds = await this.readState<string[]>(`type_certifications:${type}`) || [];
    const certifications: CertificationData[] = [];
    
    for (const certificationId of certificationIds) {
      const certification = await this.getCertification(certificationId);
      if (certification) {
        certifications.push(certification);
      }
    }
    
    return certifications;
  }

  /**
   * Get certifications by status
   */
  private async getCertificationsByStatus(status: CertificationStatus): Promise<CertificationData[]> {
    const certificationIds = await this.readState<string[]>(`status_certifications:${status}`) || [];
    const certifications: CertificationData[] = [];
    
    for (const certificationId of certificationIds) {
      const certification = await this.getCertification(certificationId);
      if (certification) {
        certifications.push(certification);
      }
    }
    
    return certifications;
  }

  /**
   * Get a specific document from a certification
   */
  private async getCertificationDocument(certificationId: string, documentId: string): Promise<CertificationDocument | null> {
    const certification = await this.getCertification(certificationId);
    
    if (!certification || !certification.documents) {
      return null;
    }
    
    return certification.documents.find(doc => doc.documentId === documentId) || null;
  }

  /**
   * Helper: Generate verification hash for a certification
   */
  private generateVerificationHash(data: any): string {
    // In a real implementation, this would use a proper cryptographic hash function
    // For simplicity, we're just using a basic approach here
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * Helper: Update entity certifications index
   */
  private async updateEntityCertificationsIndex(entityId: string, entityType: EntityType, certificationId: string): Promise<void> {
    const entityKey = `${entityId}:${entityType}`;
    const indexKey = `entity_certifications:${entityKey}`;
    const certifications = await this.readState<string[]>(indexKey) || [];
    
    if (!certifications.includes(certificationId)) {
      certifications.push(certificationId);
      await this.writeState<string[]>(indexKey, certifications);
    }
  }

  /**
   * Helper: Update issuer certifications index
   */
  private async updateIssuerCertificationsIndex(issuerId: string, certificationId: string): Promise<void> {
    const indexKey = `issuer_certifications:${issuerId}`;
    const certifications = await this.readState<string[]>(indexKey) || [];
    
    if (!certifications.includes(certificationId)) {
      certifications.push(certificationId);
      await this.writeState<string[]>(indexKey, certifications);
    }
  }

  /**
   * Helper: Update type certifications index
   */
  private async updateTypeCertificationsIndex(type: CertificationType, certificationId: string): Promise<void> {
    const indexKey = `type_certifications:${type}`;
    const certifications = await this.readState<string[]>(indexKey) || [];
    
    if (!certifications.includes(certificationId)) {
      certifications.push(certificationId);
      await this.writeState<string[]>(indexKey, certifications);
    }
  }

  /**
   * Helper: Update status certifications index
   */
  private async updateStatusCertificationsIndex(status: CertificationStatus, certificationId: string): Promise<void> {
    const indexKey = `status_certifications:${status}`;
    const certifications = await this.readState<string[]>(indexKey) || [];
    
    if (!certifications.includes(certificationId)) {
      certifications.push(certificationId);
      await this.writeState<string[]>(indexKey, certifications);
    }
  }

  /**
   * Helper: Remove certification from status index
   */
  private async removeFromStatusCertificationsIndex(status: CertificationStatus, certificationId: string): Promise<void> {
    const indexKey = `status_certifications:${status}`;
    const certifications = await this.readState<string[]>(indexKey) || [];
    
    const updatedCertifications = certifications.filter(id => id !== certificationId);
    await this.writeState<string[]>(indexKey, updatedCertifications);
  }
} 