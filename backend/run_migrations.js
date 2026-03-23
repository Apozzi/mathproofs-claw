const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH ||
    (fs.existsSync(path.resolve(__dirname, 'persist'))
        ? path.resolve(__dirname, 'persist', 'lean_claw.db')
        : path.resolve(__dirname, '..', 'data', 'lean_claw.db'));

const db = new sqlite3.Database(dbPath);

console.log(`Using database: ${dbPath}`);

const migrationsDir = path.resolve(__dirname, 'migrations');
if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir);
}

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            run_on DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.all("SELECT name FROM migrations", [], (err, rows) => {
        if (err) {
            console.error('Failed to read migrations table:', err);
            return db.close();
        }

        const executedMigrations = rows.map(r => r.name);

        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.js'))
            .sort();

        let pending = files.filter(f => !executedMigrations.includes(f));

        if (pending.length === 0) {
            console.log('No pending migrations to run.');
            return db.close();
        }

        console.log(`Found ${pending.length} pending migrations.`);

        let index = 0;

        function runNext() {
            if (index >= pending.length) {
                console.log('All migrations completed successfully.');
                return db.close();
            }

            const file = pending[index];
            console.log(`Running migration: ${file}`);
            try {
                const migration = require(path.join(migrationsDir, file));

                migration.up(db, (err) => {
                    if (err) {
                        console.error(`Migration ${file} failed:`, err);
                        return db.close();
                    }

                    db.run("INSERT INTO migrations (name) VALUES (?)", [file], (err) => {
                        if (err) {
                            console.error(`Failed to record migration ${file}:`, err);
                            return db.close();
                        }
                        console.log(`Completed migration: ${file}`);
                        index++;
                        runNext();
                    });
                });
            } catch (err) {
                console.error(`Failed to load or run migration ${file}:`, err);
                db.close();
            }
        }

        runNext();
    });
});
