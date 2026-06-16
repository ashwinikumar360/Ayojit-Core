import os
import sys
import time
import subprocess
import signal

# Dynamic Neo-Brutalism ASCII banner
BANNER = """
============================================================
  AAA   II  K   K   OOO   SSS  H   H
 A   A  II  K  K   O   O S     H   H
 AAAAA  II  KKK    O   O  SSS  HHHHH
 A   A  II  K  K   O   O     S H   H
 A   A  II  K   K   OOO   SSS  H   H
             AIKOSH 5-APP SUITE
============================================================
[SYSTEM] Starting all 5 app backends + Next.js frontend...
[CTRL+C] Press Ctrl+C at any time to shut down the suite.
============================================================
"""

# Ports mapping
SERVICES = {
    "Kisan Voice AI": {"cmd": ["uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"], "port": 8000, "cwd": "kisan-voice-ai"},
    "PinAI":          {"cmd": ["uvicorn", "pinai.backend.main:app", "--host", "127.0.0.1", "--port", "8001"], "port": 8001},
    "DocPatram":      {"cmd": ["uvicorn", "docpatram.backend.main:app", "--host", "127.0.0.1", "--port", "8002"], "port": 8002},
    "VaadVivaad":     {"cmd": ["uvicorn", "vaadvivaad.backend.main:app", "--host", "127.0.0.1", "--port", "8003"], "port": 8003},
    "HindiDiff":      {"cmd": ["uvicorn", "hindidiff.backend.main:app", "--host", "127.0.0.1", "--port", "8004"], "port": 8004},
}

processes = []

def cleanup(sig=None, frame=None):
    print("\n[SYSTEM] Shutting down all services gracefully...")
    for name, p in processes:
        try:
            print(f"[SYSTEM] Terminating {name}...")
            # Use taskkill on Windows to ensure child processes are also terminated
            if sys.platform == "win32":
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(p.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                p.terminate()
        except Exception as e:
            pass
    print("[SYSTEM] All services stopped. Goodbye!\n")
    sys.exit(0)

# Register signal handler for clean shutdown
signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

def main():
    print(BANNER)
    
    # 1. Check/Install Frontend dependencies
    if not os.path.exists("node_modules"):
        print("[SYSTEM] node_modules not found. Installing frontend dependencies...")
        try:
            # Run npm install
            subprocess.run(["npm", "install"], check=True)
            print("[SYSTEM] Frontend dependencies successfully installed.")
        except subprocess.CalledProcessError as e:
            print(f"[ERROR] npm install failed: {str(e)}")
            print("[SYSTEM] Make sure Node.js (npm) is installed on your system.")
            sys.exit(1)
            
    # 2. Launch FastAPI Backends
    python_exe = os.path.join(".venv", "Scripts", "python.exe") if sys.platform == "win32" else os.path.join(".venv", "bin", "python")
    if not os.path.exists(python_exe):
        python_exe = sys.executable  # Fallback to system python if venv not found
    python_exe = os.path.abspath(python_exe)
        
    print(f"[SYSTEM] Using Python interpreter: {python_exe}")

    for name, config in SERVICES.items():
        cmd = [python_exe, "-m"] + config["cmd"]
        cwd = config.get("cwd")
        if cwd:
            cwd = os.path.abspath(cwd)
        print(f"[SYSTEM] Launching {name} on port {config['port']}...")
        p = subprocess.Popen(
            cmd,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        processes.append((name, p))
        
    # Give backends a couple of seconds to spin up
    time.sleep(2)
    
    # 3. Launch Next.js Frontend
    print("[SYSTEM] Launching Next.js frontend website on port 3000...")
    frontend_cmd = ["npm", "run", "dev"] if sys.platform != "win32" else ["npm.cmd", "run", "dev"]
    try:
        p_front = subprocess.Popen(
            frontend_cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        processes.append(("Next.js Frontend", p_front))
    except Exception as e:
        print(f"[ERROR] Failed to start Next.js frontend: {str(e)}")
        cleanup()

    print("\n============================================================\n")
    print("[SYSTEM] All services are running! Access the suite:")
    print(" - Website:      http://localhost:3000")
    print(" - Kisan Voice:  http://localhost:8000")
    print(" - PinAI:        http://localhost:8001")
    print(" - DocPatram:    http://localhost:8002")
    print(" - VaadVivaad:   http://localhost:8003")
    print(" - HindiDiff:    http://localhost:8004")
    print("\n============================================================\n")

    # Monitor outputs and output them to terminal dynamically
    while True:
        for name, p in processes:
            # Check if process died
            ret = p.poll()
            if ret is not None:
                print(f"[CRITICAL] {name} has terminated with exit code {ret}.")
                cleanup()
                
            # Read line from stdout if available (non-blocking simulation)
            # To keep it simple and responsive, we sleep a bit and check
        time.sleep(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        cleanup()
