import { useState, useRef, useCallback, useEffect } from 'react';
import { VoiceAgentState, AudioConfig } from '@/types';

const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  sampleRate: 24000,
  channelCount: 1,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

export function useVoiceAgent(serverUrl: string = 'ws://localhost:2050') {
  const [state, setState] = useState<VoiceAgentState>({
    mode: 'idle',
    isConnected: false,
    isMuted: false,
    error: null,
    sessionId: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isCleaningUpRef = useRef(false);
  const isConnectingRef = useRef(false);

  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  // Initialize audio context and analyser for visualization
  const initAudioContext = useCallback(async () => {
    // If we have a valid AudioContext, reuse it
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      // Ensure analyser exists (e.g. after reconnect)
      if (!analyserRef.current) {
        const ctx = audioContextRef.current;
        const analyserNode = ctx.createAnalyser();
        analyserNode.fftSize = 256;
        analyserNode.connect(ctx.destination);
        analyserRef.current = analyserNode;
        setAnalyser(analyserNode);
      }
      return;
    }

    // Create AudioContext - use default sample rate (browser may not support 24kHz)
    audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    // Create analyser for playback visualization (source -> analyser -> destination)
    const ctx = audioContextRef.current;
    const analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 256;
    analyserNode.connect(ctx.destination);
    analyserRef.current = analyserNode;
    setAnalyser(analyserNode);
  }, []);

  // Unlock AudioContext for playback - Chrome requires this on user gesture
  const unlockAudioForPlayback = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;
    try {
      const buffer = audioContextRef.current.createBuffer(1, 1, 22050);
      buffer.getChannelData(0)[0] = 0;
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.start(0);
      console.log('🔓 [AUDIO] Playback unlocked (silent buffer played)');
    } catch (e) {
      console.warn('🔓 [AUDIO] Unlock failed:', e);
    }
  }, []);

  // Audio processing: Float32 to PCM16 conversion
  const float32ToPCM16 = useCallback((float32Array: Float32Array): ArrayBuffer => {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm16.buffer;
  }, []);

  // Resample audio from source rate to target rate (24kHz)
  const resampleAudio = useCallback((
    audioData: Float32Array,
    sourceRate: number,
    targetRate: number = 24000
  ): Float32Array => {
    if (sourceRate === targetRate) return audioData;

    const ratio = sourceRate / targetRate;
    const newLength = Math.round(audioData.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio;
      const srcIndexInt = Math.floor(srcIndex);
      const t = srcIndex - srcIndexInt;

      const sample1 = audioData[srcIndexInt] || 0;
      const sample2 = audioData[srcIndexInt + 1] || 0;
      
      // Linear interpolation
      result[i] = sample1 + (sample2 - sample1) * t;
    }

    return result;
  }, []);

  // Start capturing audio from microphone
  const startAudioCapture = useCallback(async () => {
    console.log('🎤 [CAPTURE] Starting audio capture...');
    
    try {
      await initAudioContext();

      // Check if AudioContext is valid before proceeding
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        console.error('❌ [CAPTURE] AudioContext is not available, state:', audioContextRef.current?.state);
        return;
      }

      console.log('✅ [CAPTURE] AudioContext is ready, state:', audioContextRef.current.state);
      console.log('🎤 [CAPTURE] Requesting microphone access...');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: { ideal: 48000 },
          channelCount: DEFAULT_AUDIO_CONFIG.channelCount,
          echoCancellation: DEFAULT_AUDIO_CONFIG.echoCancellation,
          noiseSuppression: DEFAULT_AUDIO_CONFIG.noiseSuppression,
          autoGainControl: DEFAULT_AUDIO_CONFIG.autoGainControl,
        },
      });

      console.log('✅ [CAPTURE] Microphone access granted');
      streamRef.current = stream;

      const source = audioContextRef.current!.createMediaStreamSource(stream);
      const processor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
      const gainNode = audioContextRef.current!.createGain();
      gainNode.gain.value = 0; // Mute mic output (capture only, no feedback)

      source.connect(processor);
      processor.connect(gainNode);
      gainNode.connect(audioContextRef.current!.destination);

      let audioChunkCount = 0;

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || state.isMuted) {
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);
        const sourceRate = audioContextRef.current!.sampleRate;
        
        // Resample to 24kHz
        const resampled = resampleAudio(inputData, sourceRate, 24000);
        
        // Convert to PCM16
        const pcm16Buffer = float32ToPCM16(resampled);
        
        // Encode to base64
        const base64 = btoa(
          String.fromCharCode(...new Uint8Array(pcm16Buffer))
        );

        // Send to server
        wsRef.current.send(JSON.stringify({
          type: 'audio',
          data: base64,
        }));

        audioChunkCount++;
        if (audioChunkCount % 50 === 0) {
          console.log(`📤 [CAPTURE] Sent ${audioChunkCount} audio chunks`);
        }
      };

      processorRef.current = processor;

      console.log('✅ [CAPTURE] Audio capture started successfully');
      setState((prev) => ({ ...prev, mode: 'listening' }));
    } catch (error) {
      console.error('❌ [CAPTURE] Error starting audio capture:', error);
      setState((prev) => ({
        ...prev,
        error: 'Failed to access microphone',
      }));
    }
  }, [initAudioContext, float32ToPCM16, resampleAudio, state.isMuted]);

  // Stop audio capture
  const stopAudioCapture = useCallback(() => {
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch (_) {}
      processorRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setState((prev) => ({ ...prev, mode: 'idle' }));
  }, []);

  // Play audio received from server
  const playAudio = useCallback(async (base64Data: string) => {
    console.log('🔊 [PLAYBACK] Received audio to play, length:', base64Data.length);
    
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      console.log('🔊 [PLAYBACK] AudioContext not ready, initializing...');
      await initAudioContext();
    }

    // Double-check AudioContext is valid
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      console.error('❌ [PLAYBACK] Cannot play audio: AudioContext is closed');
      return;
    }

    try {
      // Decode base64 to PCM16
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const pcm16 = new Int16Array(bytes.buffer);
      
      // Convert PCM16 to Float32
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7fff);
      }

      audioQueueRef.current.push(float32);
      console.log('✅ [PLAYBACK] Audio queued, queue length:', audioQueueRef.current.length);

      // Start playback if not already playing
      if (!isPlayingRef.current) {
        console.log('🔊 [PLAYBACK] Starting playback...');
        playNextChunk();
      }
    } catch (error) {
      console.error('❌ [PLAYBACK] Error playing audio:', error);
    }
  }, [initAudioContext]);

  // Play next audio chunk from queue
  const playNextChunk = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setState((prev) => ({ ...prev, mode: 'listening' }));
      return;
    }

    const MIN_SAMPLES = 1200; // ~50ms at 24kHz
    let totalSamples = 0;
    const chunks: Float32Array[] = [];

    // Accumulate chunks
    while (audioQueueRef.current.length > 0 && totalSamples < MIN_SAMPLES) {
      const chunk = audioQueueRef.current.shift()!;
      chunks.push(chunk);
      totalSamples += chunk.length;
    }

    if (totalSamples === 0) {
      isPlayingRef.current = false;
      setState((prev) => ({ ...prev, mode: 'listening' }));
      return;
    }

    // Check AudioContext
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      isPlayingRef.current = false;
      return;
    }

    // Concatenate chunks
    const concatenated = new Float32Array(totalSamples);
    let offset = 0;
    for (const chunk of chunks) {
      concatenated.set(chunk, offset);
      offset += chunk.length;
    }

    // Create audio buffer and play
    const audioBuffer = audioContextRef.current.createBuffer(
      1,
      concatenated.length,
      24000
    );
    audioBuffer.getChannelData(0).set(concatenated);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    // Route through analyser for visualization (analyser already connected to destination)
    const outNode = analyserRef.current ?? audioContextRef.current.destination;
    source.connect(outNode);

    currentSourceRef.current = source;
    isPlayingRef.current = true;
    setState((prev) => ({ ...prev, mode: 'speaking' }));

    source.onended = () => {
      currentSourceRef.current = null;
      playNextChunk();
    };

    source.start(0);
  }, []);

  // Clear playback (for barge-in)
  const clearPlayback = useCallback(() => {
    audioQueueRef.current = [];
    
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop(0);
      } catch (e) {
        // Ignore if already stopped
      }
      currentSourceRef.current.onended = null;
      currentSourceRef.current.disconnect();
      currentSourceRef.current = null;
    }

    isPlayingRef.current = false;
    
    if (state.isConnected) {
      setState((prev) => ({ ...prev, mode: 'listening' }));
    }
  }, [state.isConnected]);

  // Connect to WebSocket
  const connect = useCallback(async (voice: string = 'alloy') => {
    console.log('🎤 [CONNECT] Starting connection with voice:', voice);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('⚠️ [CONNECT] Already connected, skipping');
      return;
    }

    // Prevent cleanup while connecting
    isConnectingRef.current = true;

    try {
      console.log('🔊 [AUDIO] Initializing AudioContext...');
      await initAudioContext();
      console.log('✅ [AUDIO] AudioContext initialized, state:', audioContextRef.current?.state);

      // Get API key from environment
      const apiKey = import.meta.env.VITE_API_KEY;
      const params = new URLSearchParams({ voice });
      
      // Add token to query string if API key is configured
      if (apiKey) {
        params.append('token', apiKey);
      }
      
      const url = `${serverUrl}/voice/stream?${params.toString()}`;
      console.log('🔌 [WS] Connecting to:', url.replace(/token=[^&]+/, 'token=***'));

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log('✅ [WS] WebSocket connection opened');
        console.log('📤 [WS] Sending start message');
        ws.send(JSON.stringify({ type: 'start', clientType: 'voice' }));
        setState((prev) => ({ ...prev, isConnected: true, error: null }));
        
        // Unlock AudioContext for playback (Chrome autoplay policy)
        unlockAudioForPlayback();
        
        console.log('🎤 [AUDIO] Starting audio capture...');
        await startAudioCapture();
        isConnectingRef.current = false; // Connection complete
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📥 [WS] Received message:', data.type, data.sessionId ? `sessionId: ${data.sessionId}` : '');

          if (data.type === 'session') {
            console.log('✅ [SESSION] Session created:', data.sessionId);
            setState((prev) => ({ ...prev, sessionId: data.sessionId }));
          } else if (data.type === 'audio' && data.data) {
            console.log('🔊 [AUDIO] Received audio chunk, length:', data.data.length);
            playAudio(data.data);
          } else if (data.type === 'clear') {
            console.log('🛑 [AUDIO] Clear playback (barge-in)');
            clearPlayback();
          } else if (data.type === 'error') {
            console.error('❌ [SERVER] Error:', data.message);
            setState((prev) => ({ ...prev, error: data.message }));
          } else if (data.type === 'test') {
            console.log('🧪 [TEST] Test mode message:', data.message);
          }
        } catch (error) {
          console.error('❌ [WS] Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ [WS] WebSocket error:', error);
        isConnectingRef.current = false;
        setState((prev) => ({
          ...prev,
          error: 'Connection error',
        }));
      };

      ws.onclose = () => {
        console.log('🔌 [WS] Disconnected from voice server');
        isConnectingRef.current = false;
        setState((prev) => ({
          ...prev,
          isConnected: false,
          mode: 'idle',
        }));
        stopAudioCapture();
        clearPlayback();
      };
    } catch (error) {
      console.error('❌ [CONNECT] Error connecting:', error);
      isConnectingRef.current = false;
      setState((prev) => ({
        ...prev,
        error: 'Failed to connect',
      }));
    }
  }, [serverUrl, initAudioContext, unlockAudioForPlayback, startAudioCapture, stopAudioCapture, playAudio, clearPlayback]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    isCleaningUpRef.current = true;
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopAudioCapture();
    clearPlayback();
    
    isCleaningUpRef.current = false;
  }, [stopAudioCapture, clearPlayback]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setState((prev) => {
      const newMuted = !prev.isMuted;
      streamRef.current?.getAudioTracks().forEach((track) => {
        track.enabled = !newMuted;
      });
      return { ...prev, isMuted: newMuted };
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    let isMounted = true;
    
    return () => {
      isMounted = false;
      
      // Don't cleanup if we're in the middle of connecting
      if (isConnectingRef.current) {
        console.log('⚠️ [CLEANUP] Skipping cleanup - connection in progress');
        return;
      }
      
      isCleaningUpRef.current = true;
      console.log('🧹 [CLEANUP] Component unmounting, cleaning up...');
      disconnect();
      
      // Close AudioContext after a delay to avoid race conditions
      setTimeout(() => {
        if (!isMounted && !isConnectingRef.current && audioContextRef.current && audioContextRef.current.state !== 'closed') {
          console.log('🧹 [CLEANUP] Closing AudioContext');
          audioContextRef.current.close().catch(() => {
            // Ignore if already closed
          });
        }
      }, 100);
    };
  }, [disconnect]);

  return {
    state,
    connect,
    disconnect,
    toggleMute,
    analyser,
  };
}
