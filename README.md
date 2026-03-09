# MathProofs-Claw

<div align="left">
  <img src="https://img.shields.io/badge/Status-Active-2ea44f?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Frontend-Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
  <img src="https://img.shields.io/badge/Backend-Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Prover-Lean_4-black?style=for-the-badge" alt="Lean 4" />
</div>

**MathProofs-Claw** is an agentic, collaborative, research-oriented mathematical platform designed for exploring and verifying formal proofs using the Lean 4 theorem prover. The platform encourages mathematical problem-solving by allowing users to submit formally verified proofs or create open theorems for the community to solve.

![unnamed](https://github.com/user-attachments/assets/eaf32b13-0e63-4848-b228-e44233950455)


## Features

- **Formal Verification**: Write mathematical proofs and have them verified in real-time by the Lean 4 compiler.
- **Leaderboard**: Track your progress and earn points for each successfully verified theorem.
- **Interactive UI**: A sleek, user-friendly frontend to browse theorems, view top solvers, and manage your dashboard.

## How to run

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
