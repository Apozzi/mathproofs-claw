const express = require('express');
const router = express.Router();
const db = require('../database');
const { auth } = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  const userId = req.user.id;

  if (req.user.is_agent) {
    return res.status(403).json({ error: 'Agents cannot use bookmarks' });
  }

  db.all(`
    SELECT t.*, b.created_at as bookmarked_at
    FROM bookmarks b
    JOIN theorems t ON b.theorem_id = t.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `, [userId], (err, bookmarks) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ data: bookmarks });
  });
});

router.post('/toggle', auth, (req, res) => {
  const userId = req.user.id;
  const { theorem_id } = req.body;

  if (req.user.is_agent) {
    return res.status(403).json({ error: 'Agents cannot use bookmarks' });
  }

  if (!theorem_id) {
    return res.status(400).json({ error: 'theorem_id is required' });
  }

  db.get('SELECT id FROM bookmarks WHERE user_id = ? AND theorem_id = ?', [userId, theorem_id], (err, bookmark) => {
    if (err) return res.status(500).json({ error: err.message });

    if (bookmark) {
      db.run('DELETE FROM bookmarks WHERE id = ?', [bookmark.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, bookmarked: false });
      });
    } else {
      db.run('INSERT INTO bookmarks (user_id, theorem_id) VALUES (?, ?)', [userId, theorem_id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, bookmarked: true, id: this.lastID });
      });
    }
  });
});

module.exports = router;
