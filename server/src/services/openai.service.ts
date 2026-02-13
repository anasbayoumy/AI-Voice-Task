import WebSocket from 'ws';
import { config } from '../config';
import type { MediaStreamState, OpenAIMessage } from '../types';

export class OpenAIService {
  private ws: WebSocket | null = null;
  private state: MediaStreamState;
  private twilioConnection: WebSocket;
  private sessionId: string | null;
  private audioFormat: 'audio/pcm' | 'audio/pcmu';
  private voiceOverride?: string;

  constructor(twilioConnection: WebSocket, sessionId: string | null = null, audioFormat: 'audio/pcm' | 'audio/pcmu' = 'audio/pcm', voiceOverride?: string) {
    this.twilioConnection = twilioConnection;
    this.sessionId = sessionId;
    this.audioFormat = audioFormat;
    this.voiceOverride = voiceOverride;
    this.state = {
      streamSid: null,
      latestMediaTimestamp: 0,
      lastAssistantItem: null,
      markQueue: [],
      responseStartTimestampTwilio: null,
      responseStartTimeMs: null
    };
  }

  connect(): void {
    // TEST MODE: Skip OpenAI connection, just echo back
    if (config.openai.testMode) {
      console.log('🧪 TEST MODE: Skipping OpenAI connection');
      this.setupTestMode();
      return;
    }

    const url = `wss://api.openai.com/v1/realtime?model=${config.openai.model}&temperature=${config.openai.temperature}`;
    
    this.ws = new WebSocket(url, {
      headers: {
        Authorization: `Bearer ${config.openai.apiKey}`,
      }
    });

    this.setupEventHandlers();
  }

  private setupTestMode(): void {
    console.log('🧪 Test mode active - simulating OpenAI responses');
    
    // Send test connection confirmation to client
    setTimeout(() => {
      this.twilioConnection.send(JSON.stringify({
        type: 'test',
        message: 'Connected in TEST MODE - audio will be echoed back'
      }));
    }, 100);
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.on('open', () => {
      console.log('Connected to the OpenAI Realtime API');
      setTimeout(() => this.initializeSession(), 100);
    });

    this.ws.on('message', (data: Buffer | ArrayBuffer | Buffer[] | string) => {
      this.handleOpenAIMessage(data);
    });

    this.ws.on('close', () => {
      console.log('Disconnected from the OpenAI Realtime API');
    });

    this.ws.on('error', (error) => {
      console.error('Error in the OpenAI WebSocket:', error);
    });
  }

  private initializeSession(): void {
    const vadConfig = config.openai.vad;
    
    // Build turn_detection config based on VAD type
    const turnDetection: any = {
      type: vadConfig.type
    };

    if (vadConfig.type === 'server_vad') {
      // Server VAD: OpenAI handles noise detection, pauses, and turn-taking via silence
      turnDetection.threshold = vadConfig.threshold;
      turnDetection.silence_duration_ms = vadConfig.silenceDurationMs;
      turnDetection.prefix_padding_ms = vadConfig.prefixPaddingMs;
    } else {
      // Semantic VAD: OpenAI uses semantic understanding for turn detection
      turnDetection.eagerness = vadConfig.eagerness;
    }

    // Use voice override if provided, otherwise use config default
    const selectedVoice = this.voiceOverride || config.openai.voice;

    const sessionUpdate = {
      type: 'session.update',
      session: {
        type: 'realtime',
        model: config.openai.model,
        output_modalities: ["audio"],
        audio: {
          input: { 
            format: { 
              type: this.audioFormat,
              rate: this.audioFormat === 'audio/pcm' ? 24000 : undefined 
            },
            turn_detection: turnDetection 
          },
          output: { 
            format: { 
              type: this.audioFormat,
              rate: this.audioFormat === 'audio/pcm' ? 24000 : undefined 
            },
            voice: selectedVoice 
          },
        },
        instructions: config.openai.systemMessage,
      },
    };

    console.log('🎤 Initializing OpenAI session with voice:', selectedVoice, 'VAD:', JSON.stringify(turnDetection, null, 2));
    this.send(sessionUpdate);
  }

  private handleOpenAIMessage(data: Buffer | ArrayBuffer | Buffer[] | string): void {
    try {
      const text = typeof data === 'string' ? data : Buffer.from(data as Buffer).toString('utf8');
      const response: OpenAIMessage = JSON.parse(text);

      if (config.logging.eventTypes.includes(response.type)) {
        console.log(`Received event: ${response.type}`, response);
      }

      if (response.type === 'response.output_audio.delta' && response.delta) {
        this.handleAudioDelta(response);
      }

      if (response.type === 'input_audio_buffer.speech_started') {
        this.handleSpeechStarted();
      }
    } catch (error) {
      console.error('Error processing OpenAI message:', error, 'Raw message:', typeof data === 'string' ? data : Buffer.from(data as Buffer).toString('utf8'));
    }
  }

