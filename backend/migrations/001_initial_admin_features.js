module.exports = {
  up: (db, callback) => {
    db.serialize(async () => {

      const runQuery = (query, params = []) => {
        return new Promise((resolve) => {
          db.run(query, params, function (err) {
            if (err && !err.message.includes('duplicate column name')) {
              console.error(`Migration step failed: ${err.message}`);
              resolve(err);
            } else {
              resolve(null);
            }
          });
        });
      };

      const err1 = await runQuery('ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0');
      if (err1) return callback(err1);

      const err2 = await runQuery('ALTER TABLE theorems ADD COLUMN has_problems BOOLEAN DEFAULT 0');
      if (err2) return callback(err2);

      try {

        db.get('SELECT id FROM users WHERE username = ?', ['Apozzi'], (err, row) => {
          if (err) return callback(err);

          if (row) {
            db.run('UPDATE users SET is_admin = 1 WHERE username = ?', ['Apozzi'], (errUp) => {
              callback(errUp);
            });
          }
        });
      } catch (err3) {
        callback(err3);
      }
    });
  },
  down: (db, callback) => {
    callback(null);
  }
};
