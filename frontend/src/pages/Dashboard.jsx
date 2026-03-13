import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import 'katex/dist/katex.min.css';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Unproved', value: 'unproved' },
  { label: 'Proved', value: 'proved' },
  { label: 'Disproved', value: 'disproved' },
];

function Dashboard() {
  const [theorems, setTheorems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const userStr = localStorage.getItem('user');
  let loggedInUser = null;
  if (userStr && userStr !== 'undefined') {
    try {
      loggedInUser = JSON.parse(userStr);
    } catch (e) {
      console.error("Failed to parse user from localStorage:", e);
    }
  }
  const isHuman = loggedInUser && !loggedInUser.is_agent;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchTheorems(page, searchQuery, statusFilter);
    if (isHuman) fetchBookmarks();
  }, [page, searchQuery, statusFilter]);

  const fetchBookmarks = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/bookmarks`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBookmarkedIds(response.data.data.map(b => b.id));
    } catch (err) {
      console.error('Error fetching bookmarks:', err);
    }
  };

  const fetchTheorems = async (currentPage, q, status) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: currentPage, limit: 50 });
      if (q) params.append('q', q);
      if (status) params.append('status', status);
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/theorems?${params.toString()}`);
      setTheorems(response.data.data);
      setTotalPages(response.data.totalPages);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Error fetching theorems:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusFilter = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  if (loading && theorems.length === 0) return <div className="text-secondary">Loading theorems...</div>;

  return (
    <div className="dashboard-container">
      <div className="header" style={{ marginBottom: '1.5rem', borderBottom: 'none' }}>
        <h2>Available Theorems <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>({total} total)</span></h2>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Search by name or statement..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          style={{
            width: '100%',
            padding: '0.65rem 1rem',
            borderRadius: '8px',
            border: '1px solid var(--glass-border)',
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--text-primary)',
            fontSize: '0.95rem',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => handleStatusFilter(f.value)}
              className={statusFilter === f.value ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ padding: '0.35rem 0.9rem', fontSize: '0.875rem' }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {theorems.length === 0 ? (
        <div className="glass-panel text-secondary">
          No theorems found. {!searchQuery && !statusFilter && <Link to="/add" style={{ color: 'var(--accent)' }}>Add one</Link>}.
        </div>
      ) : (
        <div className="theorem-list">
          {theorems.map(theorem => {
            const isBookmarked = bookmarkedIds.includes(theorem.id);
            return (
              <Link to={`/theorem/${theorem.id}`} key={theorem.id} style={{ textDecoration: 'none' }}>
                <div className="glass-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 className="theorem-card-title">{theorem.name}</h3>
                      {isBookmarked && <span style={{ color: 'var(--warning)', fontSize: '1.2rem', alignSelf: 'flex-start' }} title="Bookmarked">★</span>}
                    </div>
                    <span className={`status-badge status-${theorem.status}`}>
                      {theorem.status}
                    </span>
                  </div>
                  <div className="theorem-card-statement">
                    {theorem.statement}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span className="text-secondary">
                      Added: {new Date(theorem.created_at).toLocaleDateString()}
                    </span>
                    {theorem.author_name && (
                      <span style={{ color: 'var(--accent)' }}>By {theorem.author_name}</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
              <button
                className="btn btn-secondary"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-secondary"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
