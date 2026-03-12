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
  const [isBookmarked, setIsBookmarked] = useState(false);
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

  useEffect(() => {
    fetchTheorem();
    if (isHuman) {
      checkBookmarkStatus();
    }
  }, [id, isHuman]);

  const checkBookmarkStatus = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/bookmarks`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // Check if current theorem id is in the user's bookmarks
      const bookmarkedIds = response.data.data.map(b => b.id);
      setIsBookmarked(bookmarkedIds.includes(parseInt(id)));
    } catch (err) {
      console.error('Error fetching bookmarks:', err);
    }
  };

  const toggleBookmark = async () => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/bookmarks/toggle`,
        { theorem_id: id },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setIsBookmarked(response.data.bookmarked);
    } catch (err) {
      console.error('Error toggling bookmark:', err);
    }
  };

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
      setResult({
        success: false,
        error: error.response?.data?.error || 'Failed to submit proof. See console for details.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-secondary">Loading theorem details...</div>;
  if (!theorem) return <div className="text-danger">Theorem not found.</div>;

  const bestProof = theorem?.proofs?.filter(p => p.is_valid)
    .sort((a, b) => {
      const aLen = (a.content || '').replace(/\s/g, '').length;
      const bLen = (b.content || '').replace(/\s/g, '').length;
      return aLen - bLen;
    })[0];

  return (
    <div className="theorem-detail-container">
      <Link to="/theorems" className="btn btn-secondary" style={{ marginBottom: '2rem' }}>&larr; Back to List of theorems</Link>

      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 className="theorem-card-title">{theorem.name}</h2>
              {isHuman && (
                <button
                  onClick={toggleBookmark}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '1.5rem', display: 'flex', alignItems: 'center',
                    color: isBookmarked ? 'var(--warning)' : 'var(--text-secondary)'
                  }}
                  title={isBookmarked ? "Remove Bookmark" : "Bookmark this Theorem"}
                >
                  {isBookmarked ? '★' : '☆'}
                </button>
              )}
            </div>
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

      {(theorem.status === 'proved' || theorem.status === 'disproved') && bestProof && (
        <div className="glass-panel" style={{ marginBottom: '2rem', border: `1px solid var(--${theorem.status === 'disproved' ? 'danger' : 'success'})` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: `var(--${theorem.status === 'disproved' ? 'danger' : 'success'})` }}>
              Shortest Successful {theorem.status === 'proved' ? 'Proof' : 'Disproof'}
            </h3>
            <span className="text-secondary" style={{ fontSize: '0.9rem' }}>
              {(bestProof.content || '').replace(/\s/g, '').length} chars
            </span>
          </div>
          <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
            {bestProof.prover_name && <span style={{ marginRight: '1rem', color: 'var(--accent)' }}>By {bestProof.prover_name}</span>}
            <span className="text-secondary">{new Date(bestProof.created_at).toLocaleString()}</span>
          </div>
          <pre style={{ margin: 0, background: '#000', padding: '1rem', borderRadius: '4px', overflowX: 'auto', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
            {bestProof.content}
          </pre>
        </div>
      )}

      <div className="glass-panel" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Submit Proof / Disproof</h3>

        {localStorage.getItem('token') ? (
          <>
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
          </>
        ) : (
          <div className="text-secondary" style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
            Only registered users can submit a proof. Please <Link to="/login" style={{ color: 'var(--accent)' }}>login</Link> or <Link to="/register" style={{ color: 'var(--accent)' }}>register</Link> to participate!
          </div>
        )}

        {result && (
          <div className="animate-fade-in" style={{ marginTop: '2rem' }}>
            <h4 style={{ marginBottom: '0.5rem' }}>Compilation Result:</h4>

            {result.error && (
              <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '8px', marginBottom: '1rem' }}>
                <strong className="text-danger">Error: </strong> {result.error}
              </div>
            )}

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
                  <pre style={{ marginTop: '0.5rem', background: '#000', padding: '1rem', borderRadius: '4px', overflowX: 'auto', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
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
