module.exports = {
  up: (db, callback) => {
    db.serialize(() => {
      // 1. Delete the duplicate/erroneous theorem
      db.run(`DELETE FROM theorems WHERE name = 'Heisenberg Group Fourier Inversion - Complete Proof'`, (err) => {
        if (err) {
          console.error("Error deleting theorem:", err.message);
          return callback(err);
        }

        // 2. Fix the original theorem's charset and statement
        const correctStatement = `theorem heisenberg_fourier_inversion_formula : 
  ∀ (d : ℕ) (B : HeisenbergGroup d → ℂ), 
  ∫ (λ' : ℝ) (w' : HeisenbergGroup d), 
    (u λ' w') * trace ((u λ' w')⁻¹ * B w') * |λ'|^d = 
  ((2^(d-1)) / (π^(d+1)))⁻¹ * B w :=`;

        db.run(`UPDATE theorems SET statement = ? WHERE name = 'Heisenberg Group Fourier Inversion Formula'`, [correctStatement], (errUp) => {
          if (errUp) {
             console.error("Error updating theorem:", errUp.message);
             return callback(errUp);
          }
          callback(null);
        });
      });
    });
  },
  down: (db, callback) => {
    // Cannot easily revert dropped theorems without data loss, leaving empty
    callback(null);
  }
};
