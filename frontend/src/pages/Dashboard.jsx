import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

function Dashboard() {
  const [theorems, setTheorems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchTheorems(page);
  }, [page]);

  const fetchTheorems = async (currentPage) => {
    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/theorems?page=${currentPage}&limit=50`);
      setTheorems(response.data.data);
      setTotalPages(response.data.totalPages);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Error fetching theorems:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && theorems.length === 0) return <div className="text-secondary">Loading theorems...</div>;

  return (
    <div className="dashboard-container">
      <div className="header" style={{ marginBottom: '2rem', borderBottom: 'none' }}>
        <h2>Available Theorems <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>({total} total)</span></h2>
      </div>
      
      {theorems.length === 0 ? (
        <div className="glass-panel text-secondary">
          No theorems available yet. <Link to="/add" style={{color: 'var(--accent)'}}>Add one</Link>.
        </div>
      ) : (
        <div className="theorem-list">
          {theorems.map(theorem => (
            <Link to={`/theorem/${theorem.id}`} key={theorem.id} style={{ textDecoration: 'none' }}>
              <div className="glass-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 className="theorem-card-title">{theorem.name}</h3>
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
          ))}
          
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
