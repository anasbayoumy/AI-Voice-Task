import { SessionRepository } from '../db/repositories/session.repository';
import { ConversationRepository } from '../db/repositories/conversation.repository';
import { AuditLogRepository } from '../db/repositories/audit.repository';
import type { Session } from '../types';

export class SessionService {
  private sessionRepo: SessionRepository;
  private conversationRepo: ConversationRepository;
  private auditRepo: AuditLogRepository;

  constructor() {
    this.sessionRepo = new SessionRepository();
    this.conversationRepo = new ConversationRepository();
    this.auditRepo = new AuditLogRepository();
  }

  async createSession(source: 'web' | 'phone', metadata: Record<string, any> = {}): Promise<Session> {
    try {
      const session = await this.sessionRepo.create(source, metadata);
      
      await this.auditRepo.log('session.created', session.id, {
        source,
        metadata
      });

      console.log(`✓ Session created: ${session.id} (source: ${source})`);
      return session;
    } catch (error) {
      // Database not available, return mock session
      console.warn('Database not available, creating mock session');
      return {
        id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        source,
        status: 'active',
        metadata,
        created_at: new Date()
      } as Session;
    }
  }

  async getSession(sessionId: string): Promise<Session | null> {
    try {
      return await this.sessionRepo.findById(sessionId);
    } catch (error) {
      console.warn('Database not available');
      return null;
    }
  }

  async endSession(sessionId: string): Promise<void> {
    try {
      await this.sessionRepo.end(sessionId);
      await this.auditRepo.log('session.ended', sessionId);
      console.log(`✓ Session ended: ${sessionId}`);
    } catch (error) {
      console.warn('Database not available, skipping session end');
    }
  }

  async markSessionError(sessionId: string, error: Error): Promise<void> {
    try {
      await this.sessionRepo.markError(sessionId);
      
      await this.auditRepo.log('session.error', sessionId, {
        error: error.message,
        stack: error.stack
      });

      console.error(`✗ Session error: ${sessionId}`, error);
    } catch (dbError) {
      console.warn('Database not available, skipping error logging');
    }
  }

  async logConversation(
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    contentType: string,
    content?: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.conversationRepo.create(sessionId, role, contentType, content, metadata);
  }

  async getConversationHistory(sessionId: string) {
    return await this.conversationRepo.findBySessionId(sessionId);
  }
}
