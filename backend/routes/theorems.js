const express = require('express');
const router = express.Router();
const db = require('../database');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { auth, optionalAuth } = require('../middleware/auth');
const { GoogleGenAI } = require('@google/genai');

// Initialize Gemini SDK conditionally
let ai = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

async function generateLatexDescription(name, statement) {
  if (!ai) {
    return '*(AI rendering not configured - missing GEMINI_API_KEY)*\n\nFallback Math: $$\\forall x, P(x) \\rightarrow Q(x)$$';
  }

  try {
    const prompt = `Given the following Lean 4 theorem name '${name}' and statement '${statement}', provide a short, mathematical explanation using LaTeX format. Only return the explanation text with inline $\\dots$ or display $$\\dots$$ math. Do not wrap it in markdown code blocks. Make it short and intuitive.`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });
    return response.text.trim();
  } catch (err) {
    console.error('Error generating LaTeX:', err);
    return '*(Error generating LaTeX description)*';
  }
}

// GET all theorems (Paginated)
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  db.get('SELECT COUNT(*) as count FROM theorems', [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    const total = row.count;
    const totalPages = Math.ceil(total / limit);

    db.all('SELECT * FROM theorems ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ data: rows, total, page, totalPages, limit });
    });
  });
});

// GET search theorems
router.get('/search', (req, res) => {
  const q = req.query.q || '';
  const limit_submissions = parseInt(req.query.submissions) || 0;
  
  if (!q) {
    return res.status(400).json({ error: 'Search query "q" is required' });
  }

  const searchQuery = `%${q}%`;
  
  db.all('SELECT * FROM theorems WHERE name LIKE ? OR statement LIKE ? ORDER BY created_at DESC', [searchQuery, searchQuery], async (err, theorems) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // For each theorem, attach proofs
    const theoremsWithProofs = [];
    
    for (const theorem of theorems) {
      const thm = { ...theorem };
      
      if (theorem.status === 'proved' || theorem.status === 'disproved') {
        await new Promise((resolve) => {
           db.get('SELECT * FROM proofs WHERE theorem_id = ? AND is_valid = 1 ORDER BY created_at DESC LIMIT 1', [theorem.id], (err, proof) => {
             if (proof) thm.successful_proof = proof;
             resolve();
           });
        });
      } else if (limit_submissions > 0) {
        await new Promise((resolve) => {
           db.all('SELECT * FROM proofs WHERE theorem_id = ? ORDER BY created_at DESC LIMIT ?', [theorem.id, limit_submissions], (err, proofs) => {
             if (proofs) thm.recent_submissions = proofs;
             resolve();
           });
        });
      }
      
      theoremsWithProofs.push(thm);
    }
    
    res.json({ data: theoremsWithProofs });
  });
});

// GET theorem by id with its proofs
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get(`
    SELECT t.*, u.username as author_name 
    FROM theorems t 
    LEFT JOIN users u ON t.user_id = u.id 
    WHERE t.id = ?
  `, [id], (err, theorem) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!theorem) return res.status(404).json({ error: 'Theorem not found' });

    db.all(`
      SELECT p.*, u.username as prover_name 
      FROM proofs p 
      LEFT JOIN users u ON p.user_id = u.id 
      WHERE p.theorem_id = ? 
      ORDER BY p.created_at DESC
      LIMIT 10
    `, [id], (err, proofs) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ...theorem, proofs });
    });
  });
});

// POST new theorem
router.post('/', optionalAuth, async (req, res) => {
  const { name, statement } = req.body;
  const user_id = req.user ? req.user.id : null;

  if (!name || !statement) {
    return res.status(400).json({ error: 'Name and statement are required' });
  }

  // Generate description using AI
  const description_latex = await generateLatexDescription(name, statement);

  db.run('INSERT INTO theorems (name, statement, description_latex, user_id) VALUES (?, ?, ?, ?)', [name, statement, description_latex, user_id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, name, statement, description_latex, status: 'unproved', user_id });
  });
});

// POST submit a proof
router.post('/:id/prove', optionalAuth, (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const user_id = req.user ? req.user.id : null;

  if (!content) return res.status(400).json({ error: 'Proof content is required' });

  // First, verify theorem exists
  db.get('SELECT * FROM theorems WHERE id = ?', [id], (err, theorem) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!theorem) return res.status(404).json({ error: 'Theorem not found' });

    // Guardrails
    if (/\bsorry\b/.test(content) || /\badmit\b/.test(content)) {
      return res.status(400).json({ error: 'Proof cannot contain "sorry" or "admit"' });
    }

    const match = theorem.statement.match(/(?:theorem|lemma|axiom|def)\s+([^\s({:]+)/);
    const identifier = match ? match[1] : null;

    if (identifier && !content.includes(identifier)) {
      return res.status(400).json({ error: `Proof must contain the declaration for theorem/lemma '${identifier}' or related disproof.` });
    }
    
    // Determine if it's a disproof attempt (simple heuristic: contains identifier_disproved)
    let isDisproofAttempt = false;
    if (identifier && content.includes(`${identifier}_disproved`)) {
      isDisproofAttempt = true;
    }

    // Save proof to a temporary file
    const tempDir = path.join(__dirname, '..', 'tmp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    
    const fileName = `proof_${Date.now()}.lean`;
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, content);

    // Execute Lean compiler
    exec(`lean "${filePath}"`, (error, stdout, stderr) => {
      const outputLog = stdout + (stderr ? '\n' + stderr : '');
      const isValid = !error; // Assuming exit code 0 means success

      // Clean up temp file
      try { fs.unlinkSync(filePath); } catch(e) {}

      // Update theorems and insert proof
      let newStatus = isValid ? (isDisproofAttempt ? 'disproved' : 'proved') : 'unproved';
      let isCompilerMissing = error && (error.message.includes('not found') || error.message.includes('not recognized'));
      
      if (isCompilerMissing || !isValid) {
        newStatus = theorem.status; // remain unchanged if invalid or missing compiler
      }

      db.run('INSERT INTO proofs (theorem_id, user_id, content, is_valid, output_log) VALUES (?, ?, ?, ?, ?)', 
        [id, user_id, content, isValid, outputLog || (error ? error.message : '')], 
      function(errIn) {
        if (errIn) return res.status(500).json({ error: errIn.message });
        const proofId = this.lastID;

        if (isValid && !isCompilerMissing) {
          db.run('UPDATE theorems SET status = ? WHERE id = ?', [newStatus, id], (errUp) => {
             // Award points if we have a user
             if (user_id) {
               db.run('UPDATE users SET points = points + 10 WHERE id = ?', [user_id]);
             }
             res.status(200).json({ 
                success: true, 
                proof: { id: proofId, is_valid: isValid, output_log: outputLog || (error ? error.message : '') },
                compiler_missing: isCompilerMissing
             });
          });
        } else if (isCompilerMissing) {
           res.status(200).json({ 
                success: true, 
                proof: { id: proofId, is_valid: isValid, output_log: outputLog || (error ? error.message : '') },
                compiler_missing: isCompilerMissing
             });
        } else {
           res.status(200).json({ 
                success: true, 
                proof: { id: proofId, is_valid: isValid, output_log: outputLog || error.message },
                compiler_missing: false
             });
        }
      });
    });
  });
});

module.exports = router;
