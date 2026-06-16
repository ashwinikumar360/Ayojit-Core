# Contributing to Ayojit Core

We welcome contributions to the Ayojit Intelligence civic product suite. Please read this document before setting up your development workspace.

## Development Environment Setup

This project uses a hybrid Next.js frontend and multiple FastAPI microservice backends:

1. **System Prerequisites:**
   - Node.js (v18 or v20)
   - Python (v3.10 or v3.11)
   - SQLite3 and Tesseract OCR installed on your system path.

2. **Installation Steps:**
   - Clone this repository.
   - Run the frontend installation:
     ```bash
     npm install
     ```
   - Initialize and configure the Python virtual environment at the parent directory:
     ```bash
     python -m venv .venv
     # Windows activation
     .venv\Scripts\activate
     # Unix activation
     source .venv/bin/activate
     pip install -r requirements.txt
     ```
   - Copy the `.env.example` file to `.env.local` and configure keys for local execution.

## Branch Naming and Workflow

- Base all changes on the `main` branch.
- Use the following naming convention for feature development and bug fixes:
  - `feat/app-name-feature` (e.g., `feat/pinai-sqlite-loader`)
  - `fix/app-name-bug` (e.g., `fix/hindidiff-magic-check`)
- Keep commits focused. Write descriptive messages (e.g., `feat: integrate Dodo Payments webhook in core/billing.py`).

## Pull Request Checklist

Before submitting a Pull Request, verify that:

- [ ] All code conforms to formatting rules (Black + Isort for Python, Prettier for TypeScript).
- [ ] No local machine learning model weights are loaded in backend applications (offloading must go to remote spaces).
- [ ] All unit tests pass cleanly by running:
  ```bash
  python verify_free_api_stack.py
  ```
- [ ] The standard AIKosh attribution disclaimer footer is included on any new frontend app pages.
- [ ] No raw credentials or API tokens are hardcoded.

## How to Add a New AIKosh Model or Dataset

To integrate a new dataset or model from the AIKosh platform:

1. **Attribution:** Open `AIKOSH_ATTRIBUTION.md` and add the model name, source link, license, and purpose.
2. **Offline Fallback:** Ensure that if the remote server or Hugging Face Space endpoint is down, the code catches the error and falls back to a rule-based generator or localized dictionary lookup without crashing.
3. **Log Compliance:** Add a compliance record inside `core/compliance.py` logging the model name and license version (e.g., Godl-India or MIT) to ensure audit requirements are met.
