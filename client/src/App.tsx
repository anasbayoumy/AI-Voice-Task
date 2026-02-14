import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GeminiOrb } from './components/GeminiOrb';
import { ControlBar } from './components/ControlBar';
import { useVoiceAgent } from './hooks/useVoiceAgent';
import { useAudioVisualizer } from './hooks/useAudioVisualizer';

// Voice options
const VOICE_OPTIONS = [
  { id: 'alloy', label: 'Alloy', description: 'Neutral & Balanced' },
  { id: 'echo', label: 'Echo', description: 'Clear & Professional' },
  { id: 'fable', label: 'Fable', description: 'British Accent' },
  { id: 'onyx', label: 'Onyx', description: 'Deep & Masculine' },
  { id: 'nova', label: 'Nova', description: 'Warm & Friendly' },
  { id: 'shimmer', label: 'Shimmer', description: 'Bright & Energetic' },
  { id: 'coral', label: 'Coral', description: 'Expressive & Warm' },
  { id: 'sage', label: 'Sage', description: 'Calm & Professional' },
];

function App() {
  const [selectedVoice, setSelectedVoice] = useState('coral');
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  
  const { state, connect, disconnect, toggleMute, analyser } = useVoiceAgent(
    import.meta.env.VITE_API_URL || 'ws://localhost:2050'
  );
  const { volume } = useAudioVisualizer(analyser);

  const handleToggleConnection = async () => {
    if (state.isConnected) {
      disconnect();
    } else {
      await connect(selectedVoice);
      setShowVoiceSelector(false);
    }
  };

  const handleVoiceSelect = (voice: string) => {
    setSelectedVoice(voice);
    setShowVoiceSelector(false);
  };

  const getStatusText = () => {
    if (!state.isConnected) return 'Click to begin';
    if (state.mode === 'idle') return 'Ready to Connect';
    if (state.mode === 'listening') return 'Listening...';
    if (state.mode === 'processing') return 'Processing...';
    if (state.mode === 'speaking') return 'AI Speaking';
    return '';
  };

  // Safe area for fixed ControlBar: bar ~80px tall + bottom offset ~32px = ~112px
  const CONTROL_BAR_SAFE = 120;

  return (
    <div className="relative min-h-[100dvh] min-h-screen w-full overflow-hidden bg-gemini-bg">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-gemini-bg via-[#0E0E0E] to-[#1a1a2e] opacity-50" />

      {/* Main container - strict flex column centered, no overflow. 100dvh fixes mobile Safari address bar */}
      <div className="relative z-10 flex flex-col min-h-[100dvh] min-h-screen w-full">
        {/* Header - responsive */}
        <motion.header
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-6xl mx-auto px-4 sm:px-8 pt-6 sm:pt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="shrink-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-white/90 tracking-tight">
              Biami Voice Agent
            </h1>
            <p className="text-xs sm:text-sm text-white/50 mt-1">
              Real-time AI Conversation
            </p>
          </div>

          {!state.isConnected && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowVoiceSelector(!showVoiceSelector)}
              className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <span className="text-sm text-white/70">
                Voice: <span className="text-white font-medium capitalize">{selectedVoice}</span>
              </span>
            </motion.button>
          )}
        </motion.header>

        {/* Voice selector dropdown */}
        <AnimatePresence>
          {showVoiceSelector && !state.isConnected && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute top-20 sm:top-24 right-4 sm:right-8 left-4 sm:left-auto z-50 sm:w-auto max-w-[calc(100vw-2rem)]"
            >
              <div className="bg-gemini-surface/95 backdrop-blur-xl glass-backdrop rounded-2xl border border-white/10 shadow-2xl overflow-hidden min-w-[240px]">
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="text-xs text-white/50 uppercase tracking-wider font-medium">Select AI Voice</p>
                </div>
                {VOICE_OPTIONS.map((voice, index) => (
                  <motion.button
                    key={voice.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => handleVoiceSelect(voice.id)}
                    className={`w-full px-4 py-3 text-left transition-colors ${
                      selectedVoice === voice.id
                        ? 'bg-gemini-blue/20 text-white'
                        : 'text-white/70 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{voice.label}</p>
                        <p className="text-xs text-white/50 mt-0.5">{voice.description}</p>
                      </div>
                      {selectedVoice === voice.id && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-2 h-2 rounded-full bg-gemini-blue"
                        />
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center block: Orb + Status - flex-1 to fill space, centered */}
        <div
          className="flex-1 flex flex-col items-center justify-center w-full px-4 sm:px-8"
          style={{ paddingBottom: CONTROL_BAR_SAFE }}
        >
          <div className="flex flex-col items-center justify-center gap-6 w-full max-w-2xl">
            <div className="w-full max-w-[min(400px,85vw)] aspect-square flex items-center justify-center">
              <GeminiOrb mode={state.mode} volume={volume} />
            </div>
            <p className="text-xs uppercase tracking-widest text-white/50 text-center">
              {getStatusText()}
            </p>
          </div>
        </div>

        {/* Error display */}
        <AnimatePresence>
          {state.error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-50"
            >
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-6 py-3 backdrop-blur-xl">
                <p className="text-red-400 text-sm font-medium">{state.error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Control bar - fixed bottom-8 left-1/2 -translate-x-1/2 (handled by ControlBar) */}
        <ControlBar
          isConnected={state.isConnected}
          isMuted={state.isMuted}
          onToggleConnection={handleToggleConnection}
          onToggleMute={toggleMute}
        />
      </div>

      {/* Ambient light effect */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full will-change-transform"
          style={{
            background: 'radial-gradient(circle, rgba(66,133,244,0.1) 0%, transparent 70%)',
            filter: 'blur(100px)',
            WebkitFilter: 'blur(100px)',
            transform: 'translateZ(0)',
          }}
          animate={{
            scale: state.isConnected ? [1, 1.2, 1] : 1,
            opacity: state.isConnected ? [0.3, 0.5, 0.3] : 0.2,
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
    </div>
  );
}

export default App;
