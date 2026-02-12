import { IncomingMessage, ServerResponse } from 'http';
import { makeOutboundCall, hangupCall, getCallStatus } from '../services/twilioOutbound.js';
import { logger } from '../utils/logger.js';
import { readRequestBody, MAX_JSON_BODY, MAX_FORM_BODY } from '../utils/bodyReader.js';
import { config } from '../config/env.js';
import { validateTwilioRequest } from '../utils/twilioValidate.js';

type CorsHeaders = Record<string, string>;

// initiates outbound call via twilio api
export async function handleOutboundInitiate(req: IncomingMessage, res: ServerResponse, cors: CorsHeaders = {}) {
  try {
    const body = await readRequestBody(req, MAX_JSON_BODY);
    const params = JSON.parse(body);
    
    if (!params.to || typeof params.to !== 'string') {
      res.writeHead(400, { ...cors, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Missing required field: "to"',
        example: { to: '+15555551234', context: 'sales' }
      }));
      return;
    }

    if (!/^\+[1-9]\d{1,14}$/.test(params.to)) {
      res.writeHead(400, { ...cors, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Invalid phone number format. Use E.164 format: +15555551234'
      }));
      return;
    }

    logger.info({ to: params.to, context: params.context }, 'Outbound call request received');

    const result = await makeOutboundCall(params);
    
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch (error) {
    if (error instanceof Error && error.message.includes('exceeds')) {
      res.writeHead(413, { ...cors, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Request body too large',
        message: error.message
      }));
      return;
    }

    logger.error({ error }, 'Outbound initiate failed');
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to initiate call';
    
    res.writeHead(500, { ...cors, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: errorMessage,
      message: errorMessage
    }));
  }
}

// terminates active call by setting status to completed
export async function handleOutboundHangup(req: IncomingMessage, res: ServerResponse, callSid: string, cors: CorsHeaders = {}) {
  try {
    if (!callSid || !callSid.startsWith('CA')) {
      res.writeHead(400, { ...cors, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid callSid format' }));
      return;
    }

    logger.info({ callSid }, 'Hangup request received');
    
    const result = await hangupCall(callSid);
    
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch (error) {
    logger.error({ error, callSid }, 'Hangup failed');
    res.writeHead(500, { ...cors, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Failed to hang up call',
      message: error instanceof Error ? error.message : 'Unknown error'
    }));
  }
}

// fetches current call status from twilio
export async function handleOutboundStatus(req: IncomingMessage, res: ServerResponse, callSid: string, cors: CorsHeaders = {}) {
  try {
    if (!callSid || !callSid.startsWith('CA')) {
      res.writeHead(400, { ...cors, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid callSid format' }));
      return;
    }

    logger.debug({ callSid }, 'Status request received');
    
    const result = await getCallStatus(callSid);
    
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch (error) {
    logger.error({ error, callSid }, 'Status fetch failed');
    res.writeHead(404, { ...cors, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Call not found or fetch failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }));
  }
}

// receives call lifecycle updates from twilio webhook
export async function handleStatusCallback(req: IncomingMessage, res: ServerResponse, params: Record<string, string>) {
  try {
    logger.info({ 
      callSid: params.CallSid,
      status: params.CallStatus,
      duration: params.CallDuration,
      to: params.To,
      from: params.From,
    }, 'Twilio call status callback');
    
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  } catch (error) {
    logger.error({ error }, 'Status callback processing failed');
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Error');
  }
}

// handles status callback route with signature validation
export function handleStatusCallbackRoute(req: IncomingMessage, res: ServerResponse) {
  readRequestBody(req, MAX_FORM_BODY)
    .then((body) => {
      // parse form-urlencoded body
      const params: Record<string, string> = {};
      for (const pair of body.split('&')) {
        const [k, v] = pair.split('=');
        if (k && v) params[decodeURIComponent(k)] = decodeURIComponent(v);
      }

      // build url for signature validation
      const urlForValidation = config.SERVER_PUBLIC_URL
        ? `${config.SERVER_PUBLIC_URL.replace(/\/$/, '')}/api/outbound/status-callback`
        : (() => {
            const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
            const host = req.headers.host ?? 'localhost';
            return `${proto}://${host}/api/outbound/status-callback`;
          })();

      // validate twilio signature
      const isValid = validateTwilioRequest(
        config.TWILIO_AUTH_TOKEN,
        req.headers['x-twilio-signature'] as string | undefined,
        urlForValidation,
        params
      );

      // reject or warn based on strict mode setting
      if (!isValid) {
        if (config.STATUS_CALLBACK_STRICT) {
          logger.warn({ callSid: params.CallSid }, 'Status callback rejected: invalid signature');
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('Forbidden');
          return;
        } else {
          logger.warn({ callSid: params.CallSid }, 'Status callback signature invalid (warn-only mode)');
        }
      }

      handleStatusCallback(req, res, params);
    })
    .catch((error) => {
      // handle body size limit errors
      if (error instanceof Error && error.message.includes('exceeds')) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Request body too large',
          message: error.message
        }));
        return;
      }

      logger.error({ error }, 'Failed to read status callback body');
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error');
    });
}
