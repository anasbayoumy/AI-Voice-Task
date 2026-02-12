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
    let lastSpeechTime = 0;
    let hasCommitted = false;
    let silenceChunks = 0;
    let lastInterruptTime = 0;
    const SILENCE_THRESHOLD = 150;
    const SILENCE_CHUNKS_NEEDED = 55; // ~1.1s silence - reduces false commits
    const MIN_MS_SINCE_INTERRUPT = 2000; // Don't commit soon after interrupt (buffer was cleared)
    
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
                
                const volume = calculateVolume(msg.audio);
                
                if (volume > SILENCE_THRESHOLD) {
                    if (!hasUserSpoken) {
                        hasUserSpoken = true;
                        logger.debug('User started speaking');
                    }
                    lastSpeechTime = Date.now();
                    silenceChunks = 0;
                    hasCommitted = false;
                } else {
                    silenceChunks++;
                    
                    // Don't commit soon after interrupt - buffer was cleared, would cause input_audio_buffer_commit_empty
                    const msSinceInterrupt = Date.now() - lastInterruptTime;
                    const canCommit = msSinceInterrupt > MIN_MS_SINCE_INTERRUPT && !openAiService.isAIResponding();
                    
                    // Commits audio after ~1.1s of silence (no recent interrupt, AI not already responding)
                    if (silenceChunks >= SILENCE_CHUNKS_NEEDED && !hasCommitted && lastSpeechTime > 0 && hasUserSpoken && canCommit) {
                        logger.info(`Silence detected after speech (${silenceChunks} chunks, ~${(silenceChunks * 20 / 1000).toFixed(2)}s), committing audio`);
                        openAiService.commitAudio();
                        hasCommitted = true;
                        silenceChunks = 0;
                        lastSpeechTime = 0;
                    }
                }
                
                if (chunkCount % 50 === 0) {
                    logger.debug(`Received ${chunkCount} chunks, volume: ${volume.toFixed(1)}, silenceChunks: ${silenceChunks}, hasUserSpoken: ${hasUserSpoken}`);
                }
                
                openAiService.sendAudio(msg.audio);
            } else if (msg.type === 'interrupt') {
                logger.debug('Client interrupt received');
                lastInterruptTime = Date.now();
                openAiService.clearInputBuffer();
                silenceChunks = 0;
                hasCommitted = false;
                lastSpeechTime = 0;
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
