import type { WebSocket } from 'ws';
import { OpenAIService } from '../services/openai.service';

export class MediaStreamController {
  handleConnection(connection: WebSocket): void {
    console.log('Client connected');

    // Create OpenAI service for this connection
    const openAIService = new OpenAIService(connection, null, 'audio/pcmu');
    openAIService.connect();

    // Handle incoming messages from Twilio
    connection.on('message', (message) => {
      openAIService.handleTwilioMessage(message);
    });

    // Handle connection close
    connection.on('close', () => {
      openAIService.close();
      console.log('Client disconnected.');
    });
  }
}
