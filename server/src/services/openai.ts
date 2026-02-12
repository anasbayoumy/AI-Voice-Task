import WebSocket from 'ws';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import {
  TOOL_DEFINITIONS,
  executeTool,
  type ToolResult,
} from './tools.js';

const SYSTEM_MESSAGE = `
LANGUAGE RULE (NEVER VIOLATE): You MUST respond ONLY in English. Even if the user speaks German, Arabic, French, or any other language, you ALWAYS reply in English. Never use non-English words or sentences in your responses.

You are Marcin, CEO of Biami.io, a friendly AI voice assistant. Discuss business automation, hiring, and Biami features naturally and concisely (1-3 sentences). Always speak in English.

Use check_calendar for scheduling/demos.
Use get_biami_info for pricing, features, and integrations.
`;

export class OpenAIService {
  private ws: WebSocket | null;
  private isConnected = false;
  private testMode: boolean;
  private testChunkCount = 0;
  private systemInstructions: string;
  private currentResponseId: string | null = null;
  private isResponding = false;

  constructor(
    private onAudio: (audio: string) => void,
    private onText?: (text: string) => void,
    customInstructions?: string
  ) {
    this.testMode = config.TEST_MODE ?? false;
    this.systemInstructions = customInstructions || SYSTEM_MESSAGE;

    if (this.testMode) {
      logger.info('TEST MODE: Skipping OpenAI connection, will echo mock responses');
      this.ws = null;
      this.isConnected = true;
      return;
    }

    const url = 'wss://api.openai.com/v1/realtime?model=gpt-realtime';

    this.ws = new WebSocket(url, {
      headers: {
        Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      },
    });

    this.ws.on('open', this.handleOpen.bind(this));
    this.ws.on('message', this.handleMessage.bind(this));
    this.ws.on('error', (err) => logger.error({ err }, 'OpenAI Error'));
    this.ws.on('close', () => logger.info('OpenAI Connection Closed'));
  }

  // configures openai session with persona and audio settings
  private handleOpen() {
    this.isConnected = true;
    logger.info('Connected to OpenAI Realtime API');

    const sessionUpdate = {
      type: 'session.update',
      session: {
        type: 'realtime',
        instructions: this.systemInstructions,
        tools: TOOL_DEFINITIONS,
        tool_choice: 'auto',
        audio: {
          output: {
            voice: 'alloy',
          },
        },
      },
    };
    const preview = this.systemInstructions.trim();
    logger.info({ instructionsLength: preview.length, preview: preview.slice(0, 120) + (preview.length > 120 ? '...' : '') }, 'Sending session.update to OpenAI (persona applied)');
    this.send(sessionUpdate);
  }

  // processes events from openai websocket
  private async handleMessage(data: WebSocket.Data) {
    try {
      const response = JSON.parse(data.toString()) as Record<string, unknown>;
      
      const eventType = response.type as string;
      if (eventType === 'session.updated') {
        logger.info('OpenAI session configured - persona and instructions applied');
      } else if (eventType && !eventType.startsWith('input_audio_buffer.')) {
        logger.debug({ type: eventType }, 'OpenAI event');
      }

      // track when ai starts responding
      if (response.type === 'response.created') {
        const resp = response.response as Record<string, unknown>;
        this.currentResponseId = resp?.id as string;
        this.isResponding = true;
        logger.debug({ responseId: this.currentResponseId }, 'AI response started');
      }

      // log completion details
      if (response.type === 'response.done') {
        const resp = response.response as Record<string, unknown>;
        logger.info({ 
          status: resp?.status,
          status_details: resp?.status_details,
          output: resp?.output,
          usage: resp?.usage 
        }, 'Response completed');
        this.isResponding = false;
        this.currentResponseId = null;
      }

      // forward ai audio to client
      if (response.type === 'response.output_audio.delta') {
        const delta = response.delta as string;
        if (delta) {
          const deltaLength = delta.length;
          logger.debug({ deltaLength }, 'Received audio delta, forwarding to client');
          this.onAudio(delta);
        }
      }

      // log ai transcript
      if (response.type === 'response.output_audio_transcript.done') {
        const transcript = response.transcript as string;
        if (this.onText && transcript) {
          this.onText(transcript);
        }
      }

      // handle function calling
      if (response.type === 'response.required_action') {
        await this.handleRequiredAction(response);
      }

      if (response.type === 'error') {
        logger.error({ error: response.error }, 'OpenAI API Error');
      }
    } catch (error) {
      logger.error({ error }, 'Error parsing OpenAI message');
    }
  }

