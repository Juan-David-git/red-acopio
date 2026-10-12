from datos import repositorio_json as repo
from logica import seguridad

VEHICULOS = ["moto", "carro", "camioneta"]
FRANJAS = ["mañana", "tarde", "noche"]


class ErrorNegocio(Exception):
    # error con un mensaje que se le puede mostrar al usuario
    pass


def _datos_basicos(datos):
    # valida lo que piden todos los registros y devuelve el usuario armado
    nombre = datos.get("nombre", "").strip()
    correo = datos.get("correo", "").strip().lower()
    telefono = datos.get("telefono", "").strip()
    ciudad = datos.get("ciudad", "").strip()
    clave = datos.get("clave", "")

    if nombre == "" or correo == "" or telefono == "" or ciudad == "":
        raise ErrorNegocio("Todos los campos son obligatorios.")
    if len(clave) < 8:
        raise ErrorNegocio("La contraseña debe tener mínimo 8 caracteres.")
    if len(repo.usuarios.buscar_por("correo", correo)) > 0:
        raise ErrorNegocio("Ya existe una cuenta con ese correo.")

    h, sal = seguridad.generar_hash(clave)
    return {
        "nombre": nombre,
        "correo": correo,
        "telefono": telefono,
        "ciudad": ciudad,
        "clave_hash": h,
        "sal": sal
    }


def registrar_donante(datos):
    usuario = _datos_basicos(datos)
    usuario["rol"] = "donante"
    return repo.usuarios.agregar(usuario)


def registrar_conductor(datos):
    usuario = _datos_basicos(datos)

    vehiculo = datos.get("tipo_vehiculo", "")
    zona = datos.get("zona", "").strip()
    franjas = datos.get("franjas", [])

    if vehiculo not in VEHICULOS:
        raise ErrorNegocio("Seleccione un tipo de vehículo: moto, carro o camioneta.")
    if zona == "":
        raise ErrorNegocio("Escriba la zona donde puede recoger.")
    for f in franjas:
        if f not in FRANJAS:
            raise ErrorNegocio("Horario no válido: " + f)

    usuario["rol"] = "conductor"
    usuario["tipo_vehiculo"] = vehiculo
    usuario["zona"] = zona
    usuario["franjas"] = franjas
    usuario["disponible"] = len(franjas) > 0
    return repo.usuarios.agregar(usuario)