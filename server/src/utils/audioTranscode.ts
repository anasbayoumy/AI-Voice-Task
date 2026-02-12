const MULAW_BIAS = 0x84;
const MULAW_CLIP = 32635;

const MULAW_DECODE_TABLE = new Int16Array(256);
for (let i = 0; i < 256; i++) {
  const mulaw = ~i;
  const sign = (mulaw & 0x80) ? -1 : 1;
  const exponent = (mulaw >> 4) & 0x07;
  const mantissa = mulaw & 0x0f;
  const sample = sign * (((mantissa << 3) + MULAW_BIAS) << exponent) - MULAW_BIAS;
  MULAW_DECODE_TABLE[i] = sample;
}

// decodes mulaw bytes to pcm16 samples
function mulawToPcm16(mulawBuffer: Uint8Array): Int16Array {
  const pcm = new Int16Array(mulawBuffer.length);
  for (let i = 0; i < mulawBuffer.length; i++) {
    pcm[i] = MULAW_DECODE_TABLE[mulawBuffer[i]!]!;
  }
  return pcm;
}

// encodes pcm16 sample to mulaw byte
function pcm16ToMulaw(sample: number): number {
  const sign = sample < 0 ? 0x80 : 0;
  if (sample < 0) sample = -sample;
  if (sample > MULAW_CLIP) sample = MULAW_CLIP;
  sample += MULAW_BIAS;

  let exponent = 7;
  for (let expMask = 0x4000; (sample & expMask) === 0 && exponent > 0; exponent--, expMask >>= 1) {}
  const mantissa = (sample >> (exponent + 3)) & 0x0f;
  return ~(sign | (exponent << 4) | mantissa) & 0xff;
}

// resamples pcm16 from 8khz to 24khz using linear interpolation
function resampleUp(pcm8k: Int16Array): Int16Array {
  const len = pcm8k.length * 3;
  const out = new Int16Array(len);
  for (let i = 0; i < pcm8k.length - 1; i++) {
    const a = pcm8k[i]!;
    const b = pcm8k[i + 1]!;
    out[i * 3] = a;
    out[i * 3 + 1] = Math.round((2 * a + b) / 3);
    out[i * 3 + 2] = Math.round((a + 2 * b) / 3);
  }
  out[(pcm8k.length - 1) * 3] = pcm8k[pcm8k.length - 1]!;
  return out;
}

// resamples pcm16 from 24khz to 8khz by taking every 3rd sample
function resampleDown(pcm24k: Int16Array): Int16Array {
  const len = Math.floor(pcm24k.length / 3);
  const out = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = pcm24k[i * 3]!;
  }
  return out;
}

// converts twilio audio (8khz mulaw) to openai format (24khz pcm16)
export function twilioToOpenAI(base64Mulaw: string): string {
  const raw = Buffer.from(base64Mulaw, 'base64');
  const mulaw = new Uint8Array(raw);
  const pcm8k = mulawToPcm16(mulaw);
  const pcm24k = resampleUp(pcm8k);
  return Buffer.from(pcm24k.buffer).toString('base64');
}

// converts openai audio (24khz pcm16) to twilio format (8khz mulaw)
export function openAIToTwilio(base64Pcm: string): string {
  const raw = Buffer.from(base64Pcm, 'base64');
  const pcm24k = new Int16Array(raw.length / 2);
  for (let i = 0; i < pcm24k.length; i++) {
    pcm24k[i] = raw.readInt16LE(i * 2);
  }
  const pcm8k = resampleDown(pcm24k);
  const mulaw = new Uint8Array(pcm8k.length);
  for (let i = 0; i < pcm8k.length; i++) {
    mulaw[i] = pcm16ToMulaw(pcm8k[i]!);
  }
  return Buffer.from(mulaw).toString('base64');
}
