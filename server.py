"""
Max Dashboard Python bridge.

The HTML page is the frontend and calls this Python server.
Run:
    python server.py

Then open:
    https://rijwal-lang.github.io/Max-Dashboard/

For local development, allow the page to call localhost when the browser asks.
"""

from http.server import BaseHTTPRequestHandler, HTTPServer
import json

HOST = "127.0.0.1"
PORT = 8765

class Handler(BaseHTTPRequestHandler):
    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_json({"ok": True})

    def do_GET(self):
        if self.path == "/ping":
            self.send_json({"ok": True, "service": "Max Dashboard Python bridge"})
        else:
            self.send_json({"ok": False, "error": "Not found"}, 404)

    def do_POST(self):
        if self.path == "/ping":
            self.send_json({"ok": True})
        else:
            self.send_json({"ok": False, "error": "Not found"}, 404)

    def log_message(self, fmt, *args):
        print("[Max Dashboard]", fmt % args)

if __name__ == "__main__":
    print("Max Dashboard Python bridge")
    print(f"Listening on http://{HOST}:{PORT}")
    print("Keep this window running while using the dashboard.")
    HTTPServer((HOST, PORT), Handler).serve_forever()
