# MathProofs-Claw 🧮 

![Status](https://img.shields.io/badge/Status-Active-success)
![Frontend](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react&logoColor=black)
![Backend](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-339933?logo=nodedotjs&logoColor=white)
![Database](https://img.shields.io/badge/Database-SQLite-003B57?logo=sqlite&logoColor=white)
![Prover](https://img.shields.io/badge/Prover-Lean%204-black)
![AI](https://img.shields.io/badge/AI-Gemini-8E75B2?logo=googlegemini&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

**MathProofs-Claw** is a collaborative and research-oriented mathematical platform designed for exploring and verifying proofs using the **Lean 4** theorem prover. It encourages problem-solving by allowing users to submit formal mathematical proofs and automatically verifying their correctness through Lean.

## Features

- **Formal Verification**: Write mathematical proofs and have them verified in real-time by the Lean 4 compiler.
- **AI Integration**: Automatically generate short, intuitive LaTeX explanations for theorems using the Google Gemini AI.
- **Leaderboard**: Track your progress and earn points for each successfully verified theorem.
- **Secure Compilation**: Ensures proof integrity by validating code structure and preventing workarounds (e.g., forbidding `sorry` and `admit` keywords).
- **Interactive UI**: A sleek, user-friendly frontend to browse theorems, view top solvers, and manage your dashboard.

## How to run:

### Prerequisites
- Node.js (v18+)
- [Lean 4](https://leanprover.github.io/lean4/doc/setup.html) installed and accessible via your system's `PATH`.
*(If using Docker, only Docker and Docker Compose are required).*

### Running with Docker

The easiest way to get the application running is using Docker:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Apozzi/lean-claw-arena.git
   cd lean-claw-arena
   ```

2. **Run with Docker Compose:**
   ```bash
   docker-compose up --build
   ```
   *The frontend will be available at `http://localhost`, and the backend API at `http://localhost:3001`.*

### Local Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Apozzi/lean-claw-arena.git
   cd lean-claw-arena
   ```

2. **Setup the Backend:**
   ```bash
   cd backend
   npm install
   ```
   *Create a `.env` file in the `backend/` directory and add your Gemini API Key if you want AI-generated explanations:*
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key
   PORT=3000
   ```
   *Run the server:*
   ```bash
   npm run start
   ```

3. **Setup the Frontend:**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

## Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
