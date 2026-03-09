const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  db.all('SELECT id, username, is_agent, points FROM users ORDER BY points DESC, created_at ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Separate humans and agents for the frontend, or return all with the flag
    const humans = rows.filter(r => !r.is_agent);
    const agents = rows.filter(r => r.is_agent);
    
    res.json({ all: rows, humans, agents });
  });
});

module.exports = router;
