import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { OpenAIService } from '../services/openai.js';
import { logger } from '../utils/logger.js';
import { twilioToOpenAI, openAIToTwilio } from '../utils/audioTranscode.js';
import { config } from '../config/env.js';

const ENGLISH_RULE = `LANGUAGE RULE (NEVER VIOLATE): You MUST respond ONLY in English. Even if the user speaks another language, ALWAYS reply in English.\n\n`;

// returns context-specific ai personality instructions
function getInstructionsForContext(context: string): string {
  switch (context) {
    case 'sales':
      return ENGLISH_RULE + `You are a professional sales representative for Biami.io.
Your goal is to introduce our business automation platform and schedule a demo.
Be persuasive, highlight product benefits, and address objections politely.
Use get_biami_info to provide detailed feature information.
Use check_calendar to schedule demos.`;
      
    case 'support':
      return ENGLISH_RULE + `You are a technical support agent for Biami.io.
Your goal is to help customers troubleshoot issues and answer questions.
Be patient, helpful, and provide clear step-by-step guidance.
Use get_biami_info to look up technical documentation.`;
      
    case 'demo':
      return ENGLISH_RULE + `You are a demo scheduling assistant for Biami.io.
Your goal is to collect availability and confirm meeting times.
Be friendly and efficient. Ask about preferred dates and times.
Use check_calendar to check availability and book slots.`;
      
    default:
      return ENGLISH_RULE + `You are an AI assistant for Biami.io.
Your goal is to answer questions about business automation or schedule a demo.
Speak professionally, concisely, and clearly.
Use check_calendar when the user wants to schedule a meeting or demo.
Use get_biami_info when the user asks about Biami.io features, pricing, or integrations.`;
  }
}

// handles phone call websocket connections at /phone from twilio
export function handleTwilioConnection(clientWs: WebSocket, req?: IncomingMessage) {
  logger.info('New Twilio (Phone) Client Connected');

  // extracts call context from query params
  let context = 'general';
  if (req?.url) {
    try {
      const url = new URL(req.url, 'wss://dummy.com');
      context = url.searchParams.get('context') || 'general';
      logger.info({ context }, 'Twilio connection context');
    } catch {
      logger.warn('Failed to parse context from URL, using default');
    }
  }

  let streamSid: string | null = null;
  let openAiService: OpenAIService | null = null;

  // transcodes openai audio to mulaw and sends to twilio
  function sendToTwilio(payload: string) {
    if (streamSid && clientWs.readyState === WebSocket.OPEN) {
      const mulaw = openAIToTwilio(payload);
      clientWs.send(
        JSON.stringify({
          event: 'media',
          streamSid,
          media: { payload: mulaw },
        })
      );
    }
  }

  // processes twilio media stream events
  clientWs.on('message', (data: Buffer | string) => {
    try {
      const msg = JSON.parse(data.toString()) as Record<string, unknown>;
      const event = msg.event as string;

      // stream started - create openai connection with context personality
      if (event === 'start') {
        const start = msg.start as Record<string, unknown>;
        streamSid = (msg.streamSid ?? start?.streamSid) as string;
        logger.info({ streamSid, context }, 'Twilio stream started');

        if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN) {
          logger.warn('Twilio credentials not configured - phone mode may fail');
        }

        const instructions = getInstructionsForContext(context);

        openAiService = new OpenAIService(
          (audio) => sendToTwilio(audio),
          (transcript) => logger.info(`AI (phone/${context}): ${transcript}`),
          instructions
        );
        return;
      }

      // incoming phone audio - transcode and send to openai
      if (event === 'media') {
        const media = msg.media as Record<string, unknown>;
        const track = media?.track as string;
        const payload = media?.payload as string;

        if (track === 'inbound' && payload && openAiService) {
          const pcm24k = twilioToOpenAI(payload);
          openAiService.sendAudio(pcm24k);
        }
        return;
      }

      // stream stopped - cleanup
      if (event === 'stop') {
        logger.info('Twilio stream stopped');
        openAiService?.close();
        openAiService = null;
      }
    } catch (err) {
      logger.error({ err }, 'Error parsing Twilio message');
    }
  });

  // cleanup on disconnect
  clientWs.on('close', () => {
    logger.info('Twilio Client Disconnected');
    openAiService?.close();
    openAiService = null;
  });
}