  // executes tool calls requested by ai and returns results
  private async handleRequiredAction(response: Record<string, unknown>) {
    const requiredAction = response.required_action as Record<string, unknown>;
    const responseId = response.response_id as string;

    if (requiredAction?.type !== 'submit_tool_outputs') return;

    const toolCalls = (requiredAction.tool_calls as Array<Record<string, unknown>>) ?? [];
    const outputs: Array<{ tool_call_id: string; output: string }> = [];

    for (const call of toolCalls) {
      const id = call.id as string;
      const name = call.name as string;
      const args = (call.arguments as Record<string, unknown>) ?? {};
      let parsedArgs = args;
      if (typeof args === 'string') {
        try {
          parsedArgs = JSON.parse(args) as Record<string, unknown>;
        } catch {
          parsedArgs = {};
        }
      }
      const result: ToolResult = await executeTool(name, parsedArgs);
      outputs.push({ tool_call_id: id, output: result.content });
    }

    this.send({
      type: 'response.submit_tool_outputs',
      response_id: responseId,
      tool_outputs: outputs,
    });
  }

  // sends user audio to openai (appends to buffer)
  public sendAudio(base64Audio: string) {
    if (!this.isConnected) return;
    
    if (this.testMode) {
      this.testChunkCount++;
      
      if (this.testChunkCount >= 50) {
        this.testChunkCount = 0;
        logger.debug('TEST MODE: Received audio, echoing mock beep');
        
        setTimeout(() => {
          const sampleRate = 24000;
          const duration = 0.5;
          const frequency = 440;
          const samples = Math.floor(sampleRate * duration);
          const pcm16 = Buffer.alloc(samples * 2);
          
          for (let i = 0; i < samples; i++) {
            const t = i / sampleRate;
            const amplitude = Math.sin(2 * Math.PI * frequency * t);
            const sample = Math.floor(amplitude * 8000);
            pcm16.writeInt16LE(sample, i * 2);
          }
          
          const mockAudio = pcm16.toString('base64');
          this.onAudio(mockAudio);
          if (this.onText) this.onText('🎵 Test beep from mock OpenAI (440Hz tone)');
        }, 100);
      }
      return;
    }

    const audioLength = base64Audio?.length || 0;
    if (audioLength === 0) {
      logger.warn('Attempted to send empty audio to OpenAI');
      return;
    }

    this.send({
      type: 'input_audio_buffer.append',
      audio: base64Audio,
    });
  }

  // commits audio buffer and requests ai response
  public commitAudio() {
    if (!this.isConnected || this.testMode) return;
    logger.debug('Committing audio buffer - asking OpenAI to respond');
    this.send({
      type: 'input_audio_buffer.commit',
    });
    this.send({
      type: 'response.create',
      response: {
        output_modalities: ['audio'],
      },
    });
  }

  // triggers ai to greet user without input
  public sendGreeting() {
    if (!this.isConnected || this.testMode) return;
    logger.info('Sending AI greeting (no user input)');
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Hello'
          }
        ]
      }
    });
    this.send({
      type: 'response.create',
      response: {
        output_modalities: ['audio'],
      },
    });
  }

  // clears audio buffer and cancels any ongoing ai response
  public clearInputBuffer() {
    if (!this.isConnected) return;
    if (this.testMode) {
      logger.debug('TEST MODE: Clearing buffer (no-op)');
      return;
    }
    
    this.send({ type: 'input_audio_buffer.clear' });
    
    if (this.isResponding && this.currentResponseId) {
      logger.debug({ responseId: this.currentResponseId }, 'Cancelling ongoing AI response');
      this.send({ 
        type: 'response.cancel'
      });
      this.isResponding = false;
      this.currentResponseId = null;
    }
  }
  
  // returns true if ai is currently generating response
  public isAIResponding(): boolean {
    return this.isResponding;
  }

  // sends json message to openai websocket
  private send(data: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  // closes websocket connection to openai
  public close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}
