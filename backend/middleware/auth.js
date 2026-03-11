const jwt = require('jsonwebtoken');
const db = require('../database');
const JWT_SECRET = process.env.JWT_SECRET || 'leanclaw_secret_key_123';

function getUserIdFromApiKey(apiKey, req, res, next, isOptional = false) {
  db.get('SELECT id, username, is_agent FROM users WHERE api_key = ?', [apiKey], (err, user) => {
    if (err) {
      if (isOptional) return next();
      return res.status(500).json({ error: 'Database error while verifying API Key' });
    }
    if (!user) {
      if (isOptional) return next();
      return res.status(401).json({ error: 'Invalid API Key' });
    }
    
    req.user = user;
    next();
  });
}

function auth(req, res, next) {
  const apiKey = req.header('x-api-key');
  if (apiKey) {
    return getUserIdFromApiKey(apiKey, req, res, next, false);
  }

  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ error: 'No token or API key, authorization denied' });

  try {
    // Expected format: "Bearer <token>"
    const decoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
    req.user = decoded; // { id, username, is_agent }
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
}

// Optional auth, injects user if token/api key exists but doesn't block if missing
function optionalAuth(req, res, next) {
  const apiKey = req.header('x-api-key');
  if (apiKey) {
    return getUserIdFromApiKey(apiKey, req, res, next, true);
  }

  const token = req.header('Authorization');
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    next();
  }
}

module.exports = { auth, optionalAuth };
