import os
import json
import webbrowser
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from http.cookies import SimpleCookie

from datos import repositorio_json as repo
from logica import seguridad
from logica.errores import ErrorNegocio
from logica.usuarios_servicio import (
    registrar_donante, registrar_conductor, registrar_centro,
    iniciar_sesion, actualizar_disponibilidad
)
from logica import donaciones_servicio

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
        # una peticion a la vez toca los datos (ver candado en repositorio_json)
        with repo.candado:
            self.atender_get()

    def atender_get(self):
        ruta = self.path.split("?")[0]

        try:
            # quien esta conectado
            if ruta == "/api/sesion":
                usuario = self.usuario_actual()
                if usuario is None:
                    self.responder_json(200, {"rol": None})
                else:
                    respuesta = {
                        "nombre": usuario["nombre"],
                        "correo": usuario["correo"],
                        "rol": usuario["rol"]
                    }
                    # al conductor tambien le mandamos sus horarios
                    if usuario["rol"] == "conductor":
                        respuesta["disponible"] = usuario.get("disponible", False)
                        respuesta["franjas"] = usuario.get("franjas", [])
                    self.responder_json(200, respuesta)

            # lista de centros (cualquiera la puede ver)
            elif ruta == "/api/centros":
                self.responder_json(200, repo.centros.listar())

            # ----- donante -----
            elif ruta == "/api/mis-donaciones":
                usuario = self.exigir_rol("donante")
                if usuario:
                    self.responder_json(200, donaciones_servicio.donaciones_del_donante(usuario["id"]))

            # ----- conductor -----
            elif ruta == "/api/donaciones/disponibles":
                usuario = self.exigir_rol("conductor")
                if usuario:
                    self.responder_json(200, donaciones_servicio.disponibles_para_recoger())

            elif ruta == "/api/mis-entregas":
                usuario = self.exigir_rol("conductor")
                if usuario:
                    self.responder_json(200, donaciones_servicio.entregas_del_conductor(usuario["id"]))

            # si no es de la API, es un archivo (html, css, js)
            else:
                self.servir_archivo(ruta)

        except ErrorNegocio as e:
            self.responder_json(400, {"error": str(e)})

    # ---------- POST: el navegador envia datos ----------
    def do_POST(self):
        with repo.candado:
            self.atender_post()

    def atender_post(self):
        # se quita lo que venga despues de "?" igual que en GET
        ruta = self.path.split("?")[0]
        # ej: "/api/donaciones/5/cancelar" -> ["", "api", "donaciones", "5", "cancelar"]
        partes = ruta.split("/")

        try:
            datos = self.leer_json()

            # ----- registro e inicio de sesion -----
            if ruta == "/api/registro/donante":
                registrar_donante(datos)
                self.responder_json(201, {"mensaje": "¡Registro exitoso! Ya puede iniciar sesión."})

            elif ruta == "/api/registro/conductor":
                registrar_conductor(datos)
                self.responder_json(201, {"mensaje": "¡Registro exitoso! Ya puede iniciar sesión."})

            elif ruta == "/api/registro/centro":
                registrar_centro(datos)
                self.responder_json(201, {"mensaje": "¡Centro de acopio registrado! Ya puede iniciar sesión."})

            elif ruta == "/api/login":
                usuario = iniciar_sesion(datos.get("correo", ""), datos.get("clave", ""))
                token = seguridad.crear_sesion(usuario["id"])
                cookie = "sesion=" + token + "; Path=/; HttpOnly; SameSite=Lax"
                self.responder_json(200, {"nombre": usuario["nombre"], "rol": usuario["rol"]}, cookie)

            elif ruta == "/api/logout":
                seguridad.cerrar_sesion(self.token())
                self.responder_json(200, {"mensaje": "Sesión cerrada."}, "sesion=; Path=/; Max-Age=0")

            # ----- donante -----
            elif ruta == "/api/donaciones":
                usuario = self.exigir_rol("donante")
                if usuario:
                    donaciones_servicio.publicar(usuario["id"], datos)
                    self.responder_json(201, {"mensaje": "¡Su donación fue publicada! Un conductor la recogerá pronto."})

            # ----- conductor: horarios (RF020) -----
            elif ruta == "/api/disponibilidad":
                usuario = self.exigir_rol("conductor")
                if usuario:
                    actualizar_disponibilidad(usuario["id"], datos.get("disponible", False), datos.get("franjas", []))
                    self.responder_json(200, {"mensaje": "Horarios guardados."})

            # ----- acciones sobre una donacion: /api/donaciones/<id>/<accion> -----
            elif len(partes) == 5 and partes[2] == "donaciones":
                # si el id no es un numero (ej: /api/donaciones/abc/aceptar)
                try:
                    id_donacion = int(partes[3])
                except ValueError:
                    raise ErrorNegocio("La donación no existe.")
                accion = partes[4]

                if accion == "cancelar":
                    usuario = self.exigir_rol("donante")
                    if usuario:
                        donaciones_servicio.cancelar(usuario["id"], id_donacion)
                        self.responder_json(200, {"mensaje": "La donación fue cancelada."})

                elif accion == "aceptar":
                    usuario = self.exigir_rol("conductor")
                    if usuario:
                        donaciones_servicio.aceptar_recogida(usuario["id"], id_donacion)
                        self.responder_json(200, {"mensaje": "¡Recogida aceptada! Ya aparece en «Mis entregas»."})

                elif accion == "completar":
                    usuario = self.exigir_rol("conductor")
                    if usuario:
                        donaciones_servicio.marcar_entregada(usuario["id"], id_donacion)
                        self.responder_json(200, {"mensaje": "Entrega registrada. ¡Gracias por ayudar!"})

                else:
                    self.responder_json(404, {"error": "Ruta no encontrada."})

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
        if not archivo.startswith(CARPETA_WEB + os.sep) or not os.path.isfile(archivo):
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
        largo = int(self.headers.get("Content-Length", 0) or 0)
        if largo == 0:
            return {}
        texto = self.rfile.read(largo).decode("utf-8")
        # si mandan algo que no es JSON (o no es un objeto), error claro en vez de caerse
        try:
            datos = json.loads(texto)
        except ValueError:
            raise ErrorNegocio("Los datos enviados no son válidos.")
        if not isinstance(datos, dict):
            raise ErrorNegocio("Los datos enviados no son válidos.")
        return datos

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

    def exigir_rol(self, rol):
        # devuelve el usuario si tiene sesion y el rol correcto
        # si no, responde con error y devuelve None
        usuario = self.usuario_actual()
        if usuario is None:
            self.responder_json(401, {"error": "Su sesión terminó. Inicie sesión de nuevo."})
            return None
        if usuario["rol"] != rol:
            self.responder_json(403, {"error": "No tiene permiso para hacer esto."})
            return None
        return usuario


# solo arranca si se ejecuta "python app.py"
# (si otro archivo hace "import app", por ejemplo una prueba, no se lanza el servidor)
if __name__ == "__main__":
    servidor = ThreadingHTTPServer(("localhost", 8000), Manejador)
    print("Servidor en http://localhost:8000  (Ctrl + C para detener)")
    webbrowser.open("http://localhost:8000")
    servidor.serve_forever()