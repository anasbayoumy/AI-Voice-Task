#!/usr/bin/env node

/**
 * Quick WebSocket test script to verify /web endpoint without spending OpenAI credits.
 * Tests: connection, sending audio, receiving mock response.
 */

import WebSocket from 'ws';

const WS_URL = process.env.WS_URL || 'ws://localhost:8080/web';

console.log(`Connecting to ${WS_URL}...`);

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ Connected to server');
  
  // Send a fake audio chunk (base64-encoded)
  const fakeAudio = Buffer.from('Test audio data').toString('base64');
  console.log('📤 Sending fake audio chunk...');
  
  ws.send(JSON.stringify({
    type: 'input_audio_buffer.append',
    audio: fakeAudio,
  }));
  
  // Test interrupt
  setTimeout(() => {
    console.log('📤 Sending interrupt...');
    ws.send(JSON.stringify({ type: 'interrupt' }));
  }, 500);
});

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    console.log('📥 Received from server:', JSON.stringify(msg, null, 2));
  } catch (e) {
    console.log('📥 Raw message:', data.toString());
  }
});

ws.on('error', (err) => {
  console.error('❌ WebSocket error:', err.message);
});

ws.on('close', () => {
  console.log('🔌 Connection closed');
  process.exit(0);
});

setTimeout(() => {
  console.log('⏱️  Test complete, closing...');
  ws.close();
}, 2000);
