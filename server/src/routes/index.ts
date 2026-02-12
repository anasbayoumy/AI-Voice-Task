import { IncomingMessage, ServerResponse } from 'http';
import { handleHealth } from './health.js';
import { handleCors } from './cors.js';
import { handleTwilioVoice } from './twilio.js';
import { 
  handleOutboundInitiate, 
  handleOutboundHangup, 
  handleOutboundStatus,
  handleStatusCallbackRoute
} from './outbound.js';
import { requireApiKey } from '../utils/auth.js';
import { checkRateLimit } from '../utils/rateLimiter.js';

type CorsHeaders = Record<string, string>;

// routes all http requests to appropriate handlers
export function handleHttpRequest(req: IncomingMessage, res: ServerResponse, corsHeaders: CorsHeaders) {
  const path = (req.url ?? '').split('?')[0] ?? '';

  // cors preflight
  if (req.method === 'OPTIONS' && path.startsWith('/api/')) {
    handleCors(req, res, corsHeaders);
    return;
  }

  // health check
  if (req.method === 'GET' && path === '/health') {
    handleHealth(req, res, corsHeaders);
    return;
  }

  // twilio voice webhook
  if ((req.method === 'GET' || req.method === 'POST') && path === '/twilio/voice') {
    handleTwilioVoice(req, res);
    return;
  }

  // outbound api - initiate call
  if (req.method === 'POST' && path === '/api/outbound/initiate') {
    if (!requireApiKey(req, res, corsHeaders)) return;
    if (!checkRateLimit(req, res, 'initiate', corsHeaders)) return;
    handleOutboundInitiate(req, res, corsHeaders);
    return;
  }

  // outbound api - hangup call
  if (req.method === 'POST' && path?.startsWith('/api/outbound/hangup/')) {
    if (!requireApiKey(req, res, corsHeaders)) return;
    if (!checkRateLimit(req, res, 'other', corsHeaders)) return;
    const callSid = path.split('/').pop();
    if (callSid) {
      handleOutboundHangup(req, res, callSid, corsHeaders);
    } else {
      res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing callSid' }));
    }
    return;
  }

  // outbound api - get call status
  if (req.method === 'GET' && path?.startsWith('/api/outbound/status/')) {
    if (!requireApiKey(req, res, corsHeaders)) return;
    if (!checkRateLimit(req, res, 'other', corsHeaders)) return;
    const callSid = path.split('/').pop();
    if (callSid) {
      handleOutboundStatus(req, res, callSid, corsHeaders);
    } else {
      res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing callSid' }));
    }
    return;
  }

  // outbound api - status callback webhook
  if (req.method === 'POST' && path === '/api/outbound/status-callback') {
    handleStatusCallbackRoute(req, res);
    return;
  }

  // 404 for unknown routes
  res.writeHead(404, { ...corsHeaders, 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}
