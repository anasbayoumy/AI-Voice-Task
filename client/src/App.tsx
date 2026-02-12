import { useState } from 'react'
import { useVoiceAgent } from './lib/useVoiceAgent'
import Dialer from './components/Dialer'
import './App.css'
//dasdasd
function App() {
  const [mode, setMode] = useState<'web' | 'dialer'>('web')
  const { status, error, testMode, connect, disconnect } = useVoiceAgent()

  return (
    <div className="app">
      {/* System Status Bar */}
      <header className="system-header">
        <div className="system-title">
          <span className="terminal-bracket">[</span>
          BIAMI.IO VOICE SYSTEM
          <span className="terminal-bracket">]</span>
          <span className="cursor-blink">_</span>
        </div>
        <div className="system-time">{new Date().toLocaleTimeString()}</div>
      </header>

      {/* Mode Toggle - Tabbed Interface */}
      <div className="mode-tabs">
        <button
          className={`tab ${mode === 'web' ? 'tab-active' : ''}`}
          onClick={() => setMode('web')}
        >
          [ VOICE ]
        </button>
        <button
          className={`tab ${mode === 'dialer' ? 'tab-active' : ''}`}
          onClick={() => setMode('dialer')}
        >
          [ DIALER ]
        </button>
      </div>

      {mode === 'web' ? (
        <main className="terminal-main">
          <div className="monitor-frame">
            <div className="monitor-content">
              <div className="terminal-section">
                <div className="section-header">
                  &gt; SYSTEM STATUS
                </div>
                <div className={`terminal-status status-${status}`}>
                  <span className="status-indicator">█</span>
                  {status === 'idle' && '[ READY ]'}
                  {status === 'connecting' && '[ CONNECTING... ]'}
                  {status === 'connected' && (
                    <>
                      [ ACTIVE ]
                      {testMode && <span className="test-badge">TEST_MODE</span>}
                    </>
                  )}
                  {status === 'error' && '[ ERROR ]'}
                </div>
              </div>

              {error && (
                <div className="terminal-error" role="alert">
                  &gt; ERROR: {error}
                </div>
              )}

              <div className="terminal-section">
                <div className="section-header">
                  &gt; CONTROLS
                </div>
                <div className="terminal-actions">
                  {status !== 'connected' ? (
                    <button
                      className="terminal-btn btn-primary"
                      onClick={connect}
                      disabled={status === 'connecting'}
                      aria-label="Start voice conversation"
                    >
                      {status === 'connecting' ? '[ CONNECTING... ]' : '[ INITIATE ]'}
                    </button>
                  ) : (
                    <button
                      className="terminal-btn btn-terminate"
                      onClick={disconnect}
                      aria-label="End voice conversation"
                    >
                      [ TERMINATE ]
                    </button>
                  )}
                </div>
              </div>

              <div className="terminal-log">
                <div className="log-line">
                  {status === 'idle' && '&gt; READY TO ESTABLISH CONNECTION'}
                  {status === 'connecting' && '&gt; ESTABLISHING SECURE CHANNEL...'}
                  {status === 'connected' && '&gt; VOICE CHANNEL ACTIVE - SPEAK NOW'}
                  {status === 'error' && '&gt; CONNECTION FAILED - CHECK SYSTEM'}
                </div>
                {status === 'connected' && (
                  <div className="log-line">
                    &gt; MICROPHONE ACCESS GRANTED
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      ) : (
        <Dialer />
      )}
    </div>
  )
}

export default App
