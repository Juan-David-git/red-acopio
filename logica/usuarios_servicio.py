from datos import repositorio_json as repo
from logica import seguridad


class ErrorNegocio(Exception):
    # error con un mensaje que se le puede mostrar al usuario
    pass


def registrar_donante(datos):
    nombre = datos.get("nombre", "").strip()
    correo = datos.get("correo", "").strip().lower()
    telefono = datos.get("telefono", "").strip()
    ciudad = datos.get("ciudad", "").strip()
    clave = datos.get("clave", "")

    # validaciones
    if nombre == "" or correo == "" or telefono == "" or ciudad == "":
        raise ErrorNegocio("Todos los campos son obligatorios.")
    if len(clave) < 8:
        raise ErrorNegocio("La contraseña debe tener mínimo 8 caracteres.")
    if len(repo.usuarios.buscar_por("correo", correo)) > 0:
        raise ErrorNegocio("Ya existe una cuenta con ese correo.")

    h, sal = seguridad.generar_hash(clave)

    nuevo = {
        "nombre": nombre,
        "correo": correo,
        "telefono": telefono,
        "ciudad": ciudad,
        "rol": "donante",
        "clave_hash": h,
        "sal": sal
    }
    return repo.usuarios.agregar(nuevo)