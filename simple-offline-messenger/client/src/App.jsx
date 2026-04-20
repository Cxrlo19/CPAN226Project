import { useState, useEffect } from 'react'
import Login from './components/Login'
import Chat from './components/Chat'

function App() {
  const [user, setUser] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    setUser(null)
  }

  return (
    <>
      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Chat user={user} isOnline={isOnline} onLogout={handleLogout} />
      )}
    </>
  )
}

export default App
