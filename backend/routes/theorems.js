const express = require('express');
const router = express.Router();
const db = require('../database');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { auth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const { GoogleGenAI } = require('@google/genai');

// --- Configuration & Initialization ---

const submissionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 40,
  keyGenerator: (req, res) => {
    if (req.user && req.user.id) {
      return `user_${req.user.id}`;
    }
    return req.ip || req.connection?.remoteAddress || 'unknown';
  },
  validate: false,
  message: { error: 'Too many submissions. Please wait before trying again.' }
});

let ai = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

// --- Helper Functions ---

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

function stripComments(content) {
  let contentWithoutComments = content.replace(/--.*$/gm, '');
  let previousContent;
  do {
    previousContent = contentWithoutComments;
    contentWithoutComments = contentWithoutComments.replace(/\/-[\s\S]*?-\//g, '');
  } while (contentWithoutComments !== previousContent);
  return contentWithoutComments;
}

function getTheoremIdentifier(statement) {
  const match = statement.match(/(?:theorem|lemma|axiom|def)\s+([^\s({:]+)/);
  return match ? match[1] : null;
}

function validateCharset(text) {
  if (text.includes('\uFFFD')) {
    return { valid: false, error: 'Statement contains invalid Unicode characters (Replacement Character found).' };
  }

  const qMarkCount = (text.match(/\?/g) || []).length;
  if (text.length > 20 && (qMarkCount / text.length) > 0.1) {
    return { valid: false, error: 'Statement appears to have encoding issues (excessive "?" characters detected).' };
  }

  return { valid: true };
}

function runLeanCompiler(content) {
  return new Promise((resolve) => {
    const tempDir = path.join(__dirname, '..', 'tmp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    const fileName = `proof_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.lean`;
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, content);

    exec(`lake env lean "${filePath}"`, (error, stdout, stderr) => {
      const outputLog = stdout + (stderr ? '\n' + stderr : '');
      const isValid = !error;
      const isCompilerMissing = error && (error.message.includes('not found') || error.message.includes('not recognized'));

      try { fs.unlinkSync(filePath); } catch (e) { }

      resolve({
        isValid,
        isCompilerMissing,
        outputLog: outputLog || (error ? error.message : '')
      });
    });
  });
}

function notifySubscribersAndAwardPoints(userId, theoremId, theoremName, status) {
  if (userId) {
    db.run('UPDATE users SET points = points + 10 WHERE id = ?', [userId]);
  }
  if (status === 'proved' || status === 'disproved') {
    const message = `Theorem "${theoremName}" was recently ${status}!`;
    const link_url = `/theorem/${theoremId}`;
    db.all('SELECT user_id FROM bookmarks WHERE theorem_id = ?', [theoremId], (err, rows) => {
      if (!err && rows && rows.length > 0) {
        const stmt = db.prepare('INSERT INTO notifications (user_id, message, link_url) VALUES (?, ?, ?)');
        rows.forEach(row => {
          if (row.user_id !== userId) {
            stmt.run([row.user_id, message, link_url]);
          }
        });
        stmt.finalize();
      }
    });
  }
}

// --- Route Handlers ---

const getAllTheorems = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const q = req.query.q || '';
  const status = req.query.status || '';

  const conditions = [];
  const params = [];

  if (q) {
    conditions.push('(name LIKE ? OR statement LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  db.get(`SELECT COUNT(*) as count FROM theorems ${whereClause}`, params, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    const total = row.count;
    const totalPages = Math.ceil(total / limit);

    db.all(`SELECT * FROM theorems ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ data: rows, total, page, totalPages, limit });
    });
  });
};

const searchTheorems = (req, res) => {
  const q = req.query.q || '';
  const limit_submissions = parseInt(req.query.submissions) || 0;

  if (!q) {
    return res.status(400).json({ error: 'Search query "q" is required' });
  }

  const searchQuery = `%${q}%`;

  db.all('SELECT * FROM theorems WHERE name LIKE ? OR statement LIKE ? ORDER BY created_at DESC', [searchQuery, searchQuery], async (err, theorems) => {
    if (err) return res.status(500).json({ error: err.message });
    const theoremsWithProofs = [];

    for (const theorem of theorems) {
      const thm = { ...theorem };

      if (theorem.status === 'proved' || theorem.status === 'disproved') {
        await new Promise((resolve) => {
          const shortestProofQuery = `
            SELECT * FROM proofs 
            WHERE theorem_id = ? AND is_valid = 1 
            ORDER BY LENGTH(REPLACE(REPLACE(REPLACE(content, ' ', ''), char(10), ''), char(13), '')) ASC 
            LIMIT 1
          `;
          db.get(shortestProofQuery, [theorem.id], (err, proof) => {
            if (proof) thm.shortest_successful_proof = proof;
            resolve();
          });
        });
      }

      if (limit_submissions > 0) {
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
};

const getTheoremById = (req, res) => {
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
};

const createTheorem = async (req, res) => {
  const { name, statement } = req.body;
  const user_id = req.user ? req.user.id : null;

  if (!name || !statement) {
    return res.status(400).json({ error: 'Name and statement are required' });
  }

  const trimmedStatement = statement.trim();
  if (/\bsorry\b/.test(trimmedStatement)) {
    return res.status(400).json({ error: 'Theorem statement cannot contain "sorry" under any circumstances.' });
  }
  if (!trimmedStatement.endsWith(':=')) {
    return res.status(400).json({ error: 'Theorem statement must end with ":=".' });
  }

  const charsetCheck = validateCharset(trimmedStatement);
  if (!charsetCheck.valid) {
    return res.status(400).json({ error: charsetCheck.error });
  }

  const description_latex = await generateLatexDescription(name, statement);

  db.run('INSERT INTO theorems (name, statement, description_latex, user_id) VALUES (?, ?, ?, ?)', [name, statement, description_latex, user_id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, name, statement, description_latex, status: 'unproved', user_id });
  });
};

const regenerateDescription = async (req, res) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Only administrators can regenerate descriptions.' });
  }
  const { id } = req.params;
  db.get('SELECT * FROM theorems WHERE id = ?', [id], async (err, theorem) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!theorem) return res.status(404).json({ error: 'Theorem not found' });

    const newDescription = await generateLatexDescription(theorem.name, theorem.statement);
    db.run('UPDATE theorems SET description_latex = ? WHERE id = ?', [newDescription, id], (errUp) => {
      if (errUp) return res.status(500).json({ error: errUp.message });
      res.json({ success: true, description_latex: newDescription });
    });
  });
};

const toggleTheoremProblem = (req, res) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Only administrators can flag theorems.' });
  }
  const { id } = req.params;
  db.get('SELECT has_problems FROM theorems WHERE id = ?', [id], (err, theorem) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!theorem) return res.status(404).json({ error: 'Theorem not found' });

    const newStatus = theorem.has_problems ? 0 : 1;
    db.run('UPDATE theorems SET has_problems = ? WHERE id = ?', [newStatus, id], (errUp) => {
      if (errUp) return res.status(500).json({ error: errUp.message });
      res.json({ success: true, has_problems: newStatus });
    });
  });
};

const reEvaluateSubmissions = async (req, res) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Only administrators can re-evaluate submissions.' });
  }
  const { id } = req.params;

  db.get('SELECT * FROM theorems WHERE id = ?', [id], (err, theorem) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!theorem) return res.status(404).json({ error: 'Theorem not found' });

    db.all('SELECT * FROM proofs WHERE theorem_id = ?', [id], async (err, proofs) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!proofs || proofs.length === 0) {
        return res.json({ success: true, message: 'No submissions found to re-evaluate.' });
      }

      let anyValid = false;
      let isDisproved = false;
      const identifier = getTheoremIdentifier(theorem.statement);

      for (const proof of proofs) {
        const contentWithoutComments = stripComments(proof.content);
        let { isValid, isCompilerMissing, outputLog } = await runLeanCompiler(proof.content);

        // Additional guardrails check
        if (/\bsorry\b/.test(contentWithoutComments) || /\badmit\b/.test(contentWithoutComments)) {
          isValid = false;
        }
        if (identifier && !contentWithoutComments.includes(identifier)) {
          isValid = false;
        }
        if (isCompilerMissing) {
          isValid = proof.is_valid;
        }

        await new Promise(resolve => {
          db.run('UPDATE proofs SET is_valid = ?, output_log = ? WHERE id = ?',
            [isValid ? 1 : 0, outputLog, proof.id], () => resolve());
        });

        if (isValid && !isCompilerMissing) {
          anyValid = true;
          if (identifier && contentWithoutComments.includes(`${identifier}_disproved`)) {
            isDisproved = true;
          }
        }
      }

      let newStatus = 'unproved';
      if (anyValid) {
        newStatus = isDisproved ? 'disproved' : 'proved';
      }

      db.run('UPDATE theorems SET status = ? WHERE id = ?', [newStatus, id], (errUp) => {
        if (errUp) return res.status(500).json({ error: errUp.message });
        res.json({ success: true, message: `Re-evaluated ${proofs.length} submissions. New theorem status: ${newStatus}` });
      });
    });
  });
};

const submitProof = (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const user_id = req.user ? req.user.id : null;

  if (!content) return res.status(400).json({ error: 'Proof content is required' });

  db.get('SELECT * FROM theorems WHERE id = ?', [id], async (err, theorem) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!theorem) return res.status(404).json({ error: 'Theorem not found' });

    const contentWithoutComments = stripComments(content);
    const charsetCheck = validateCharset(content);
    if (!charsetCheck.valid) {
      return res.status(400).json({ error: `Proof ${charsetCheck.error}` });
    }

    if (/\bsorry\b/.test(contentWithoutComments) || /\badmit\b/.test(contentWithoutComments)) {
      return res.status(400).json({ error: 'Proof cannot contain "sorry" or "admit"' });
    }

    const identifier = getTheoremIdentifier(theorem.statement);
    if (identifier && !contentWithoutComments.includes(identifier)) {
      return res.status(400).json({ error: `Proof must contain the declaration for theorem/lemma '${identifier}' or related disproof.` });
    }

    const isDisproofAttempt = identifier && contentWithoutComments.includes(`${identifier}_disproved`);

    const { isValid, isCompilerMissing, outputLog } = await runLeanCompiler(content);
    let newStatus = isValid ? (isDisproofAttempt ? 'disproved' : 'proved') : 'unproved';

    if (isCompilerMissing || !isValid) {
      newStatus = theorem.status;
    }

    db.run('INSERT INTO proofs (theorem_id, user_id, content, is_valid, output_log) VALUES (?, ?, ?, ?, ?)',
      [id, user_id, content, isValid, outputLog],
      function (errIn) {
        if (errIn) return res.status(500).json({ error: errIn.message });
        const proofId = this.lastID;

        const responsePayload = {
          success: true,
          proof: { id: proofId, is_valid: isValid, output_log: outputLog },
          compiler_missing: isCompilerMissing
        };

        if (isValid && !isCompilerMissing) {
          db.run('UPDATE theorems SET status = ? WHERE id = ?', [newStatus, id], (errUp) => {
            notifySubscribersAndAwardPoints(user_id, id, theorem.name, newStatus);
            res.status(200).json(responsePayload);
          });
        } else {
          res.status(200).json(responsePayload);
        }
      });
  });
};

// --- Routes Definition ---

router.get('/', getAllTheorems);
router.get('/search', searchTheorems);
router.get('/:id', getTheoremById);
router.post('/', auth, submissionLimiter, createTheorem);
router.post('/:id/regenerate-description', auth, regenerateDescription);
router.post('/:id/toggle-problem', auth, toggleTheoremProblem);
router.post('/:id/re-evaluate-submissions', auth, reEvaluateSubmissions);
router.post('/:id/prove', auth, submissionLimiter, submitProof);

module.exports = router;
