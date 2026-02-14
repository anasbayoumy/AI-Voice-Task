import { AuditLogRepository } from '../db/repositories/audit.repository';

export class AuditService {
  private auditRepo: AuditLogRepository;

  constructor() {
    this.auditRepo = new AuditLogRepository();
  }

  async log(eventType: string, sessionId?: string, metadata: Record<string, any> = {}): Promise<void> {
    try {
      await this.auditRepo.log(eventType, sessionId, metadata);
    } catch (error) {
      // Don't throw on audit failures, just log
      console.error('Audit log failed:', error);
    }
  }

  async getSessionAuditLog(sessionId: string) {
    return await this.auditRepo.findBySessionId(sessionId);
  }

  async getEventTypeLog(eventType: string, limit: number = 100) {
    return await this.auditRepo.findByEventType(eventType, limit);
  }
}
