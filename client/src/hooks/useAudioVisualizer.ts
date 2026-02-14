import { useState, useEffect, useRef } from 'react';

/**
 * useAudioVisualizer - Real-time audio volume from AnalyserNode
 * Returns volume 0.0-1.0 with smoothing to reduce jitter
 */
export function useAudioVisualizer(analyser: AnalyserNode | null) {
  const [volume, setVolume] = useState(0);
  const rafRef = useRef<number>(0);
  const smoothedRef = useRef(0);

  const SMOOTHING = 0.2; // Lower = smoother but more lag

  useEffect(() => {
    if (!analyser) {
      setVolume(0);
      smoothedRef.current = 0;
      return;
    }

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.5;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const raw = sum / bufferLength / 255;
      const normalized = Math.min(1, raw * 2.5);

      smoothedRef.current =
        smoothedRef.current + (normalized - smoothedRef.current) * SMOOTHING;

      setVolume(smoothedRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [analyser]);

  return { volume };
}
