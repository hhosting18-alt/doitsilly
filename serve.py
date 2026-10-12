"""DOITSILLY local preview server.

Why not plain `python -m http.server`?
- It answers repeat visits with 304 "Not Modified" (harmless caching, but noisy). This one always sends fresh files.
- Chrome asks every site for /favicon.ico and /.well-known/appspecific/com.chrome.devtools.json. Those
  showed up as 404s. This server answers them quietly.
- Only real problems are printed: if a file the site needs is missing, you'll see it listed.

Run:  python serve.py        (or double-click start.bat)
"""
import http.server
import os
import socket
import sys
import threading
import webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))
QUIET_PATHS = ("/favicon.ico", "/.well-known/", "/apple-touch-icon")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def send_head(self):
        # Drop the browser's "do you have something newer?" headers so the answer is always 200, never 304.
        for name in ("If-Modified-Since", "If-None-Match"):
            while name in self.headers:
                del self.headers[name]
        return super().send_head()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def do_GET(self):
        if self.path.split("?")[0].startswith(QUIET_PATHS):
            self.send_response(204)
            self.end_headers()
            return
        super().do_GET()

    def log_request(self, code="-", size="-"):
        try:
            status = int(code)
        except (TypeError, ValueError):
            return
        if status >= 400:
            print(f"  {status}  {self.path}   <- this file is missing from {ROOT}")

    def log_error(self, *args):
        pass


def free_port(start):
    for port in range(start, start + 20):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise SystemExit("No free port between %d and %d. Close other servers and try again." % (start, start + 19))


def main():
    port = free_port(int(sys.argv[1]) if len(sys.argv) > 1 else 8000)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler)
    url = f"http://localhost:{port}/"
    print(f"DOITSILLY is running at {url}")
    print("Leave this window open while you look at the site. Press Ctrl+C to stop.\n")
    threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
