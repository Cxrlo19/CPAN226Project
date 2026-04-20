import React, { useState, useEffect, useRef } from 'react';
import { Send, Wifi, WifiOff, LogOut, Clock } from 'lucide-react';
import { encryptMessage, decryptMessage } from '../utils/crypto';

export default function Chat({ user, isOnline, onLogout }) {
  const [ws, setWs] = useState(null);
  const [messages, setMessages] = useState([]);
  const [offlineQueue, setOfflineQueue] = useState(() => {
    const saved = localStorage.getItem('offlineQueue');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });
  const [inputVal, setInputVal] = useState('');
  const messagesEndRef = useRef(null);

  const addMessage = React.useCallback((msgObj) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), ...msgObj }]);
  }, []);

  // Sync queue to localstorage
  useEffect(() => {
    localStorage.setItem('offlineQueue', JSON.stringify(offlineQueue));
  }, [offlineQueue]);

  const [retryCount, setRetryCount] = useState(0);

  // Handle Websocket Lifecycle
  useEffect(() => {
    // Wait until network is connected to attempt socket connection
    if (!isOnline) {
      if (ws) ws.close();
      return;
    }

    let wsUrl;
    if (window.location.protocol === 'file:') {
      wsUrl = 'ws://localhost:5000';
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      if (import.meta.env.DEV) {
        wsUrl = `${protocol}//${window.location.hostname}:5000`;
      } else {
        wsUrl = `${protocol}//${window.location.host}`;
      }
    }

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'join',
        username: user.username,
        room: user.room
      }));
      setWs(socket);
    };

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'system') {
          addMessage({ type: 'system', content: data.message, timestamp: data.timestamp });
        } else if (data.type === 'message') {
          const decrypted = await decryptMessage(data.content);
          addMessage({
            type: 'message',
            from: data.from,
            content: decrypted,
            timestamp: data.timestamp,
            isOwn: false
          });
        }
      } catch (e) {
        console.error("Message handling error:", e);
      }
    };

    socket.onclose = () => {
      setWs(null);
      setTimeout(() => {
        if (isOnline) {
          setRetryCount(c => c + 1);
        }
      }, 3000);
    };

    return () => {
      socket.onclose = null;
      socket.close();
    };
  }, [isOnline, user.room, user.username, retryCount]);

  useEffect(() => {
    const flushQueue = () => {
      offlineQueue.forEach(msg => {
        ws.send(JSON.stringify({
          type: 'message',
          content: msg.encryptedContent
        }));
      });
      setOfflineQueue([]);
    };

    if (isOnline && ws && ws.readyState === WebSocket.OPEN && offlineQueue.length > 0) {
      setTimeout(flushQueue, 0);
    }
  }, [isOnline, ws, offlineQueue]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const content = inputVal.trim();
    if (!content) return;
    setInputVal('');

    try {
      const cypherText = await encryptMessage(content);

      if (!isOnline || !ws || ws.readyState !== WebSocket.OPEN) {
        setOfflineQueue(prev => [...prev, {
          encryptedContent: cypherText,
          timestamp: Date.now()
        }]);
        addMessage({ type: 'message', from: user.username, content, timestamp: Date.now(), isOwn: true });
        return;
      }

      ws.send(JSON.stringify({
        type: 'message',
        content: cypherText
      }));

      addMessage({ type: 'message', from: user.username, content, timestamp: Date.now(), isOwn: true });
    } catch (err) {
      console.error("Failed to encrypt and send data", err);
    }
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.avatarCircle}>{user.username.charAt(0).toUpperCase()}</div>
          <div>
            <h2 style={styles.roomName}>{user.room}</h2>
            <div style={styles.statusBadge}>
              {isOnline ? (
                <><Wifi size={14} color="var(--success-color)" /><span style={{ color: "var(--success-color)" }}>Online & Secure</span></>
              ) : (
                <><WifiOff size={14} color="var(--error-color)" /><span style={{ color: "var(--error-color)" }}>Offline Mode</span></>
              )}
            </div>
          </div>
        </div>
        <button onClick={onLogout} style={styles.logoutBtn} title="Leave Room">
          <LogOut size={20} />
        </button>
      </div>

      <div style={styles.chatArea}>
        {messages.length === 0 && (
          <div style={styles.emptyState}>
            Secure connection established. Start chatting!
          </div>
        )}

        {messages.map((m) => (
          m.type === 'system' ? (
            <div key={m.id} style={styles.systemMessage}>{m.content}</div>
          ) : (
            <div key={m.id} style={{
              ...styles.messageWrapper,
              alignSelf: m.isOwn ? 'flex-end' : 'flex-start'
            }}>
              {!m.isOwn && <span style={styles.messageAuthor}>{m.from}</span>}
              <div style={{
                ...styles.messageBubble,
                backgroundColor: m.isOwn ? 'var(--bubble-own)' : 'var(--bubble-other)',
                borderRadius: m.isOwn ? '16px 16px 2px 16px' : '16px 16px 16px 2px'
              }}>
                {m.content}
              </div>
              <span style={styles.timestamp}>
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )
        ))}
        <div ref={messagesEndRef} />
      </div>

      {!isOnline && (
        <div style={styles.offlineBanner}>
          <Clock size={16} />
          <span>You are offline. Messages will queue and sync later.</span>
        </div>
      )}

      {offlineQueue.length > 0 && isOnline && (
        <div style={styles.syncBanner}>
          Syncing {offlineQueue.length} queued message(s)...
        </div>
      )}

      <form onSubmit={handleSend} style={styles.inputArea}>
        <input
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          placeholder={isOnline ? "Type a secure message..." : "Type an offline message..."}
          style={styles.input}
        />
        <button type="submit" style={styles.sendBtn} disabled={!inputVal.trim()}>
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    backgroundColor: 'var(--bg-color)',
  },
  header: {
    padding: '1.5rem',
    backgroundColor: 'var(--surface-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-color)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    zIndex: 10
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  avatarCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-color)',
    color: 'white',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '1.5rem',
    fontWeight: 'bold',
  },
  roomName: {
    margin: 0,
    fontSize: '1.25rem'
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.85rem',
    marginTop: '0.2rem',
    fontWeight: '500'
  },
  logoutBtn: {
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    padding: '0.5rem',
  },
  chatArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.2rem',
  },
  emptyState: {
    textAlign: 'center',
    color: 'var(--text-secondary)',
    marginTop: 'auto',
    marginBottom: 'auto',
    fontStyle: 'italic'
  },
  systemMessage: {
    alignSelf: 'center',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: '0.4rem 1rem',
    borderRadius: '20px'
  },
  messageWrapper: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '80%'
  },
  messageAuthor: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    marginBottom: '0.25rem',
    marginLeft: '0.5rem'
  },
  messageBubble: {
    padding: '0.8rem 1.2rem',
    fontSize: '1rem',
    lineHeight: '1.4',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
  },
  timestamp: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    marginTop: '0.25rem',
    alignSelf: 'flex-end',
    opacity: 0.7
  },
  offlineBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: 'var(--error-color)',
    padding: '0.75rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
    borderTop: '1px solid rgba(239, 68, 68, 0.2)'
  },
  syncBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    color: '#f59e0b',
    padding: '0.75rem',
    textAlign: 'center',
    fontSize: '0.9rem',
    borderTop: '1px solid rgba(245, 158, 11, 0.2)'
  },
  inputArea: {
    padding: '1.5rem',
    backgroundColor: 'var(--surface-color)',
    display: 'flex',
    gap: '1rem',
    borderTop: '1px solid var(--border-color)'
  },
  input: {
    flex: 1,
    padding: '1rem 1.5rem',
    borderRadius: '24px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-color)',
    color: 'white',
    fontSize: '1rem'
  },
  sendBtn: {
    backgroundColor: 'var(--primary-color)',
    color: 'white',
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  }
};
