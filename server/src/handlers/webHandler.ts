import { WebSocket } from 'ws';
import { config } from '../config/env.js';
import { OpenAIService } from '../services/openai.js';
import { logger } from '../utils/logger.js';

// handles browser voice websocket connections at /web
export function handleWebConnection(clientWs: WebSocket) {
    logger.info('New Web Client Connected');

    if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: 'session.ready', testMode: config.TEST_MODE ?? false }));
    }

    let clientDisconnected = false;
    let hasUserSpoken = false;

    // creates openai connection and forwards ai audio to browser
    const openAiService = new OpenAIService(
        (audioChunk) => {
            if (clientDisconnected || clientWs.readyState !== WebSocket.OPEN) {
                logger.debug('Skipping audio send - client disconnected');
                return;
            }
            clientWs.send(JSON.stringify({ type: 'audio', payload: audioChunk }));
        },
        (transcript) => logger.info(`AI: ${transcript}`)
    );

    let chunkCount = 0;
    let lastInterruptTime = 0;
    
    // Manual turn detection disabled - OpenAI handles it with server_vad (1.2s silence threshold)
    // This prevents conflicts and "hello/hi" false detection on first utterance
    
    // calculates rms volume from base64 pcm16 audio
    const calculateVolume = (base64Audio: string): number => {
        try {
            const binary = Buffer.from(base64Audio, 'base64');
            const pcm16 = new Int16Array(binary.buffer, binary.byteOffset, binary.length / 2);
            let sum = 0;
            for (let i = 0; i < pcm16.length; i++) {
                const sample = pcm16[i] || 0;
                sum += sample * sample;
            }
            return Math.sqrt(sum / pcm16.length);
        } catch {
            return 0;
        }
    };
    
    // processes incoming audio from browser and detects silence
    clientWs.on('message', (data) => {
        if (clientDisconnected) {
            return;
        }
        
        try {
            const msg = JSON.parse(data.toString());

            if (msg.type === 'input_audio_buffer.append') {
                chunkCount++;
                
                if (!hasUserSpoken && calculateVolume(msg.audio) > 150) {
                    hasUserSpoken = true;
                    logger.debug('User started speaking');
                }
                
                // Simply forward audio to OpenAI - it handles turn detection via server_vad
                openAiService.sendAudio(msg.audio);
            } else if (msg.type === 'interrupt') {
                logger.debug('Client interrupt received');
                lastInterruptTime = Date.now();
                openAiService.clearInputBuffer();
            }

        } catch (err) {
            logger.error({ err }, 'Error parsing client message');
        }
    });

    // cleanup on disconnect
    clientWs.on('close', () => {
        logger.info('Web Client Disconnected');
        clientDisconnected = true;
        openAiService.clearInputBuffer();
        openAiService.close();
    });
}
