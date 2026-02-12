import twilio from 'twilio';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

let client: ReturnType<typeof twilio> | null = null;

// initializes twilio client if credentials are provided
try {
  if (config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN) {
    client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
    logger.info('Twilio client initialized');
  } else {
    logger.warn('Twilio credentials not configured - outbound calling disabled');
  }
} catch (error) {
  logger.error({ error }, 'Failed to initialize Twilio client');
}

export interface MakeCallParams {
  to: string;
  from?: string;
  context?: string;
  customData?: Record<string, string>;
}

export interface CallResult {
  success: boolean;
  callSid: string;
  status: string;
  to: string;
  from: string;
}

export interface CallStatusResult {
  sid: string;
  status: string;
  duration: string | null;
  direction: string;
  from: string;
  to: string;
  startTime: Date | null;
  endTime: Date | null;
}

// initiates outbound call via twilio api
export async function makeOutboundCall(params: MakeCallParams): Promise<CallResult> {
  const { to, from, context, customData } = params;

  if (!client) {
    throw new Error('Twilio client not initialized. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env');
  }

  if (!config.SERVER_PUBLIC_URL) {
    throw new Error('SERVER_PUBLIC_URL not configured in .env');
  }

  try {
    // builds voice webhook url with context parameter
    const host = config.SERVER_PUBLIC_URL;
    let url = `${host}/twilio/voice?direction=outbound`;
    
    if (context) {
      url += `&context=${encodeURIComponent(context)}`;
    }
    
    if (customData) {
      for (const [key, value] of Object.entries(customData)) {
        url += `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      }
    }

    logger.info({ to, context, url }, 'Initiating outbound call');

    // calls twilio api to dial the number
    const call = await client.calls.create({
      to,
      from: from || config.TWILIO_PHONE_NUMBER || '',
      url,
      method: 'POST',
      statusCallback: `${host}/api/outbound/status-callback`,
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    });

    logger.info({ 
      callSid: call.sid, 
      to, 
      from: call.from, 
      status: call.status 
    }, 'Outbound call initiated successfully');
    
    return {
      success: true,
      callSid: call.sid,
      status: call.status,
      to,
      from: call.from,
    };
  } catch (error: any) {
    const twilioError = {
      status: error?.status,
      code: error?.code,
      message: error?.message,
      moreInfo: error?.moreInfo,
    };
    
    logger.error({ error: twilioError, to, context }, 'Failed to initiate outbound call');
    
    // maps twilio error codes to user-friendly messages
    if (error?.code === 21219) {
      throw new Error(`The number ${to} is not verified. For trial accounts, verify this number at: https://console.twilio.com/us1/develop/phone-numbers/manage/verified`);
    } else if (error?.code === 21608) {
      throw new Error(`The number ${to} is not yet verified for this account.`);
    } else if (error?.code === 21211) {
      throw new Error(`Invalid phone number format: ${to}. Use E.164 format: +1234567890`);
    }
    
    throw error;
  }
}

// terminates active call by setting status to completed
export async function hangupCall(callSid: string): Promise<{ success: boolean; status: string }> {
  if (!client) {
    throw new Error('Twilio client not initialized');
  }

  try {
    logger.info({ callSid }, 'Attempting to hang up call');
    
    const call = await client.calls(callSid).update({ status: 'completed' });
    
    logger.info({ callSid, status: call.status }, 'Call hung up successfully');
    
    return { 
      success: true, 
      status: call.status 
    };
  } catch (error) {
    logger.error({ error, callSid }, 'Failed to hang up call');
    throw error;
  }
}

// fetches call details from twilio api
export async function getCallStatus(callSid: string): Promise<CallStatusResult> {
  if (!client) {
    throw new Error('Twilio client not initialized');
  }

  try {
    const call = await client.calls(callSid).fetch();
    
    return {
      sid: call.sid,
      status: call.status,
      duration: call.duration,
      direction: call.direction,
      from: call.from,
      to: call.to,
      startTime: call.startTime,
      endTime: call.endTime,
    };
  } catch (error) {
    logger.error({ error, callSid }, 'Failed to fetch call status');
    throw error;
  }
}
