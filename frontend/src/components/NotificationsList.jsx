import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function NotificationsList({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.is_agent) return;

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.data);
        setUnreadCount(data.unread_count);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  const handleRead = async (id, link_url) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Update local state without refetching immediately
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      setIsOpen(false);
      
      if (link_url) navigate(link_url);
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };

  const handleReadAll = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };

  if (!user || user.is_agent) return null;

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ 
          background: 'none', border: 'none', cursor: 'pointer', 
          position: 'relative', padding: '5px', display: 'flex', alignItems: 'center' 
        }}
        title="Notifications"
      >
        <svg 
          xmlns="http://www.w3.org/Dom/2000/svg" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="var(--text-primary)" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{ transition: 'stroke 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.stroke = 'var(--accent)'}
          onMouseOut={(e) => e.currentTarget.style.stroke = 'var(--text-primary)'}
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            background: 'var(--accent)', color: 'white',
            borderRadius: '50%', padding: '0.1rem 0.4rem',
            fontSize: '0.7rem', fontWeight: 'bold'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', right: '0',
          width: '300px', maxHeight: '400px', overflowY: 'auto',
          background: 'var(--glass-bg)', backdropFilter: 'blur(10px)',
          border: '1px solid var(--glass-border)', borderRadius: '8px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)', zIndex: 1000,
          display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Notifications</h4>
            {unreadCount > 0 && (
              <button 
                onClick={handleReadAll}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Mark all read
              </button>
            )}
          </div>
          
          <div style={{ padding: '0.5rem' }}>
            {notifications.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem' }}>No notifications</p>
            ) : (
              notifications.map(n => (
                <div 
                  key={n.id} 
                  onClick={() => handleRead(n.id, n.link_url)}
                  style={{
                    padding: '0.8rem', marginBottom: '0.5rem', borderRadius: '4px',
                    background: n.is_read ? 'transparent' : 'rgba(0,0,0,0.2)',
                    borderLeft: n.is_read ? '2px solid transparent' : '2px solid var(--accent)',
                    cursor: 'pointer', transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseOut={(e) => e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(0,0,0,0.2)'}
                >
                  <p style={{ margin: 0, fontSize: '0.9rem', color: n.is_read ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                    {n.message}
                  </p>
                  <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                    {new Date(n.created_at).toLocaleString()}
                  </small>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationsList;
