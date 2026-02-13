import { query } from '../client';

export interface AgentConfig {
  id: string;
  tenant_id: string;
  system_prompt: string;
  voice: string;
  model: string;
  temperature: number;
  vad_config: {
    type: 'server_vad' | 'semantic_vad';
    threshold?: number;
    silence_duration_ms?: number;
    prefix_padding_ms?: number;
    eagerness?: 'low' | 'medium' | 'high' | 'auto';
  };
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class AgentConfigRepository {
  async findByTenantId(tenantId: string = 'biami'): Promise<AgentConfig | null> {
    const result = await query<AgentConfig>(
      'SELECT * FROM agent_config WHERE tenant_id = $1 AND is_active = true',
      [tenantId]
    );
    return result[0] || null;
  }

  async update(tenantId: string, updates: Partial<AgentConfig>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.system_prompt !== undefined) {
      fields.push(`system_prompt = $${paramCount++}`);
      values.push(updates.system_prompt);
    }
    if (updates.voice !== undefined) {
      fields.push(`voice = $${paramCount++}`);
      values.push(updates.voice);
    }
    if (updates.model !== undefined) {
      fields.push(`model = $${paramCount++}`);
      values.push(updates.model);
    }
    if (updates.temperature !== undefined) {
      fields.push(`temperature = $${paramCount++}`);
      values.push(updates.temperature);
    }
    if (updates.vad_config !== undefined) {
      fields.push(`vad_config = $${paramCount++}`);
      values.push(JSON.stringify(updates.vad_config));
    }

    if (fields.length === 0) return;

    fields.push(`updated_at = NOW()`);
    values.push(tenantId);

    await query(
      `UPDATE agent_config SET ${fields.join(', ')} WHERE tenant_id = $${paramCount}`,
      values
    );
  }
}
