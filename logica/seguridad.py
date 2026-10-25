import hashlib
import hmac
import secrets


def generar_hash(clave, sal=None):
    # si no nos dan sal, creamos una nueva al azar
    if sal is None:
        sal = secrets.token_hex(8)
    h = hashlib.pbkdf2_hmac("sha256", clave.encode("utf-8"), sal.encode("utf-8"), 100000)
    return h.hex(), sal


def verificar_clave(clave, hash_guardado, sal):
    h, _ = generar_hash(clave, sal)
    # compare_digest compara sin dar pistas por el tiempo que tarda
    return hmac.compare_digest(h, hash_guardado)


# ---------- sesiones ----------
# diccionario en memoria: token -> id del usuario
# (si se reinicia el servidor, todos tienen que volver a iniciar sesion)
sesiones = {}


def crear_sesion(id_usuario):
    token = secrets.token_hex(16)
    sesiones[token] = id_usuario
    return token


def usuario_de_sesion(token):
    # devuelve el id del usuario, o None si el token no existe
    return sesiones.get(token)


def cerrar_sesion(token):
    if token in sesiones:
        del sesiones[token]