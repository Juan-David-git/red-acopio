import os
import json
import webbrowser
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from http.cookies import SimpleCookie

from datos import repositorio_json as repo
from logica import seguridad
from logica.usuarios_servicio import registrar_donante, iniciar_sesion, ErrorNegocio

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

    # ---------- GET: el navegador pide algo ----------
    def do_GET(self):
        ruta = self.path.split("?")[0]

        # quien esta conectado
        if ruta == "/api/sesion":
            usuario = self.usuario_actual()
            if usuario is None:
                self.responder_json(200, {"rol": None})
            else:
                self.responder_json(200, {
                    "nombre": usuario["nombre"],
                    "correo": usuario["correo"],
                    "rol": usuario["rol"]
                })
            return

        # si no es de la API, es un archivo (html, css, js)
        self.servir_archivo(ruta)

    # ---------- POST: el navegador envia datos ----------
    def do_POST(self):
        datos = self.leer_json()

        try:
            if self.path == "/api/registro/donante":
                registrar_donante(datos)
                self.responder_json(201, {"mensaje": "¡Registro exitoso! Ya puede iniciar sesión."})

            elif self.path == "/api/login":
                usuario = iniciar_sesion(datos.get("correo", ""), datos.get("clave", ""))
                token = seguridad.crear_sesion(usuario["id"])
                cookie = "sesion=" + token + "; Path=/; HttpOnly; SameSite=Lax"
                self.responder_json(200, {"nombre": usuario["nombre"], "rol": usuario["rol"]}, cookie)

            elif self.path == "/api/logout":
                seguridad.cerrar_sesion(self.token())
                self.responder_json(200, {"mensaje": "Sesión cerrada."}, "sesion=; Path=/; Max-Age=0")

            else:
                self.responder_json(404, {"error": "Ruta no encontrada."})

        except ErrorNegocio as e:
            self.responder_json(400, {"error": str(e)})

    # ---------- ayudas ----------
    def servir_archivo(self, ruta):
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

    def leer_json(self):
        # lee el cuerpo de la peticion y lo convierte a diccionario
        largo = int(self.headers.get("Content-Length", 0))
        if largo == 0:
            return {}
        texto = self.rfile.read(largo).decode("utf-8")
        return json.loads(texto)

    def responder_json(self, codigo, datos, cookie=None):
        # convierte el diccionario a JSON y lo envia
        cuerpo = json.dumps(datos, ensure_ascii=False).encode("utf-8")
        self.send_response(codigo)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(cuerpo)

    def token(self):
        # saca la "manilla" de las cookies que manda el navegador
        cookies = SimpleCookie(self.headers.get("Cookie", ""))
        if "sesion" in cookies:
            return cookies["sesion"].value
        return None

    def usuario_actual(self):
        # devuelve el usuario conectado, o None si no hay sesion
        id_usuario = seguridad.usuario_de_sesion(self.token())
        if id_usuario is None:
            return None
        return repo.usuarios.buscar_por_id(id_usuario)


servidor = ThreadingHTTPServer(("localhost", 8000), Manejador)
print("Servidor en http://localhost:8000  (Ctrl + C para detener)")
webbrowser.open("http://localhost:8000")
servidor.serve_forever()