import { useState } from 'react';
import './Dialer.css';

interface CallResult {
  success: boolean;
  callSid: string;
  status: string;
  to: string;
  from: string;
}

interface CallStatus {
  sid: string;
  status: string;
  duration: string | null;
  direction: string;
  from: string;
  to: string;
}

const CONTEXTS = [
  { value: 'general', label: 'General' },
  { value: 'sales', label: 'Sales' },
  { value: 'support', label: 'Support' },
  { value: 'demo', label: 'Demo Scheduling' },
];

export default function Dialer() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [context, setContext] = useState('general');
  const [loading, setLoading] = useState(false);
  const [activeCall, setActiveCall] = useState<CallResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL?.replace('ws://', 'http://').replace('wss://', 'https://') || 'http://localhost:8080';
  const API_KEY = import.meta.env.VITE_API_KEY;

  // Helper to build headers with optional auth
  const getHeaders = () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }
    return headers;
  };

  const formatPhoneNumber = (value: string) => {
    // Remove non-digits except +
    const cleaned = value.replace(/[^\d+]/g, '');
    
    // Already properly formatted with +
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    
    // Remove any stray + signs that aren't at the start
    const digits = cleaned.replace(/\+/g, '');
    
    // US/Canada: 11 digits starting with 1
    if (digits.length === 11 && digits[0] === '1') {
      return `+${digits}`;
    }
    
    // US/Canada: 10 digits (assume 1 prefix)
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    
    // International: add + if missing
    if (digits.length > 0) {
      return `+${digits}`;
    }
    
    return value;
  };

  const handleCall = async () => {
    setError(null);
    setCallStatus(null);
    
    const formattedNumber = formatPhoneNumber(phoneNumber);
    
    if (!/^\+[1-9]\d{1,14}$/.test(formattedNumber)) {
      setError('Invalid phone number. Use format: +15555551234 or 5555551234');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/outbound/initiate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          to: formattedNumber,
          context,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to initiate call');
      }

      const result: CallResult = await response.json();
      setActiveCall(result);
      
      // Start polling for status
      pollCallStatus(result.callSid);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate call');
    } finally {
      setLoading(false);
    }
  };

  const pollCallStatus = async (callSid: string) => {
    const intervalId = setInterval(async () => {
      try {
        const headers: Record<string, string> = {};
        if (API_KEY) {
          headers['Authorization'] = `Bearer ${API_KEY}`;
        }
        
        const response = await fetch(`${API_BASE}/api/outbound/status/${callSid}`, { headers });
        if (response.ok) {
          const status: CallStatus = await response.json();
          setCallStatus(status);
          
          // Stop polling if call is completed
          if (status.status === 'completed' || status.status === 'failed' || status.status === 'busy' || status.status === 'no-answer') {
            clearInterval(intervalId);
          }
        }
      } catch (err) {
        console.error('Failed to fetch call status:', err);
      }
    }, 2000); // Poll every 2 seconds
  };

  const handleHangup = async () => {
    if (!activeCall) return;

    try {
      const headers: Record<string, string> = {};
      if (API_KEY) {
        headers['Authorization'] = `Bearer ${API_KEY}`;
      }
      
      const response = await fetch(`${API_BASE}/api/outbound/hangup/${activeCall.callSid}`, {
        method: 'POST',
        headers,
      });

      if (response.ok) {
        setActiveCall(null);
        setCallStatus(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to hang up');
    }
  };

  return (
    <div className="dialer-container">
      <div className="dialer-terminal">
        <div className="dialer-header">
          <span className="bracket">[</span>
          OUTBOUND DIALER
          <span className="bracket">]</span>
        </div>
        
        {error && (
          <div className="dialer-error">
            &gt; ERROR: {error}
          </div>
        )}

        {!activeCall ? (
          <>
            <div className="dialer-section">
              <label htmlFor="phone" className="terminal-label">
                &gt; PHONE_NUMBER:
              </label>
              <input
                id="phone"
                type="tel"
                className="terminal-input"
                placeholder="+1 555 555 1234"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={loading}
              />
              <div className="terminal-hint">
                &gt; FORMAT: +1XXXXXXXXXX OR 10 DIGITS
              </div>
            </div>

            <div className="dialer-section">
              <label htmlFor="context" className="terminal-label">
                &gt; CALL_CONTEXT:
              </label>
              <select
                id="context"
                className="terminal-select"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                disabled={loading}
              >
                {CONTEXTS.map((ctx) => (
                  <option key={ctx.value} value={ctx.value}>
                    {ctx.label.toUpperCase()}
                  </option>
                ))}
              </select>
              <div className="terminal-hint">
                &gt; AI BEHAVIOR ADAPTS TO CONTEXT
              </div>
            </div>

            <button
              className="dialer-btn"
              onClick={handleCall}
              disabled={loading || !phoneNumber}
            >
              {loading ? '[ CALLING... ]' : '[ INITIATE CALL ]'}
            </button>
          </>
        ) : (
          <div className="call-session">
            <div className="session-header">
              &gt; ACTIVE_SESSION
            </div>
            <div className="call-log">
              <div className="log-entry">
                <span className="log-label">TO:</span>
                <span className="log-value">{activeCall.to}</span>
              </div>
              <div className="log-entry">
                <span className="log-label">FROM:</span>
                <span className="log-value">{activeCall.from}</span>
              </div>
              <div className="log-entry">
                <span className="log-label">CONTEXT:</span>
                <span className="log-value">{context.toUpperCase()}</span>
              </div>
              <div className="log-entry">
                <span className="log-label">SID:</span>
                <span className="log-value log-code">{activeCall.callSid}</span>
              </div>
              
              {callStatus && (
                <>
                  <div className="log-entry">
                    <span className="log-label">STATUS:</span>
                    <span className={`log-value status-${callStatus.status}`}>
                      [ {callStatus.status.toUpperCase()} ]
                    </span>
                  </div>
                  {callStatus.duration && (
                    <div className="log-entry">
                      <span className="log-label">DURATION:</span>
                      <span className="log-value">{callStatus.duration}s</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <button
              className="dialer-btn btn-hangup"
              onClick={handleHangup}
            >
              [ TERMINATE ]
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
