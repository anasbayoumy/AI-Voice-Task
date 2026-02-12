import { useState, useCallback, useRef } from 'react';

const base = import.meta.env.VITE_WS_URL ?? import.meta.env.VITE_API_URL ?? 'ws://localhost:8080';
const baseUrl = base.endsWith('/web') ? base : `${String(base).replace(/\/$/, '')}/web`;

const apiKey = import.meta.env.VITE_API_KEY;
const WS_URL = apiKey ? `${baseUrl}?token=${encodeURIComponent(apiKey)}` : baseUrl;

const BARGE_IN_VOLUME_THRESHOLD = 300;
const VERBOSE_VOLUME_LOGGING = false;

// calculates rms volume from base64 pcm16 audio
function getVolumeFromBase64Pcm(base64: string): number {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const pcm16 = new Int16Array(bytes.buffer, 0, bytes.length / 2);
  let sum = 0;
  for (let i = 0; i < pcm16.length; i++) {
    const s = pcm16[i] ?? 0;
    sum += s * s;
  }
  return Math.sqrt(sum / pcm16.length);
}

export function useVoiceAgent() {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const connectionTimeRef = useRef<number>(0);

  // stops audio playback and clears queue
  const clearAudioQueue = useCallback(() => {
    audioQueueRef.current = [];
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch {}
      currentSourceRef.current = null;
    }
    isPlayingRef.current = false;
  }, []);

  // plays audio chunk and queues next chunk when finished
  const playAudioChunk = useCallback((base64Pcm: string) => {
    const audioContext = audioContextRef.current;
    if (!audioContext) {
      console.error('❌ No AudioContext available');
      return;
    }

    if (audioContext.state === 'suspended') {
      console.log('⚠️ AudioContext suspended, resuming...');
      audioContext.resume().then(() => {
        console.log('✅ AudioContext resumed');
        playAudioChunk(base64Pcm);
      }).catch(err => console.error('Failed to resume AudioContext:', err));
      return;
    }

    try {
      const binary = atob(base64Pcm);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const pcm16 = new Int16Array(bytes.buffer, 0, bytes.length / 2);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i]! / 32768;
      }

      const buffer = audioContext.createBuffer(1, float32.length, 24000);
      buffer.copyToChannel(float32, 0, 0);

      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      currentSourceRef.current = source;
      
      // plays next chunk when current finishes
      source.onended = () => {
        currentSourceRef.current = null;
        const next = audioQueueRef.current.shift();
        if (next) {
          playAudioChunk(next);
        } else {
          setTimeout(() => {
            isPlayingRef.current = false;
          }, 600);
        }
      };
      
      isPlayingRef.current = true;
      source.start(0);
    } catch (err) {
      console.error('Playback error:', err);
      isPlayingRef.current = false;
    }
  }, []);

  // establishes mic access, websocket connection, and audio pipeline
  const connect = useCallback(async () => {
    console.log('🔌 Starting voice agent connection...');
    setStatus('connecting');
    setError(null);

    try {
      console.log('🎤 Requesting microphone access with echo cancellation...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
        }
      });
      streamRef.current = stream;
      console.log('✅ Microphone access granted with AEC enabled');

      console.log('🔊 Creating AudioContext @ 48kHz...');
      const audioContext = new AudioContext({ sampleRate: 48000 });
      audioContextRef.current = audioContext;
      await audioContext.resume();
      console.log('✅ AudioContext created, state:', audioContext.state);

      console.log('📦 Loading AudioWorklet...');
      await audioContext.audioWorklet.addModule('/AudioProcessor.js');
      const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
      workletNodeRef.current = workletNode;
      console.log('✅ AudioWorklet loaded');

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(workletNode);
      console.log('✅ Microphone connected to worklet (no monitoring)');

      console.log('🌐 Connecting to WebSocket:', WS_URL);
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      // processes mic audio chunks and handles barge-in detection
      workletNode.port.onmessage = (e: MessageEvent) => {
        if (e.data?.type === 'audio' && e.data?.data && ws.readyState === WebSocket.OPEN) {
          const arrayBuffer = e.data.data as ArrayBuffer;
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const audioBase64 = btoa(binary);
          
          const volume = getVolumeFromBase64Pcm(audioBase64);
          
          // prevents echoing test beep or startup noise
          const timeSinceConnection = Date.now() - connectionTimeRef.current;
          if (timeSinceConnection < 2000) {
            if (VERBOSE_VOLUME_LOGGING) {
              console.log('🔇 Ignoring mic during initialization period');
            }
            return;
          }
          
          if (VERBOSE_VOLUME_LOGGING) {
            console.log('🎤 Mic audio, volume:', volume.toFixed(2), 'threshold:', BARGE_IN_VOLUME_THRESHOLD);
          }
          
          const isAIPlaying = isPlayingRef.current || audioQueueRef.current.length > 0;
          
          // interrupts ai when user speaks loudly during ai speech
          if (volume > BARGE_IN_VOLUME_THRESHOLD && isAIPlaying) {
            console.log('🚫 BARGE-IN triggered! Clearing queue and interrupting...');
            clearAudioQueue();
            ws.send(JSON.stringify({ type: 'interrupt' }));
          }
          
          // sends mic audio only when ai is silent or user is loud enough
          if (!isAIPlaying || volume > BARGE_IN_VOLUME_THRESHOLD) {
            ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: audioBase64 }));
          }
        }
      };

      ws.onopen = () => {
        console.log('✅ WebSocket connected to:', WS_URL);
        setStatus('connected');
        connectionTimeRef.current = Date.now();
        console.log('✅ Ready - speak to begin conversation');
      };

      // receives ai audio and queues for playback
      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string);
          if (msg.type === 'session.ready') {
            setTestMode(msg.testMode === true);
            return;
          }
          if (msg.type === 'audio' && msg.payload) {
            if (isPlayingRef.current) {
              audioQueueRef.current.push(msg.payload);
            } else {
              playAudioChunk(msg.payload);
            }
          }
        } catch {}
      };

      ws.onerror = () => {
        setError('WebSocket error');
        setStatus('error');
      };

      ws.onclose = () => {
        setStatus('idle');
        workletNode.disconnect();
        stream.getTracks().forEach((t) => t.stop());
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect';
      setError(message);
      setStatus('error');
    }
  }, [playAudioChunk, clearAudioQueue]);

  // closes websocket and stops microphone
  const disconnect = useCallback(() => {
    setTestMode(false);
    clearAudioQueue();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    audioContextRef.current?.close();
    setStatus('idle');
  }, [clearAudioQueue]);

  return { status, error, testMode, connect, disconnect };
}
