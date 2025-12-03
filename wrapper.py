import subprocess
import time
import os
import sys
import json
import struct

# --- CONFIGURATION ---
HOST_NAME = "com.privacyscanner.torproxy" 

EXTENSION_ID = "ahffcmbngoblnlkjceeinoejdamlgmlm" 

def install_manifest():
    # MODE 1: Installer Logic
    
    executable_path = os.path.abspath(sys.argv[0])
    
    manifest_dir = os.path.expanduser("~/Library/Application Support/Google/Chrome/NativeMessagingHosts")
    manifest_file = os.path.join(manifest_dir, f"{HOST_NAME}.json")

    # Create directory if it doesn't exist
    if not os.path.isdir(manifest_dir):
        os.makedirs(manifest_dir)

    # Manifest content
    manifest = {
        "name": HOST_NAME,
        "description": "Privacy Ledger Tor Proxy Controller",
        "path": executable_path, # Path to PyInstaller executable
        "type": "stdio",
        "allowed_origins": [f"chrome-extension://{EXTENSION_ID}/"]
    }

    try:
        with open(manifest_file, 'w') as f:
            json.dump(manifest, f, indent=4)
        print(f"SUCCESS! Privacy Ledger helper installed.")
        print(f"Manifest installed successfully at: {manifest_file}")
        print(f"You can now close this window and use the Browser Extension.")
        input("Press Enter to exit...")
    except Exception as e:
        print(f"[-] ERROR installing manifest: {e}")
        input("Press Enter to exit...")
    
def get_message():
    """ Reads a message from stdin based on the 4-byte length prefix. """

    try:
        raw_length = sys.stdin.buffer.read(4)
        if not raw_length:
            return None
        message_length = struct.unpack('<I', raw_length)[0]
    except Exception:
        return None

    message = sys.stdin.buffer.read(message_length).decode('utf-8')
    return json.loads(message)

def send_message(message_content):
    """ Writes a message to stdout formatted with the 4-byte length prefix. """
    encoded_content = json.dumps(message_content).encode('utf-8')
    encoded_length = struct.pack('<I', len(encoded_content))
    
    sys.stdout.buffer.write(encoded_length)
    sys.stdout.buffer.write(encoded_content)
    sys.stdout.flush()

def log_debug(message):
    sys.stderr.write(f"[HOST DEBUG] {message}\n")
    sys.stderr.flush()
    log_to_file(message)
    
def get_resource_path(relative_path):
    """ 
    Robustly find resources whether frozen (PyInstaller) or running from source.
    Handles --onefile, --onedir, and Headless Chrome execution.
    """
    if getattr(sys, 'frozen', False):

        if hasattr(sys, '_MEIPASS'):
            # --onefile mode: temp folder
            base_path = sys._MEIPASS
        else:
            # --onedir mode: the folder containing the executable
            base_path = os.path.dirname(sys.executable)
    else:
        # Running as a raw .py script
        base_path = os.path.dirname(os.path.abspath(__file__))

    return os.path.join(base_path, relative_path)

DEBUG_LOG_PATH = os.path.expanduser("~/privacy_ledger_debug.log")

def log_to_file(msg):
    with open(DEBUG_LOG_PATH, "a") as f:
        f.write(f"[{time.strftime('%H:%M:%S')}] {msg}\n")
        
# Configuration

TOR_PROCESS = None
TOR_PORT = "9050" 
TOR_BINARY_PATH = get_resource_path("tor") 

def launch_tor():
    global TOR_PROCESS
    
    # Check if already running
    if TOR_PROCESS:
        return {"status": "Already Running (Process Active)"}

    # Verify binary exists 
    if not os.path.exists(TOR_BINARY_PATH):
        error_msg = f"ERROR: Tor binary not found at: {TOR_BINARY_PATH}"
        log_to_file(error_msg)
        return {"status": "Error", "details": "Binary Not Found"}

    try:

        os.chmod(TOR_BINARY_PATH, 0o755)
        
        cmd = [TOR_BINARY_PATH, "--SocksPort", TOR_PORT]
        
        TOR_PROCESS = subprocess.Popen(
            cmd, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE, 
            text=True
        )
        
        log_to_file(f"Tor started. PID: {TOR_PROCESS.pid}")
        return {"status": "Starting", "port": TOR_PORT}
        
    except Exception as e:
        log_to_file(f"Exception starting Tor: {e}")
        return {"status": "Error", "details": str(e)}
    

def terminate_tor():
    global TOR_PROCESS
    if TOR_PROCESS:
        TOR_PROCESS.terminate()
        TOR_PROCESS.wait()
        TOR_PROCESS = None
        log_debug("Tor process terminated.")
        return {"status": "Terminated"}
    return {"status": "Stopped"}

def main_native_host():
    while True:
        incoming_message = get_message()
        if incoming_message is None:
            # Browser disconnected or shut down
            log_debug("Browser disconnected. Terminating Host and Tor.")
            terminate_tor()
            break
        
        command = incoming_message.get("command")

        if command == "START_TOR":
            response = launch_tor()
            send_message({"response": "TOR_LAUNCHED", "data": response})

        elif command == "STOP_TOR":
            response = terminate_tor()
            send_message({"response": "TOR_STOPPED", "data": response})

        elif command == "GET_STATUS":
            status = {"status": "Running" if TOR_PROCESS else "Idle"}
            send_message({"response": "STATUS_REPORT", "data": status})
def run_native_host():
    # MODE 2: Host Logic (Headless)
    
    log_debug("Native Host Mode Started")
    main_native_host()
    
if __name__ == "__main__":
    # CHECK: MODE 1 or MODE 2
    
    if len(sys.argv) > 1 and sys.argv[1].startswith("chrome-extension://"):
        run_native_host()
    else:
        install_manifest()