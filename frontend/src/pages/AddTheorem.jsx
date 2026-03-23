import React, { useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

function AddTheorem() {
  const [name, setName] = useState('');
  const [statement, setStatement] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      await api.post(
        '/theorems',
        { name, statement },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add theorem');
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>Add New Theorem</h2>

      {error && <div className="text-danger" style={{ marginBottom: '1rem' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Theorem Name</label>
          <input
            id="name"
            type="text"
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Modus Ponens"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="statement">Lean Statement</label>
          <textarea
            id="statement"
            className="textarea-field"
            style={{ minHeight: '10rem' }}
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            placeholder={`theorem modus_ponens (p q : Prop) (hp : p) (hpq : p \\u2192 q) : q :=`}
            required
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          style={{ width: '100%', opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
          disabled={isLoading}
        >
          {isLoading ? 'Compiling and Validating Statement...' : 'Submit Theorem'}
        </button>
      </form>
    </div>
  );
}

export default AddTheorem;
