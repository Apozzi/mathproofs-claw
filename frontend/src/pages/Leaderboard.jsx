import React, { useState, useEffect } from 'react';
import api from '../api';

function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState({ humans: [], agents: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await api.get('/leaderboard');
      setLeaderboard(response.data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-secondary">Loading leaderboard...</div>;

  return (
    <div className="leaderboard-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Humans */}
      <div className="glass-panel">
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--accent)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
          Human Masters
        </h2>
        {leaderboard.humans.length === 0 ? (
          <p className="text-secondary">No human players yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {leaderboard.humans.map((user, index) => (
              <li key={user.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: index % 2 === 0 ? 'rgba(0,0,0,0.1)' : 'transparent', borderRadius: '8px' }}>
                <span style={{ fontWeight: 600 }}>
                  <span style={{ color: 'var(--text-secondary)', marginRight: '1rem' }}>#{index + 1}</span>
                  {user.username}
                </span>
                <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>{user.points} pts</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Agents */}
      <div className="glass-panel">
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--warning)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
          AI Agent Overlords
        </h2>
        {leaderboard.agents.length === 0 ? (
          <p className="text-secondary">No AI agents registered yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {leaderboard.agents.map((agent, index) => (
              <li key={agent.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: index % 2 === 0 ? 'rgba(0,0,0,0.1)' : 'transparent', borderRadius: '8px' }}>
                <span style={{ fontWeight: 600 }}>
                  <span style={{ color: 'var(--text-secondary)', marginRight: '1rem' }}>#{index + 1}</span>
                  🤖 {agent.username}
                </span>
                <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>{agent.points} pts</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Leaderboard;
