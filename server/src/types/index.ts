import WebSocket from 'ws';

export interface MediaStreamState {
  streamSid: string | null;
  latestMediaTimestamp: number;
  lastAssistantItem: string | null;
  markQueue: string[];
  responseStartTimestampTwilio: number | null;
  responseStartTimeMs: number | null;  // For web client (no Twilio timestamps)
}

export interface OpenAISessionConfig {
  model: string;
  temperature: number;
  voice: string;
  systemMessage: string;
  vad: {
    type: 'server_vad' | 'semantic_vad';
    threshold?: number;
    silenceDurationMs?: number;
    prefixPaddingMs?: number;
    eagerness?: 'low' | 'medium' | 'high' | 'auto';
  };
}

export interface TwilioMediaEvent {
  event: string;
  media?: {
    timestamp: number;
    payload: string;
  };
  start?: {
    streamSid: string;
  };
}

export interface OpenAIMessage {
  type: string;
  delta?: string;
  item_id?: string;
  [key: string]: any;
}

export interface Session {
  id: string;
  source: 'web' | 'phone';
  metadata: Record<string, any>;
  created_at: Date;
  ended_at?: Date;
  duration_seconds?: number;
  status: 'active' | 'ended' | 'error';
}

export interface Conversation {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content_type: string;
  content?: string;
  metadata: Record<string, any>;
  created_at: Date;
}
