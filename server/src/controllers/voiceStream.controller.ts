import type { WebSocket } from 'ws';
import { OpenAIService } from '../services/openai.service';
import { SessionService } from '../services/session.service';
import { AuditService } from '../services/audit.service';

export class VoiceStreamController {
  private sessionService: SessionService;
  private auditService: AuditService;

  constructor() {
    this.sessionService = new SessionService();
    this.auditService = new AuditService();
  }

  async handleConnection(connection: WebSocket, sessionId?: string, voice?: string): Promise<void> {
    console.log('🌐 Web voice client connected', voice ? `with voice: ${voice}` : '(no voice parameter)');
    console.log('   sessionId:', sessionId, 'voice:', voice);

    let session;
    try {
      // Create or retrieve session
      if (sessionId) {
        session = await this.sessionService.getSession(sessionId);
        if (!session) {
          connection.send(JSON.stringify({ type: 'error', message: 'Invalid session' }));
          connection.close();
          return;
        }
      } else {
        session = await this.sessionService.createSession('web');
      }

      await this.auditService.log('voice.connected', session.id, { source: 'web', voice });

      // Send session info to client
      connection.send(JSON.stringify({ 
        type: 'session', 
        sessionId: session.id 
      }));

      // Create OpenAI service for this connection with selected voice
      const openAIService = new OpenAIService(connection, session.id, 'audio/pcm', voice);
      openAIService.connect();

      // Handle incoming messages from web client
      connection.on('message', (data: Buffer | string) => {
        try {
          const message = typeof data === 'string' ? data : data.toString('utf8');
          const parsed = JSON.parse(message);

          // Handle different message types
          if (parsed.type === 'audio' && parsed.data) {
            // Web client sends PCM16 base64
            openAIService.handleClientAudio(parsed.data);
          } else if (parsed.type === 'start') {
            console.log('Voice client ready');
          }
        } catch (error) {
          console.error('Error handling voice message:', error);
        }
      });

      // Handle connection close
      connection.on('close', async () => {
        openAIService.close();
        await this.sessionService.endSession(session!.id);
        await this.auditService.log('voice.disconnected', session!.id);
        console.log('🌐 Web voice client disconnected');
      });

    } catch (error) {
      console.error('Voice stream error:', error);
      if (session) {
        await this.sessionService.markSessionError(session.id, error as Error);
      }
      connection.close();
    }
  }
}
