const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const dbPath = path.resolve(__dirname, 'lean_claw.db');
const db = new sqlite3.Database(dbPath);

// Initialize Gemini (read from env)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateLatexDescription(name, statement) {
  try {
    const prompt = `Given the following Lean 4 theorem name '${name}' and statement '${statement}', provide a short, mathematical explanation using LaTeX format. Only return the explanation text with inline $\\dots$ or display $$\\dots$$ math. Do not wrap it in markdown code blocks. Make it short and intuitive.`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });
    return response.text.trim();
  } catch (err) {
    console.error(`Error generating LaTeX for ${name}:`, err);
    return null;
  }
}

async function run() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set.");
    process.exit(1);
  }

  console.log('Fetching theorems from database...');
  db.all('SELECT id, name, statement FROM theorems', [], async (err, rows) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    
    for (const row of rows) {
      console.log(`Generating LaTeX for: ${row.name}`);
      const latex = await generateLatexDescription(row.name, row.statement);
      
      if (latex) {
        await new Promise((resolve, reject) => {
          db.run('UPDATE theorems SET description_latex = ? WHERE id = ?', [latex, row.id], function(err) {
            if (err) reject(err);
            else resolve();
          });
        });
        console.log(`Updated theorem ID ${row.id}`);
      }
    }
    console.log('Finished updating all theorems.');
    process.exit(0);
  });
}

run();
