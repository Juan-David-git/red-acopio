import os
import webbrowser
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

# carpeta donde estan las paginas (html, css, js)
CARPETA_WEB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "presentacion", "web")

# segun la extension, le decimos al navegador que tipo de archivo es
TIPOS = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
}


class Manejador(BaseHTTPRequestHandler):

    def do_GET(self):
        ruta = self.path.split("?")[0]
        if ruta == "/":
            ruta = "/index.html"

        archivo = os.path.normpath(os.path.join(CARPETA_WEB, ruta.lstrip("/")))

        # que no se puedan pedir archivos por fuera de la carpeta web
        if not archivo.startswith(CARPETA_WEB) or not os.path.isfile(archivo):
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write("<h1>404 - Página no encontrada</h1>".encode("utf-8"))
            return

        extension = os.path.splitext(archivo)[1]
        tipo = TIPOS.get(extension, "application/octet-stream")

        with open(archivo, "rb") as f:
            contenido = f.read()

        self.send_response(200)
        self.send_header("Content-Type", tipo)
        self.end_headers()
        self.wfile.write(contenido)


servidor = ThreadingHTTPServer(("localhost", 8000), Manejador)
print("Servidor en http://localhost:8000  (Ctrl + C para detener)")
webbrowser.open("http://localhost:8000")
servidor.serve_forever()