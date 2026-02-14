export type VoiceAgentMode = 'idle' | 'listening' | 'speaking' | 'processing';

export interface VoiceAgentState {
  mode: VoiceAgentMode;
  isConnected: boolean;
  isMuted: boolean;
  error: string | null;
  sessionId: string | null;
}

export interface AudioConfig {
  sampleRate: number;
  channelCount: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}
