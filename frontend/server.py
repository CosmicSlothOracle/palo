from http.server import HTTPServer, SimpleHTTPRequestHandler
import os
import sys


class CustomHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory="public", **kwargs)

    def guess_type(self, path):
        """Guess the type of a file based on its extension"""
        base, ext = os.path.splitext(path)
        if ext == '.js':
            return 'application/javascript'
        if ext == '.css':
            return 'text/css'
        return super().guess_type(path)


def run_server(port):
    try:
        server_address = ('', port)
        httpd = HTTPServer(server_address, CustomHandler)
        print(f"Server running on http://localhost:{port}")
        httpd.serve_forever()
    except PermissionError:
        if port < 8090:
            print(f"Port {port} is not accessible, trying port {port + 1}")
            run_server(port + 1)
        else:
            print(
                "Could not find an available port. Please run as administrator or try a different port.")
            sys.exit(1)
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)


if __name__ == '__main__':
    run_server(8080)
