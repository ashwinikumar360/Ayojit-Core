# Running the Ayojit 5-App Suite Locally

This workspace has been configured with a unified orchestrator script to run all 5 FastAPI backend servers and the Next.js frontend website simultaneously with a single command.

## Prerequisites

Make sure you have the following installed on your system:
1. **Python 3.10+** (the project's `.venv` is configured)
2. **Node.js (including npm)**

---

## Quick Start

1. Open your terminal in the workspace directory (`c:\Users\ASHWINI\Downloads\ai kosh`).
2. Run the orchestrator script:
   ```bash
   .venv\Scripts\python.exe run_suite.py
   ```
   *If `.venv` is not configured, you can run:*
   ```bash
   python run_suite.py
   ```

3. The script will automatically:
   - Run `npm install` to download and install all frontend packages.
   - Start all 5 Python FastAPI backend servers on ports `8000` to `8004`.
   - Start the Next.js development server on `http://localhost:3000`.

4. Open your browser and navigate to **[http://localhost:3000](http://localhost:3000)** to access the unified Neo-Brutalism dashboard and test all 5 apps!

---

## Stopping the Suite

Press **`Ctrl+C`** in the terminal where the script is running. The script will intercept the interrupt and cleanly terminate all backend servers and the frontend server, leaving no orphaned processes.
