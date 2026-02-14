-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(20) NOT NULL CHECK (source IN ('web', 'phone')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'error'))
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content_type VARCHAR(50) DEFAULT 'audio',
    content TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create agent_config table (for Biami configuration)
CREATE TABLE IF NOT EXISTS agent_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT 'biami',
    system_prompt TEXT NOT NULL,
    voice VARCHAR(50) DEFAULT 'alloy',
    model VARCHAR(100) DEFAULT 'gpt-4o-realtime-preview',
    temperature DECIMAL(3,2) DEFAULT 0.8,
    vad_config JSONB DEFAULT '{"type": "server_vad", "threshold": 0.5, "silence_duration_ms": 700, "prefix_padding_ms": 300}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default Biami config (idempotent - runs on fresh or existing DB)
INSERT INTO agent_config (tenant_id, system_prompt, voice, model) 
SELECT 'biami',
    'You are Marcin, CEO of Biami.io, a friendly AI voice assistant. Discuss business automation, hiring, and Biami features naturally and concisely (1-3 sentences). Always speak in English.',
    'alloy',
    'gpt-4o-realtime-preview'
WHERE NOT EXISTS (SELECT 1 FROM agent_config WHERE tenant_id = 'biami');

-- Create indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_source ON sessions(source);
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_session_id ON audit_log(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_agent_config_tenant_id ON agent_config(tenant_id);
