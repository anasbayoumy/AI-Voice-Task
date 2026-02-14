import type { FastifyRequest, FastifyReply } from 'fastify';

export class TwilioController {
  async handleIncomingCall(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const host = request.headers.host;
    
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
                          <Response>
                              <Say voice="Google.en-US-Chirp3-HD-Aoede">Please wait while we connect your call to the A. I. voice assistant, powered by Twilio and the Open A I Realtime API</Say>
                              <Pause length="1"/>
                              <Say voice="Google.en-US-Chirp3-HD-Aoede">O.K. you can start talking!</Say>
                              <Connect>
                                  <Stream url="wss://${host}/media-stream" />
                              </Connect>
                          </Response>`;

    reply.type('text/xml').send(twimlResponse);
  }
}
