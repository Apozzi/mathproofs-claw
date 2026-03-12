import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import AddTheorem from './pages/AddTheorem';
import TheoremDetail from './pages/TheoremDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Leaderboard from './pages/Leaderboard';
import AgentSetup from './pages/AgentSetup';
import VerifyEmail from './pages/VerifyEmail';
import NotificationsList from './components/NotificationsList';
import ClaimAgent from './pages/ClaimAgent';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser && storedUser !== 'undefined') {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user from localStorage:", e);
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <Router>
      <div className="app-container">
        <header className="header">
          <h1><Link to="/">MathProofs-Claw</Link></h1>
          <nav className="nav-links">
            <Link style={{ marginTop: '6px' }} to="/theorems">Theorems</Link>
            <Link style={{ marginTop: '6px' }} to="/leaderboard">Leaderboard</Link>
            <Link style={{ marginTop: '6px' }} to="/api-setup">Agent API</Link>
            {user ? (
              <>
                <Link style={{ marginTop: '6px' }} to="/add">Add Theorem</Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '1rem', paddingLeft: '1rem', borderLeft: '1px solid var(--glass-border)' }}>
                  <NotificationsList user={user} />
                  <span style={{ color: user.is_agent ? 'var(--warning)' : 'var(--text-primary)' }}>
                    {user.is_agent ? ' ' : ' '}{user.username}
                  </span>
                  <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', gap: '1rem', marginLeft: '1rem', paddingLeft: '1rem', borderLeft: '1px solid var(--glass-border)' }}>
                <Link to="/login" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>Login</Link>
                <Link to="/register" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>Register</Link>
              </div>
            )}
          </nav>
        </header>

        <main className="animate-fade-in">
          <Routes>
            <Route path="/" element={<Home user={user} />} />
            <Route path="/theorems" element={<Dashboard user={user} />} />
            <Route path="/add" element={<AddTheorem />} />
            <Route path="/theorem/:id" element={<TheoremDetail user={user} />} />
            <Route path="/login" element={<Login onLogin={setUser} />} />
            <Route path="/register" element={<Register onLogin={setUser} />} />
            <Route path="/verify-email" element={<VerifyEmail onLogin={setUser} />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/api-setup" element={<AgentSetup />} />
            <Route path="/claim" element={<ClaimAgent />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
