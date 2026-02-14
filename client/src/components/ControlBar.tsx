import { motion } from 'framer-motion';
import { Mic, MicOff, PhoneOff, Phone, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ControlBarProps {
  isConnected: boolean;
  isMuted: boolean;
  onToggleConnection: () => void;
  onToggleMute: () => void;
  onToggleKeyboard?: () => void;
}

export function ControlBar({
  isConnected,
  isMuted,
  onToggleConnection,
  onToggleMute,
  onToggleKeyboard,
}: ControlBarProps) {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed inset-x-0 bottom-6 sm:bottom-8 z-50 flex justify-center px-4 pointer-events-none"
    >
      <div className="pointer-events-auto bg-gemini-surface/90 backdrop-blur-xl rounded-full px-4 py-3 sm:px-6 sm:py-4 flex items-center gap-4 sm:gap-6 shadow-2xl border border-white/5">
        
        {/* Keyboard button (optional) */}
        {onToggleKeyboard && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleKeyboard}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            aria-label="Toggle keyboard input"
          >
            <Keyboard className="w-5 h-5 text-white/70" />
          </motion.button>
        )}

        {/* Mute/Unmute button */}
        {isConnected && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleMute}
            className={cn(
              'w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full transition-all shrink-0',
              isMuted
                ? 'bg-yellow-500/20 hover:bg-yellow-500/30'
                : 'bg-white/5 hover:bg-white/10'
            )}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <MicOff className="w-6 h-6 text-yellow-400" />
            ) : (
              <Mic className="w-6 h-6 text-white/70" />
            )}
          </motion.button>
        )}

        {/* Main Connect/Disconnect button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleConnection}
          className={cn(
            'w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-full transition-all shadow-lg shrink-0',
            isConnected
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-gemini-blue hover:bg-blue-600'
          )}
          aria-label={isConnected ? 'Disconnect' : 'Connect'}
        >
          {isConnected ? (
            <PhoneOff className="w-7 h-7 text-white" />
          ) : (
            <Phone className="w-7 h-7 text-white" />
          )}
        </motion.button>

        {/* Connection status indicator */}
        {isConnected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-2 pl-2"
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.7, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="w-2 h-2 rounded-full bg-green-400"
            />
            <span className="text-white/70 text-xs font-medium">Connected</span>
          </motion.div>
        )}
      </div>

    </motion.div>
  );
}
