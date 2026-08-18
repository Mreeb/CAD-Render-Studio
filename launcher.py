import os
import sys
import time
import webbrowser
import threading
import uvicorn

# Add base directory to sys.path for module resolution
def get_base_dir():
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))

base_dir = get_base_dir()
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

def open_browser():
    time.sleep(1.8)
    webbrowser.open("http://127.0.0.1:8000")

def main():
    print("============================================================")
    print("  Starting CAD Product Render Manager...")
    print("  Opening browser at http://127.0.0.1:8000 ...")
    print("============================================================")

    # Launch browser automatically
    threading.Thread(target=open_browser, daemon=True).start()

    # Import app and start uvicorn server
    from backend.app.main import app
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="warning")

if __name__ == "__main__":
    main()
