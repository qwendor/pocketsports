"""Pocket Sports local server.

Serves index.html over HTTPS (phones need a secure page for motion sensors)
and plain HTTP (for the laptop / local testing). Prints the address to open.

    python serve.py            -> https://<LAN IP>:4235  and  http://localhost:4236
"""
import http.server, ssl, socket, threading, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
HTTPS_PORT = int(os.environ.get('PS_HTTPS', 4235))
HTTP_PORT = int(os.environ.get('PS_HTTP', 4236))


def lan_ips():
    ips = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ips.append(s.getsockname()[0])
        s.close()
    except Exception:
        pass
    try:
        for ip in socket.gethostbyname_ex(socket.gethostname())[2]:
            if ip not in ips and not ip.startswith('127.'):
                ips.append(ip)
    except Exception:
        pass
    return ips or ['127.0.0.1']


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=HERE, **k)

    def do_GET(self):
        if self.path.split('?')[0] == '/ip':
            body = json.dumps({'ips': lan_ips(), 'https': HTTPS_PORT, 'http': HTTP_PORT}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        return super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


class Server(http.server.ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def run_http():
    Server(('0.0.0.0', HTTP_PORT), Handler).serve_forever()


def main():
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(os.path.join(HERE, 'cert.pem'), os.path.join(HERE, 'key.pem'))
    httpsd = Server(('0.0.0.0', HTTPS_PORT), Handler)
    httpsd.socket = ctx.wrap_socket(httpsd.socket, server_side=True)
    threading.Thread(target=run_http, daemon=True).start()
    ips = lan_ips()
    print('POCKET SPORTS is running.')
    print('  TV / laptop screen :  https://%s:%d/   (or http://localhost:%d/)' % (ips[0], HTTPS_PORT, HTTP_PORT))
    print('  Phones scan the QR on screen, or open  https://%s:%d/' % (ips[0], HTTPS_PORT))
    print('  The certificate is self-signed: on the phone tap Advanced / Show details -> continue anyway (once).')
    sys.stdout.flush()
    try:
        httpsd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
