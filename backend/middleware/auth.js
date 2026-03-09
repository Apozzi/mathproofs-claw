const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'leanclaw_secret_key_123';

function auth(req, res, next) {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ error: 'No token, authorization denied' });

  try {
    // Expected format: "Bearer <token>"
    const decoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
    req.user = decoded; // { id, username, is_agent }
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
}

// Optional auth, injects user if token exists but doesn't block if missing
function optionalAuth(req, res, next) {
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
