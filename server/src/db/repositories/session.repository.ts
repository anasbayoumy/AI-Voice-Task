import { query } from '../client';

export interface Session {
  id: string;
  source: 'web' | 'phone';
  metadata: Record<string, any>;
  created_at: Date;
  ended_at?: Date;
  duration_seconds?: number;
  status: 'active' | 'ended' | 'error';
}

export class SessionRepository {
  async create(source: 'web' | 'phone', metadata: Record<string, any> = {}): Promise<Session> {
    const result = await query<Session>(
      `INSERT INTO sessions (source, metadata) 
       VALUES ($1, $2) 
       RETURNING *`,
      [source, JSON.stringify(metadata)]
    );
    return result[0];
  }

  async findById(id: string): Promise<Session | null> {
    const result = await query<Session>(
      'SELECT * FROM sessions WHERE id = $1',
      [id]
    );
    return result[0] || null;
  }

  async end(id: string): Promise<void> {
    await query(
      `UPDATE sessions 
       SET ended_at = NOW(), 
           status = 'ended',
           duration_seconds = EXTRACT(EPOCH FROM (NOW() - created_at))::INTEGER
       WHERE id = $1`,
      [id]
    );
  }

  async markError(id: string): Promise<void> {
    await query(
      `UPDATE sessions 
       SET status = 'error', 
           ended_at = NOW()
       WHERE id = $1`,
      [id]
    );
  }
}
