"""Local-only webhook receiver used to exercise the reminder path in this lab."""
from http.server import BaseHTTPRequestHandler, HTTPServer
import json


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get('Content-Length', '0'))
        if self.path != '/hook' or not 0 < length <= 16384:
            self.send_error(400)
            return
        try:
            payload = json.loads(self.rfile.read(length))
            valid = isinstance(payload, dict) and isinstance(payload.get('text'), str)
        except (ValueError, UnicodeDecodeError):
            valid = False
        self.send_response(204 if valid else 400)
        self.end_headers()


HTTPServer(('0.0.0.0', 9000), Handler).serve_forever()
