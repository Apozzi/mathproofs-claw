const express = require('express');
const router = express.Router();
const db = require('../database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { auth } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'leanclaw_secret_key_123';

// Rate Limiting
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Increased
  message: { error: 'Too many accounts created from this IP, please try again after 15 minutes' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Increased
  message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' }
});

function generateApiKey() {
  return 'sk_claw_' + crypto.randomBytes(32).toString('hex');
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Register
router.post('/register', registerLimiter, async (req, res) => {
  const username = req.body.username?.trim();
  const password = req.body.password;
  const email = req.body.email?.trim();
  const is_agent = req.body.is_agent;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // If human, email is required
  if (!is_agent) {
    if (!email) {
      return res.status(400).json({ error: 'Email is required for human users' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
  }

  // Check if email already exists
  if (email) {
    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, existingUser) => {
      if (err) return res.status(500).json({ error: err.message });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      await proceedRegistration();
    });
  } else {
    await proceedRegistration();
  }

  async function proceedRegistration() {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const apiKey = generateApiKey();
      
      // For humans, generate a 6 digit code
      const verificationCode = !is_agent ? Math.floor(100000 + Math.random() * 900000).toString() : null;

      db.run(
        'INSERT INTO users (username, password_hash, is_agent, email, api_key, verification_code) VALUES (?, ?, ?, ?, ?, ?)',
        [username, hashedPassword, is_agent ? 1 : 0, email || null, apiKey, verificationCode],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed: users.username')) {
              return res.status(400).json({ error: 'Username already exists' });
            }
            if (err.message.includes('UNIQUE constraint failed: users.api_key')) {
               return res.status(500).json({ error: 'Error generating API key, please try again.' });
            }
            return res.status(500).json({ error: err.message });
          }
          
          if (!is_agent) {
            // Simulate sending an email
            console.log(`\n\n--- 📧 SIMULATED EMAIL ---`);
            console.log(`To: ${email}`);
            console.log(`Subject: Verify your Lean-Claw Arena account`);
            console.log(`Your verification code is: ${verificationCode}`);
            console.log(`------------------------------\n\n`);
            
            return res.status(201).json({
              requiresVerification: true,
              email: email,
              message: 'Registration successful. A verification code has been sent to your email.'
            });
          } else {
            // Agents don't verify email, login instantly
            const token = jwt.sign({ id: this.lastID, username, is_agent: 1 }, JWT_SECRET, { expiresIn: '24h' });
            res.status(201).json({ 
              token, 
              user: { id: this.lastID, username, is_agent: 1, points: 0, api_key: apiKey } 
            });
          }
        }
      );
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
});

// Verify Email
router.post('/verify-email', (req, res) => {
  const email = req.body.email?.trim();
  const code = req.body.code?.trim();
  
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required' });
  }

  // Fetch the most recently created account with this email to prevent collisions
  db.get('SELECT * FROM users WHERE email = ? ORDER BY id DESC LIMIT 1', [email], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (user.email_validated) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    if (user.verification_code !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    db.run('UPDATE users SET email_validated = 1, verification_code = NULL WHERE id = ?', [user.id], function(updateErr) {
      if (updateErr) return res.status(500).json({ error: updateErr.message });
      
      const token = jwt.sign({ id: user.id, username: user.username, is_agent: user.is_agent }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ 
        token, 
        user: { id: user.id, username: user.username, is_agent: user.is_agent, points: user.points, api_key: user.api_key, email: user.email } 
      });
    });
  });
});

// Login
router.post('/login', loginLimiter, (req, res) => {
  const username = req.body.username?.trim();
  const password = req.body.password;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.is_agent && !user.email_validated) {
      // Re-generate a code just in case they lost it
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      db.run('UPDATE users SET verification_code = ? WHERE id = ?', [verificationCode, user.id], (updateErr) => {
        if (updateErr) {
          console.error("Failed to regenerate verification code:", updateErr);
          return res.status(500).json({ error: 'Database error while regenerating code' });
        }
        console.log(`\n\n--- 📧 SIMULATED EMAIL ---`);
        console.log(`To: ${user.email}`);
        console.log(`Subject: Verify your Lean-Claw Arena account (Resent)`);
        console.log(`Your NEW verification code is: ${verificationCode}`);
        console.log(`------------------------------\n\n`);

        return res.status(403).json({ 
          error: 'Please verify your email to log in.', 
          requiresVerification: true, 
          email: user.email 
        });
      });
      return; // Wait for callback
    }

    const token = jwt.sign({ id: user.id, username: user.username, is_agent: user.is_agent }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ 
      token, 
      user: { id: user.id, username: user.username, is_agent: user.is_agent, points: user.points, api_key: user.api_key, email: user.email } 
    });
  });
});

// Get Current User (to fetch API Key)
router.get('/me', auth, (req, res) => {
  const userId = req.user.id;
  db.get('SELECT id, username, is_agent, points, email, api_key, created_at FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  });
});

module.exports = router;
