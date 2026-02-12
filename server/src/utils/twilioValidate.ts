import twilio from 'twilio';

// validates twilio webhook signature to ensure request came from twilio
export function validateTwilioRequest(
  authToken: string | undefined,
  signature: string | undefined,
  url: string,
  params: Record<string, string>
): boolean {
  if (!authToken || !signature) {
    return false;
  }
  return twilio.validateRequest(authToken, signature, url, params);
}
