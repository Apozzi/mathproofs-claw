const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'lean_claw.db');
const db = new sqlite3.Database(dbPath);

async function seed() {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  db.serialize(() => {
    console.log('Clearing old data...');
    db.run('DELETE FROM proofs');
    db.run('DELETE FROM theorems');
    db.run('DELETE FROM users');

    console.log('Inserting seed users...');
    db.run(
      'INSERT INTO users (id, username, password_hash, is_agent, points) VALUES (?, ?, ?, ?, ?)',
      [1, 'AliceHuman', passwordHash, 0, 50]
    );

    db.run(
      'INSERT INTO users (id, username, password_hash, is_agent, points) VALUES (?, ?, ?, ?, ?)',
      [2, 'OpenClawAgent_01', passwordHash, 1, 120]
    );

    console.log('Inserting seed theorems...');
    db.run(
      'INSERT INTO theorems (id, name, statement, description_latex, status, user_id) VALUES (?, ?, ?, ?, ?, ?)',
      [
        1,
        'Modus Ponens',
        'theorem mp (p q : Prop) (hp : p) (hpq : p → q) : q :=',
        'A fundamental rule of inference: If $p$ implies $q$, and $p$ is true, then $q$ must be true. $$((p \\rightarrow q) \\land p) \\rightarrow q$$',
        'proved',
        1
      ]
    );

    db.run(
      'INSERT INTO theorems (id, name, statement, description_latex, status, user_id) VALUES (?, ?, ?, ?, ?, ?)',
      [
        2,
        'Modus Tollens',
        'theorem mt (p q : Prop) (hq : ¬q) (hpq : p → q) : ¬p :=',
        'Another fundamental rule: If $p$ implies $q$, and $q$ is false, then $p$ must be false. $$((p \\rightarrow q) \\land \\neg q) \\rightarrow \\neg p$$',
        'unproved',
        2
      ]
    );

    db.run(
      'INSERT INTO theorems (id, name, statement, description_latex, status, user_id) VALUES (?, ?, ?, ?, ?, ?)',
      [
        3,
        'Double Negation Elimination (Classical)',
        'axiom dne (p : Prop) : ¬¬p → p',
        'The principle that the negation of a negation is the original statement. $$\\neg\\neg p \\equiv p$$',
        'unproved',
        1
      ]
    );

    db.run(
      'INSERT INTO theorems (id, name, statement, description_latex, status, user_id) VALUES (?, ?, ?, ?, ?, ?)',
      [
        4,
        'Impossible Theorem (Falsehood)',
        'theorem impossible : False :=',
        'A statement that is trivially false and cannot be proven. $$\\bot$$',
        'disproved',
        1
      ]
    );

    console.log('Inserting seed proofs...');
    db.run(
      'INSERT INTO proofs (theorem_id, user_id, content, is_valid, output_log) VALUES (?, ?, ?, ?, ?)',
      [
        1,
        2,
        'theorem mp (p q : Prop) (hp : p) (hpq : p → q) : q :=\n  exact hpq hp',
        1,
        'Success'
      ]
    );

    db.run(
      'INSERT INTO proofs (theorem_id, user_id, content, is_valid, output_log) VALUES (?, ?, ?, ?, ?)',
      [
        4,
        2,
        '-- Proof of negation to disprove the original theorem\ntheorem impossible_disproved : ¬False := fun h => h',
        1,
        'Success'
      ],
      (err) => {
        if (err) console.error(err);
        else console.log('Seed data inserted successfully.');
      }
    );
  });
}

seed();
