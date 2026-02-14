/**
 * Audio Worklet: Captures mic at 48kHz, outputs PCM16 24kHz for OpenAI Realtime API.
 * Runs on a separate thread to avoid blocking the main UI.
 */
let buffer48k = [];
const TARGET_SAMPLE_RATE = 24000;
const INPUT_SAMPLE_RATE = 48000;
const DOWNSAMPLE_FACTOR = INPUT_SAMPLE_RATE / TARGET_SAMPLE_RATE; // 2

function float32ToPcm16(float32Array) {
  const pcm16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return pcm16;
}

function downsample(pcm16_48k) {
  const len = Math.floor(pcm16_48k.length / DOWNSAMPLE_FACTOR);
  const out = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = pcm16_48k[i * DOWNSAMPLE_FACTOR];
  }
  return out;
}

class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frameCount = 0;
  }

  process(inputs, outputs, parameters) {
    this.frameCount++;
    
    const input = inputs[0];
    
    // Debug every 100 frames (~2 seconds at 48kHz)
    if (this.frameCount % 100 === 0) {
      this.port.postMessage({
        type: 'debug',
        data: `Frame ${this.frameCount}: inputs.length=${inputs.length}, input.length=${input?.length || 0}`
      });
    }
    
    if (input.length > 0) {
      // Handle stereo: average both channels if available
      const channel0 = input[0];
      const channel1 = input[1];
      
      if (channel0 && channel0.length > 0) {
        for (let i = 0; i < channel0.length; i++) {
          // Average stereo to mono
          const sample = channel1 ? (channel0[i] + channel1[i]) / 2 : channel0[i];
          buffer48k.push(sample);
        }
        const chunkSize = 960;
        if (buffer48k.length >= chunkSize) {
          const samples = buffer48k.splice(0, chunkSize);
          const float32 = new Float32Array(samples);
          const pcm16_48k = float32ToPcm16(float32);
          const pcm16_24k = downsample(pcm16_48k);
          // Send raw buffer, not base64 (btoa not available in worklet scope)
          this.port.postMessage({ 
            type: 'audio', 
            data: pcm16_24k.buffer 
          }, [pcm16_24k.buffer]); // Transfer buffer ownership
        }
      }
    }
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
