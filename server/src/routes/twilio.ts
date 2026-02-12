import { IncomingMessage, ServerResponse } from 'http';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { validateTwilioRequest } from '../utils/twilioValidate.js';

// handles twilio voice webhook and returns twiml xml
export function handleTwilioVoice(req: IncomingMessage, res: ServerResponse) {
  // processes twilio request with signature validation
  const processTwilioRequest = (params: Record<string, string>) => {
    // build full url for signature validation
    const urlForValidation = config.SERVER_PUBLIC_URL
      ? `${config.SERVER_PUBLIC_URL.replace(/\/$/, '')}${req.url ?? '/twilio/voice'}`
      : (() => {
          const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
          const host = req.headers.host ?? 'localhost';
          return `${proto}://${host}${req.url ?? '/twilio/voice'}`;
        })();

    // validate request came from twilio using signature
    if (
      !validateTwilioRequest(
        config.TWILIO_AUTH_TOKEN,
        req.headers['x-twilio-signature'] as string | undefined,
        urlForValidation,
        params
      )
    ) {
      logger.warn('Twilio voice webhook rejected: invalid or missing signature');
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    // extract call context (sales, support, demo, general)
    const context = params.context || 'general';
    const direction = params.direction || params.Direction || 'inbound';
    
    logger.info({ direction, context }, 'Twilio voice webhook request');

    // build websocket url for twilio media stream
    const host = config.SERVER_PUBLIC_URL
      ? new URL(config.SERVER_PUBLIC_URL).host
      : (req.headers.host ?? 'localhost');
    
    let wsUrl = config.TWILIO_WS_URL || `wss://${host}/phone`;
    
    // add context as query param so handler knows ai personality
    if (context !== 'general') {
      wsUrl += `?context=${encodeURIComponent(context)}`;
    }
    
    // return twiml xml that connects call to our websocket
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}"/>
  </Connect>
</Response>`;
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml);
  };

  // parse query params for get requests
  if (req.method === 'GET') {
    const qs = (req.url ?? '').split('?')[1] ?? '';
    const params: Record<string, string> = {};
    for (const pair of qs.split('&')) {
      const [k, v] = pair.split('=');
      if (k && v) params[decodeURIComponent(k)] = decodeURIComponent(v);
    }
    processTwilioRequest(params);
  } else {
    // parse form body for post requests
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const params: Record<string, string> = {};
      for (const pair of body.split('&')) {
        const [k, v] = pair.split('=');
        if (k && v) params[decodeURIComponent(k)] = decodeURIComponent(v);
      }
      processTwilioRequest(params);
    });
  }
}
