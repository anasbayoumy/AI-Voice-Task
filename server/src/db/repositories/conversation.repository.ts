import { query } from '../client';

export interface Conversation {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content_type: string;
  content?: string;
  metadata: Record<string, any>;
  created_at: Date;
}

export class ConversationRepository {
  async create(
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    contentType: string = 'audio',
    content?: string,
    metadata: Record<string, any> = {}
  ): Promise<Conversation> {
    const result = await query<Conversation>(
      `INSERT INTO conversations (session_id, role, content_type, content, metadata) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [sessionId, role, contentType, content, JSON.stringify(metadata)]
    );
    return result[0];
  }

  async findBySessionId(sessionId: string): Promise<Conversation[]> {
    return await query<Conversation>(
      'SELECT * FROM conversations WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );
  }
}
