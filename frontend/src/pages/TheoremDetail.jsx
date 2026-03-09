import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

function TheoremDetail() {
  const { id } = useParams();
  const [theorem, setTheorem] = useState(null);
  const [proofContent, setProofContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchTheorem();
  }, [id]);

  const fetchTheorem = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/theorems/${id}`);
      setTheorem(response.data);
      // prepopulate proof content if statement exists
      setProofContent(`-- Prove the following theorem:\n${response.data.statement}\n  sorry\n`);
    } catch (error) {
      console.error('Error fetching theorem:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitProof = async () => {
    setSubmitting(true);
    setResult(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/theorems/${id}/prove`, 
        { content: proofContent },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setResult(response.data);
      // Refresh theorem to get updated status and proofs
      fetchTheorem();
    } catch (error) {
      console.error('Error submitting proof:', error);
      setResult({ success: false, error: 'Failed to submit proof. See console for details.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-secondary">Loading theorem details...</div>;
  if (!theorem) return <div className="text-danger">Theorem not found.</div>;

  return (
    <div className="theorem-detail-container">
      <Link to="/" className="btn btn-secondary" style={{ marginBottom: '2rem' }}>&larr; Back to Dashboard</Link>
      
      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 className="theorem-card-title">{theorem.name}</h2>
            <div className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
              Created: {new Date(theorem.created_at).toLocaleString()}
              {theorem.author_name && (
                <span style={{ marginLeft: '1rem', color: 'var(--accent)' }}>By {theorem.author_name}</span>
              )}
            </div>
          </div>
          <span className={`status-badge status-${theorem.status}`}>
            {theorem.status}
          </span>
        </div>
        
        <div className="theorem-card-statement" style={{ fontSize: '1.1rem', padding: '1.5rem' }}>
          {theorem.statement}
        </div>
        
        {theorem.description_latex && (
          <div className="text-primary" style={{ marginTop: '1.5rem', lineHeight: '1.6', fontSize: '1.1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>AI Explanation</h4>
            <Latex>{theorem.description_latex}</Latex>
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Submit Proof / Disproof</h3>
        
        <textarea
          className="textarea-field"
          value={proofContent}
          onChange={(e) => setProofContent(e.target.value)}
          placeholder="Enter your Lean 4 proof here..."
          disabled={submitting}
        />
        
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            className="btn btn-primary" 
            onClick={submitProof}
            disabled={submitting || !proofContent.trim()}
          >
            {submitting ? 'Compiling with Lean...' : 'Submit to Engine'}
          </button>
        </div>

        {result && (
          <div className="animate-fade-in" style={{ marginTop: '2rem' }}>
            <h4 style={{ marginBottom: '0.5rem' }}>Compilation Result:</h4>
            {result.compiler_missing && (
              <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--warning)', borderRadius: '8px', marginBottom: '1rem' }}>
                <strong className="text-warning">Warning:</strong> Lean compiler not found on the backend. The proof was saved, but couldn't be evaluated.
              </div>
            )}
            {!result.compiler_missing && result.proof && (
              <div style={{ padding: '1rem', background: result.proof.is_valid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
                <strong className={result.proof.is_valid ? 'text-success' : 'text-danger'}>
                  {result.proof.is_valid ? 'Success! Proof is valid.' : 'Failed. Proof is invalid or incomplete.'}
                </strong>
              </div>
            )}
            
            {result.proof?.output_log && (
              <div className="proof-log">
                {result.proof.output_log}
              </div>
            )}
          </div>
        )}
      </div>

      {theorem.proofs && theorem.proofs.length > 0 && (
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1rem' }}>Previous Submissions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {theorem.proofs.map(proof => (
              <div key={proof.id} style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', borderLeft: `4px solid ${proof.is_valid ? 'var(--success)' : 'var(--danger)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong>Submission #{proof.id}</strong>
                  <div>
                    {proof.prover_name && <span style={{ marginRight: '1rem', color: 'var(--accent)' }}>By {proof.prover_name}</span>}
                    <span className="text-secondary">{new Date(proof.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Status: <span className={proof.is_valid ? 'text-success' : 'text-danger'}>{proof.is_valid ? 'Passed' : 'Failed'}</span>
                </div>
                
                <details style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer' }}>
                  <summary style={{ color: 'var(--accent)', fontWeight: 'bold' }}>View Proof Code</summary>
                  <pre style={{ marginTop: '0.5rem', background: '#000', padding: '1rem', borderRadius: '4px', overflowX: 'auto', whiteSpace: 'pre-wrap', color: 'var(--text-primary)'}}>
                    {proof.content}
                  </pre>
                  {proof.output_log && (
                    <div style={{ marginTop: '0.5rem', padding: '0.5rem', borderLeft: '3px solid var(--text-secondary)', background: 'rgba(0,0,0,0.5)', fontSize: '0.9rem' }}>
                      <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Lean Output:</strong>
                      {proof.output_log}
                    </div>
                  )}
                </details>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TheoremDetail;
