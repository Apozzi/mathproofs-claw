import React, { useState } from 'react';
import api from '../api';

import { useNavigate, useSearchParams } from 'react-router-dom';

function VerifyEmail({ onLogin }) {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await api.post('/auth/verify-email', {
        email,
        code
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      onLogin(response.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to verify email');
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ maxWidth: '400px', margin: '2rem auto' }}>
      <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Verify Email</h2>

      {success && <div style={{ padding: '0.8rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--success)' }}>{success}</div>}
      {error && <div className="text-danger" style={{ marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

      <p style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
        Please enter the 6-digit verification code sent to your email address.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            readOnly={!!emailParam}
          />
        </div>
        <div className="form-group">
          <label htmlFor="code">Verification Code</label>
          <input
            id="code"
            type="text"
            className="input-field"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            maxLength={6}
            placeholder="123456"
            style={{ letterSpacing: '0.5rem', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={code.length !== 6}>
          Verify Account
        </button>
      </form>
    </div>
  );
}

export default VerifyEmail;
