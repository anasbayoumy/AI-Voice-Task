import { motion } from 'framer-motion';
import { VoiceAgentMode } from '@/types';

interface GeminiOrbProps {
  mode: VoiceAgentMode;
  volume?: number; // 0-1, from audio analyser when AI is speaking
}

export function GeminiOrb({ mode, volume = 0 }: GeminiOrbProps) {
  // Scale from volume: loud = big orb, silence = small. Formula: 1 + (volume * 0.8)
  const speakingScale = 1 + volume * 0.8;

  const getAnimationVariants = () => {
    switch (mode) {
      case 'idle':
        return {
          scale: [1, 1.05, 1],
          rotate: 0,
          transition: {
            scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' as const },
          },
        };

      case 'listening':
        return {
          scale: [1, 1.1, 1],
          opacity: [0.5, 0.8, 0.5],
          transition: {
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut' as const,
          },
        };

      case 'processing':
        return {
          scale: [1, 0.95, 1.05, 1],
          rotate: 360,
          transition: {
            scale: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' as const },
            rotate: { duration: 2, repeat: Infinity, ease: 'linear' as const },
          },
        };

      case 'speaking':
        // No loop - scale driven by volume prop
        return null;

      default:
        return {};
    }
  };

  const variants = getAnimationVariants();
  const isSpeaking = mode === 'speaking';

  return (
    <div className="relative flex items-center justify-center w-full h-full min-w-[200px] min-h-[200px]">
      {/* Main orb container - responsive: 100% of parent */}
      <div className="relative w-full h-full max-w-[400px] max-h-[400px] flex items-center justify-center">
        
        {/* Background glow layer 1 - Blue - % of container */}
        <motion.div
          className="absolute w-[70%] h-[70%] rounded-full blur-3xl sm:blur-[64px]"
          style={{
            background: 'radial-gradient(circle, #4285F4 0%, transparent 70%)',
            mixBlendMode: 'screen',
          }}
          animate={isSpeaking ? { scale: speakingScale } : variants ?? {}}
          transition={isSpeaking ? { type: 'spring', stiffness: 300, damping: 20 } : undefined}
        />

        {/* Background glow layer 2 - Red */}
        <motion.div
          className="absolute w-[65%] h-[65%] rounded-full blur-3xl sm:blur-[64px]"
          style={{
            background: 'radial-gradient(circle, #FF5252 0%, transparent 70%)',
            mixBlendMode: 'screen',
            opacity: mode === 'speaking' ? 0.9 : 0.7,
          }}
          animate={isSpeaking ? { scale: speakingScale } : variants ?? {}}
          transition={isSpeaking ? { type: 'spring', stiffness: 300, damping: 20 } : undefined}
        />

        {/* Background glow layer 3 - Cyan accent */}
        <motion.div
          className="absolute w-[60%] h-[60%] rounded-full blur-3xl sm:blur-[64px]"
          style={{
            background: 'radial-gradient(circle, #00E5FF 0%, transparent 70%)',
            mixBlendMode: 'lighten',
            opacity: mode === 'listening' ? 0.95 : 0.6,
          }}
          animate={
            isSpeaking
              ? { scale: speakingScale }
              : mode === 'listening'
                ? { scale: [1, 1.15, 1.05], opacity: [0.5, 0.9, 0.5] }
                : { scale: [1, 1.1, 1] }
          }
          transition={
            isSpeaking
              ? { type: 'spring', stiffness: 300, damping: 20 }
              : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
          }
        />

        {/* Core orb - subtle glass effect */}
        <motion.div
          className="absolute w-[50%] h-[50%] rounded-full"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, rgba(66,133,244,0.2) 50%, transparent 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: mode === 'speaking'
              ? '0 0 80px rgba(66,133,244,0.6), inset 0 0 40px rgba(255,255,255,0.1)'
              : '0 0 60px rgba(66,133,244,0.4), inset 0 0 30px rgba(255,255,255,0.05)',
          }}
          animate={isSpeaking ? { scale: speakingScale } : variants ?? {}}
          transition={isSpeaking ? { type: 'spring', stiffness: 300, damping: 20 } : undefined}
        />

        {/* Particle effect for processing state */}
        {mode === 'processing' && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full bg-gemini-cyan"
                style={{
                  filter: 'blur(2px)',
                }}
                animate={{
                  x: [0, Math.cos((i * 60 * Math.PI) / 180) * 150],
                  y: [0, Math.sin((i * 60 * Math.PI) / 180) * 150],
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: 'easeOut',
                }}
              />
            ))}
          </>
        )}

        {/* Listening mode wave rings */}
        {mode === 'listening' && (
          <>
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={`ring-${i}`}
                className="absolute w-[75%] h-[75%] rounded-full border-2 border-gemini-blue"
                style={{
                  filter: 'blur(1px)',
                }}
                animate={{
                  scale: [1, 1.4, 1.4],
                  opacity: [0.6, 0, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: 'easeOut',
                }}
              />
            ))}
          </>
        )}
      </div>

    </div>
  );
}
