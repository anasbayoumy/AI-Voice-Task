import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '2050', 10),
  host: '0.0.0.0',
  
  auth: {
    apiKey: process.env.API_KEY || 'biami_default_key_change_me',
    required: process.env.AUTH_REQUIRED !== 'false' // true by default
  },

  database: {
    url: process.env.DATABASE_URL || 'postgresql://biami:biami_secure_pass@localhost:5432/biami',
    poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10)
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-realtime-preview',
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.8'),
    voice: 'alloy',
    systemMessage: process.env.SYSTEM_MESSAGE || 'You are Marcin, CEO of Biami.io, a friendly AI voice assistant. Always say who you are at the first of the conversation.Discuss business automation, hiring, and Biami features naturally and concisely (1-3 sentences). Always speak in English.',
    
    // Test mode - skip OpenAI calls to save money during testing
    testMode: process.env.TEST_MODE === 'true',
    
    // Enhanced VAD configuration - OpenAI handles ALL voice activity detection
    vad: {
      type: process.env.VAD_TYPE || 'server_vad' as 'server_vad' | 'semantic_vad',
      
      // Server VAD settings (for noise/silence detection)
      threshold: parseFloat(process.env.VAD_THRESHOLD || '0.5'), // 0-1, higher = less sensitive (better for noisy environments)
      silenceDurationMs: parseInt(process.env.VAD_SILENCE_MS || '700', 10), // shorter = faster turn detection
      prefixPaddingMs: parseInt(process.env.VAD_PREFIX_MS || '300', 10), // capture start of speech
      
      // Semantic VAD settings (alternative mode)
      eagerness: (process.env.VAD_EAGERNESS || 'medium') as 'low' | 'medium' | 'high' | 'auto'
    },

    // Barge-in: allow user to interrupt AI mid-response
    bargeInEnabled: process.env.BARGE_IN_ENABLED !== 'false', // true = allow barge-in
    bargeInMinDurationMs: parseInt(process.env.BARGE_IN_MIN_DURATION_MS || '1000', 10), // Only barge-in after user speaks this long (filters noise). 0 = immediate
  },

  logging: {
    showTimingMath: process.env.SHOW_TIMING_MATH === 'true',
    eventTypes: [
      'error',
      'response.output_audio.delta',
      'response.content.done',
      'rate_limits.updated',
      'response.done',
      'input_audio_buffer.committed',
      'input_audio_buffer.speech_stopped',
      'input_audio_buffer.speech_started',
      'session.created',
      'session.updated'
    ]
  },

  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
  }
};

// Validate required configuration
if (!config.openai.apiKey && !config.openai.testMode) {
  console.error('Missing OpenAI API key. Please set OPENAI_API_KEY in the .env file or enable TEST_MODE=true.');
  process.exit(1);
}

// Log configuration on startup
if (config.openai.testMode) {
  console.log('⚠️  TEST MODE ENABLED - OpenAI calls will be mocked (no API charges)');
  console.log('   Set TEST_MODE=false to use real OpenAI API');
  console.log(`🗣️ Barge-in: ${config.openai.bargeInEnabled ? `enabled (${config.openai.bargeInMinDurationMs}ms gate)` : 'disabled'}`);
} else {
  // Log VAD configuration on startup
  console.log('🎙️ Voice Activity Detection (VAD) Configuration:');
  console.log(`   Type: ${config.openai.vad.type}`);
  if (config.openai.vad.type === 'server_vad') {
    console.log(`   Threshold: ${config.openai.vad.threshold} (higher = less sensitive to noise)`);
    console.log(`   Silence Duration: ${config.openai.vad.silenceDurationMs}ms (shorter = faster responses)`);
    console.log(`   Prefix Padding: ${config.openai.vad.prefixPaddingMs}ms`);
  } else {
    console.log(`   Eagerness: ${config.openai.vad.eagerness}`);
  }
  console.log('   → OpenAI handles ALL noise detection, pauses, and turn-taking');
  console.log(`🗣️ Barge-in: ${config.openai.bargeInEnabled ? `enabled (${config.openai.bargeInMinDurationMs}ms gate)` : 'disabled'}`);
}
