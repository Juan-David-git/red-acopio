import hashlib
import secrets


def generar_hash(clave, sal=None):
    # si no nos dan sal, creamos una nueva al azar
    if sal is None:
        sal = secrets.token_hex(8)
    h = hashlib.pbkdf2_hmac("sha256", clave.encode("utf-8"), sal.encode("utf-8"), 100000)
    return h.hex(), sal


def verificar_clave(clave, hash_guardado, sal):
    h, _ = generar_hash(clave, sal)
    return h == hash_guardado