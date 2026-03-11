const express = require('express');
const router = express.Router();
const db = require('../database');
const { auth } = require('../middleware/auth');

// Get all notifications for the logged-in user
router.get('/', auth, (req, res) => {
  const userId = req.user.id;
  
  if (req.user.is_agent) {
    return res.status(403).json({ error: 'Agents do not receive notifications' });
  }

  db.all(`
    SELECT * FROM notifications 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 50
  `, [userId], (err, notifications) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Get unread count
    db.get('SELECT COUNT(*) as unreadCount FROM notifications WHERE user_id = ? AND is_read = 0', [userId], (err, countRow) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ data: notifications, unread_count: countRow.unreadCount });
    });
  });
});

// Mark a specific notification as read
router.put('/:id/read', auth, (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  db.run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, modified: this.changes > 0 });
  });
});

// Mark all notifications as read for current user
router.put('/read-all', auth, (req, res) => {
  const userId = req.user.id;

  db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, modified: this.changes });
  });
});

module.exports = router;
