import os
import sys
import time
import socket
import atexit
import subprocess
import requests
import opendataloader_pdf

# 1. Configuration
HOST = "127.0.0.1"
PORT = 5002
URL = f"http://{HOST}:{PORT}"
VENV_HYBRID_BIN = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", ".venv", "bin", "opendataloader-pdf-hybrid")
)
DOCS_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(DOCS_DIR, "output")

server_process = None

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex((HOST, port)) == 0

def cleanup_server():
    global server_process
    if server_process:
        print("Stopping local hybrid server...", flush=True)
        server_process.terminate()
        try:
            server_process.wait(timeout=5)
            print("Local hybrid server stopped successfully.", flush=True)
        except subprocess.TimeoutExpired:
            print("Forcing local hybrid server shutdown...", flush=True)
            server_process.kill()
            server_process.wait()
        server_process = None

# Register clean-up handler to guarantee the server is stopped when exiting
atexit.register(cleanup_server)

def start_hybrid_server():
    global server_process
    
    # Check if a server is already running on port 5002
    if is_port_in_use(PORT):
        print(f"Port {PORT} is already in use. Checking if it's the hybrid server...", flush=True)
        try:
            # Test if it responds to HTTP requests
            res = requests.get(URL, timeout=2)
            print("Found an active server running on port 5002. Reusing it.", flush=True)
            return
        except Exception:
            print(f"WARNING: Port {PORT} is open but not responding correctly. Will attempt to proceed.", flush=True)
            return

    # Start the server using the virtualenv's binary
    print(f"Starting local hybrid server on port {PORT}...", flush=True)
    cmd = [VENV_HYBRID_BIN, "--host", HOST, "--port", str(PORT)]
    
    # Run the server in a separate process
    server_process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Poll health-check endpoint
    print("Waiting for local hybrid server to initialize and load models (this may take longer on first run)...", flush=True)
    start_time = time.time()
    timeout = 180  # allow up to 3 minutes for weights downloading and loading on first run
    while time.time() - start_time < timeout:
        # Check if the process has died unexpectedly
        if server_process.poll() is not None:
            stdout, stderr = server_process.communicate()
            print("Local hybrid server failed to start!", file=sys.stderr)
            print(f"Exit code: {server_process.returncode}", file=sys.stderr)
            print(f"Stdout:\n{stdout}", file=sys.stderr)
            print(f"Stderr:\n{stderr}", file=sys.stderr)
            sys.exit(1)
            
        try:
            res = requests.get(URL, timeout=1)
            if res.status_code < 500: # FastAPI usually returns 200 or 404
                print(f"Local hybrid server is ready after {time.time() - start_time:.2f} seconds!", flush=True)
                return
        except requests.exceptions.RequestException:
            pass
        time.sleep(2)
        
    print("Error: Local hybrid server failed to start within the timeout period.", file=sys.stderr)
    sys.exit(1)

def main():
    start_hybrid_server()
    
    # 2. Gather PDF files in the docs/ directory
    pdf_files = []
    for file in os.listdir(DOCS_DIR):
        if file.lower().endswith(".pdf"):
            pdf_files.append(os.path.join(DOCS_DIR, file))
            
    if not pdf_files:
        print("No PDF files found in docs/ directory to convert.", file=sys.stderr)
        return
        
    print(f"Discovered {len(pdf_files)} PDF files to convert:", flush=True)
    for pdf in pdf_files:
        print(f"  - {os.path.basename(pdf)}", flush=True)
        
    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # 3. Perform batch conversion using OpenDataLoader PDF's Hybrid AI Mode
    print("\nStarting batch PDF conversion with OpenDataLoader Hybrid Mode...", flush=True)
    print("Using Docling Fast local backend on port 5002.", flush=True)
    
    try:
        opendataloader_pdf.convert(
            input_path=pdf_files,
            output_dir=OUTPUT_DIR,
            format=["markdown", "json"],
            image_output="external",
            hybrid="docling-fast",
            hybrid_mode="full",  # send all pages to local AI models for maximum structural fidelity
            hybrid_url=URL,
            hybrid_fallback=True,  # fall back to standard parser if a page fails
            quiet=False
        )
        print("\nBatch PDF conversion completed successfully!", flush=True)
        print(f"Converted files saved to: {OUTPUT_DIR}", flush=True)
    except Exception as e:
        print(f"\nError occurred during PDF conversion: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        # Shut down server process
        cleanup_server()

if __name__ == "__main__":
    main()