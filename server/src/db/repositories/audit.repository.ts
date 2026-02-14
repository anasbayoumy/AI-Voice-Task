import { query } from '../client';

export interface AuditLog {
  id: string;
  event_type: string;
  session_id?: string;
  metadata: Record<string, any>;
  created_at: Date;
}

export class AuditLogRepository {
  async log(
    eventType: string,
    sessionId?: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await query(
      `INSERT INTO audit_log (event_type, session_id, metadata) 
       VALUES ($1, $2, $3)`,
      [eventType, sessionId, JSON.stringify(metadata)]
    );
  }

  async findBySessionId(sessionId: string): Promise<AuditLog[]> {
    return await query<AuditLog>(
      'SELECT * FROM audit_log WHERE session_id = $1 ORDER BY created_at DESC',
      [sessionId]
    );
  }

  async findByEventType(eventType: string, limit: number = 100): Promise<AuditLog[]> {
    return await query<AuditLog>(
      'SELECT * FROM audit_log WHERE event_type = $1 ORDER BY created_at DESC LIMIT $2',
      [eventType, limit]
    );
  }
}
