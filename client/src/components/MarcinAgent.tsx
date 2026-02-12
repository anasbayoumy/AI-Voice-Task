import { useEffect, useState } from 'react';
import './MarcinAgent.css';

interface MarcinAgentProps {
  status: 'idle' | 'connecting' | 'connected' | 'error';
  isAiSpeaking: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

type SpriteAnimation = 'idle' | 'walking' | 'talking';

export default function MarcinAgent({ 
  status, 
  isAiSpeaking, 
  onConnect, 
  onDisconnect 
}: MarcinAgentProps) {
  const [isEntering, setIsEntering] = useState(false);
  const [showCharacter, setShowCharacter] = useState(false);
  const [spriteAnimation, setSpriteAnimation] = useState<SpriteAnimation>('idle');

  // Handle entering transition
  useEffect(() => {
    if (status === 'connecting') {
      setIsEntering(true);
      setShowCharacter(true);
      setSpriteAnimation('walking');
      
      // After walking animation completes (2s), transition to active state
      const timer = setTimeout(() => {
        setIsEntering(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    } else if (status === 'idle') {
      setIsEntering(false);
      setShowCharacter(false);
      setSpriteAnimation('idle');
    }
  }, [status]);

  // Handle sprite animation based on AI speaking state
  useEffect(() => {
    if (status === 'connected' && !isEntering) {
      if (isAiSpeaking) {
        setSpriteAnimation('talking');
      } else {
        setSpriteAnimation('idle');
      }
    }
  }, [status, isAiSpeaking, isEntering]);

  const handleDoorClick = () => {
    if (status === 'idle') {
      onConnect();
    }
  };

  const handleExitClick = () => {
    if (status === 'connected') {
      onDisconnect();
    }
  };

  return (
    <div className="marcin-agent">
      {/* Retro UI Header */}
      <div className="pixel-header">
        <div className="pixel-title">
          ▓▒░ MARCIN AI AGENT ░▒▓
        </div>
        <div className="pixel-status">
          STATUS: {status.toUpperCase()}
          {status === 'connected' && (
            <span className="status-indicator">
              {isAiSpeaking ? ' [SPEAKING...]' : ' [LISTENING...]'}
            </span>
          )}
        </div>
      </div>

      {/* Game Room */}
      <div className="game-room">
        {/* Floor with perspective */}
        <div className="room-floor" />

        {/* Back Wall */}
        <div className="room-wall">
          {/* The Door */}
          <div 
            className={`door-container ${status !== 'idle' ? 'door-open' : ''}`}
            onClick={handleDoorClick}
          >
            <div className="door-frame">
              <div className="door-panel">
                <div className="door-knob" />
                {status === 'idle' && (
                  <div className="door-label">
                    ENTER
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Character (Marcin Sprite) */}
        {showCharacter && (
          <div 
            className={`character ${isEntering ? 'entering' : 'active'}`}
          >
            <div 
              className={`sprite sprite-${spriteAnimation}`}
              aria-label="AI Agent Character"
            />
            {status === 'connected' && !isEntering && (
              <div className="character-nameplate">
                MARCIN
              </div>
            )}
          </div>
        )}

        {/* Exit Button (only when connected) */}
        {status === 'connected' && !isEntering && (
          <button 
            className="pixel-button exit-button"
            onClick={handleExitClick}
          >
            EXIT
          </button>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="error-overlay">
            <div className="error-box">
              <div className="error-title">⚠ CONNECTION ERROR ⚠</div>
              <div className="error-message">
                Failed to establish connection.<br />
                Please check your setup and try again.
              </div>
              <button 
                className="pixel-button retry-button"
                onClick={onConnect}
              >
                RETRY
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Retro UI Footer */}
      <div className="pixel-footer">
        <div className="footer-text">
          {status === 'idle' && '▶ CLICK THE DOOR TO BEGIN'}
          {status === 'connecting' && '▶ ESTABLISHING CONNECTION...'}
          {status === 'connected' && isAiSpeaking && '▶ AI IS SPEAKING'}
          {status === 'connected' && !isAiSpeaking && '▶ YOUR TURN TO SPEAK'}
          {status === 'error' && '▶ CONNECTION FAILED'}
        </div>
      </div>
    </div>
  );
}