  private handleAudioDelta(response: OpenAIMessage): void {
    const audioResponse = {
      type: 'audio',
      data: response.delta
    };
    this.twilioConnection.send(JSON.stringify(audioResponse));

    if (!this.state.responseStartTimestampTwilio) {
      this.state.responseStartTimestampTwilio = this.state.latestMediaTimestamp;
      this.state.responseStartTimeMs = Date.now();
    }

    if (response.item_id) {
      this.state.lastAssistantItem = response.item_id;
    }
  }

  private handleSpeechStarted(): void {
    this.send({ type: 'response.cancel' });

    if (!this.state.lastAssistantItem) {
      this.sendClearToClient();
      this.state.responseStartTimestampTwilio = null;
      this.state.responseStartTimeMs = null;
      return;
    }

    let elapsedTime: number;
    if (this.state.latestMediaTimestamp > 0 && this.state.responseStartTimestampTwilio != null) {
      elapsedTime = this.state.latestMediaTimestamp - this.state.responseStartTimestampTwilio;
    } else if (this.state.responseStartTimeMs != null) {
      elapsedTime = Math.max(0, Date.now() - this.state.responseStartTimeMs);
    } else {
      elapsedTime = 0;
    }

    const truncateEvent = {
      type: 'conversation.item.truncate',
      item_id: this.state.lastAssistantItem,
      content_index: 0,
      audio_end_ms: elapsedTime
    };
    if (config.logging.showTimingMath) {
      console.log('Sending truncation event:', JSON.stringify(truncateEvent));
    }
    this.send(truncateEvent);
    this.state.lastAssistantItem = null;

    this.sendClearToClient();
    this.state.markQueue = [];
    this.state.responseStartTimestampTwilio = null;
    this.state.responseStartTimeMs = null;
  }

  private sendClearToClient(): void {
    if (this.audioFormat === 'audio/pcmu' && this.state.streamSid) {
      this.twilioConnection.send(JSON.stringify({
        event: 'clear',
        streamSid: this.state.streamSid
      }));
    } else {
      this.twilioConnection.send(JSON.stringify({ type: 'clear' }));
    }
  }

  // Handle audio from web client (PCM16 base64)
  handleClientAudio(base64Audio: string): void {
    if (config.openai.testMode) {
      console.log('🧪 Test mode: received audio chunk');
      this.twilioConnection.send(JSON.stringify({
        type: 'test_echo',
        message: 'Audio chunk received',
        size: base64Audio.length
      }));
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      const audioAppend = {
        type: 'input_audio_buffer.append',
        audio: base64Audio
      };
      this.send(audioAppend);
    }
  }

  private sendMark(): void {
    if (this.state.streamSid) {
      const markEvent = {
        event: 'mark',
        streamSid: this.state.streamSid,
        mark: { name: 'responsePart' }
      };
      this.twilioConnection.send(JSON.stringify(markEvent));
      this.state.markQueue.push('responsePart');
    }
  }

  handleTwilioMessage(message: Buffer | ArrayBuffer | Buffer[] | string): void {
    try {
      const text = typeof message === 'string' ? message : Buffer.from(message as Buffer).toString('utf8');
      const data = JSON.parse(text);

      // TEST MODE: Just echo back confirmation
      if (config.openai.testMode) {
        if (data.event === 'start' || data.type === 'start') {
          this.state.streamSid = data.start?.streamSid || 'test-stream-id';
          console.log('🧪 Test stream started:', this.state.streamSid);
          
          // Send test response
          this.twilioConnection.send(JSON.stringify({
            type: 'test_response',
            message: 'Audio received in test mode',
            timestamp: Date.now()
          }));
        }
        
        if (data.event === 'media' || data.type === 'audio') {
          console.log('🧪 Test mode: received audio chunk');
          // Echo back a confirmation
          this.twilioConnection.send(JSON.stringify({
            type: 'test_echo',
            message: 'Audio chunk received',
            size: data.media?.payload?.length || data.data?.length || 0
          }));
        }
        return;
      }

      // REAL MODE: Normal OpenAI flow
      switch (data.event) {
        case 'media':
          this.state.latestMediaTimestamp = data.media.timestamp;
          if (config.logging.showTimingMath) {
            console.log(`Received media message with timestamp: ${this.state.latestMediaTimestamp}ms`);
          }
          if (this.ws?.readyState === WebSocket.OPEN) {
            const audioAppend = {
              type: 'input_audio_buffer.append',
              audio: data.media.payload
            };
            this.send(audioAppend);
          }
          break;
        case 'start':
          this.state.streamSid = data.start.streamSid;
          console.log('Incoming stream has started', this.state.streamSid);
          // Reset start and media timestamp on a new stream
          this.state.responseStartTimestampTwilio = null; 
          this.state.latestMediaTimestamp = 0;
          break;
        case 'mark':
          if (this.state.markQueue.length > 0) {
            this.state.markQueue.shift();
          }
          break;
        default:
          console.log('Received non-media event:', data.event);
          break;
      }
    } catch (error) {
      console.error('Error parsing message:', error, 'Message:', message);
    }
  }

  private send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  close(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }
}
