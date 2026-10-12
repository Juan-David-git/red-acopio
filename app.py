import webbrowser
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler


class Manejador(BaseHTTPRequestHandler):

    def do_GET(self):
        with open("presentacion/web/index.html", "rb") as archivo:
            contenido = archivo.read()

        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(contenido)


servidor = ThreadingHTTPServer(("localhost", 8000), Manejador)
print("Servidor en http://localhost:8000  (Ctrl + C para detener)")
webbrowser.open("http://localhost:8000")
servidor.serve_forever()