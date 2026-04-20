import React, { useState, useEffect } from 'react';
import { Lock, User, Hash, LogIn } from 'lucide-react';
import { deriveKey } from '../utils/crypto';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState(() => localStorage.getItem('username') || '');
  const [room, setRoom] = useState(() => localStorage.getItem('room') || 'default');
  const [password, setPassword] = useState(() => localStorage.getItem('roomSecret') || '');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      alert("Username and Room Password are required.");
      return;
    }

    setIsProcessing(true);
    
    try {
      localStorage.setItem('username', username.trim());
      localStorage.setItem('room', room.trim() || 'default');
      localStorage.setItem('roomSecret', password.trim());

      // Pre-derive encryption key
      await deriveKey(password.trim());
      
      onLogin({
        username: username.trim(),
        room: room.trim() || 'default',
        password: password.trim()
      });
    } catch(err) {
      console.error("Encryption initialization error:", err);
      alert("Failed to initialize secure connection.");
      setIsProcessing(false);
    }
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.iconCircle}>
            <Lock size={32} color="var(--primary-color)" />
          </div>
          <h2 style={styles.title}>Secure Offline Messenger</h2>
          <p style={styles.subtitle}>E2EE Messaging with PWA Sync</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <User size={18} color="var(--text-secondary)" style={styles.inputIcon} />
            <input 
              type="text" 
              placeholder="Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <Hash size={18} color="var(--text-secondary)" style={styles.inputIcon} />
            <input 
              type="text" 
              placeholder="Room Name" 
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <Lock size={18} color="var(--text-secondary)" style={styles.inputIcon} />
            <input 
              type="password" 
              placeholder="Room Password (Encryption Key)" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <button 
            type="submit" 
            style={{...styles.button, opacity: isProcessing ? 0.7 : 1}}
            disabled={isProcessing}
          >
            {isProcessing ? 'Generating Keys...' : (
              <>
                <LogIn size={20} />
                <span>Join Secure Chat</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '1.5rem'
  },
  card: {
    backgroundColor: 'var(--surface-color)',
    padding: '2.5rem',
    borderRadius: '16px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
    width: '100%',
    maxWidth: '420px',
    border: '1px solid var(--border-color)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem'
  },
  iconCircle: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.2rem',
  },
  inputGroup: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  inputIcon: {
    position: 'absolute',
    left: '1rem',
  },
  input: {
    width: '100%',
    padding: '0.85rem 1rem 0.85rem 2.75rem',
    backgroundColor: 'var(--bg-color)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '1rem',
  },
  button: {
    backgroundColor: 'var(--primary-color)',
    color: 'white',
    padding: '0.9rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '0.5rem'
  }
};
