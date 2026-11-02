# Perfil de cada usuario: ver y cambiar sus datos, cambiar la contraseña
# y (si es conductor) su vehiculo y su zona en el mapa.

from datos import repositorio_json as repo
from logica import seguridad
from logica.errores import ErrorNegocio
from logica.ubicacion import leer_punto
from logica.usuarios_servicio import VEHICULOS, validar_celular

CIUDADES = ["Bucaramanga", "Floridablanca", "Girón", "Piedecuesta"]
RADIOS_KM = [2, 5, 10, 20]

# lo que se puede mostrar de un usuario (nunca la clave ni la sal)
CAMPOS_VISIBLES = ["id", "nombre", "correo", "telefono", "ciudad", "rol",
                   "tipo_vehiculo", "zona", "franjas", "disponible",
                   "zona_latitud", "zona_longitud", "radio_km"]


def _buscar(id_usuario):
    usuario = repo.usuarios.buscar_por_id(id_usuario)
    if usuario is None:
        raise ErrorNegocio("La cuenta no existe.")
    return usuario


def ver(id_usuario):
    usuario = _buscar(id_usuario)
    return {k: usuario[k] for k in CAMPOS_VISIBLES if k in usuario}


def actualizar(id_usuario, datos):
    usuario = _buscar(id_usuario)

    nombre = str(datos.get("nombre", "")).strip()
    ciudad = str(datos.get("ciudad", "")).strip()
    if nombre == "":
        raise ErrorNegocio("Escriba su nombre.")
    if ciudad not in CIUDADES:
        raise ErrorNegocio("Seleccione su ciudad.")
    usuario["nombre"] = nombre
    usuario["ciudad"] = ciudad
    usuario["telefono"] = validar_celular(datos.get("telefono", ""))

    # datos que solo tiene el conductor
    if usuario["rol"] == "conductor":
        vehiculo = datos.get("tipo_vehiculo", "")
        if vehiculo not in VEHICULOS:
            raise ErrorNegocio("Seleccione un tipo de vehículo: moto, carro o camioneta.")
        zona = str(datos.get("zona", "")).strip()
        if zona == "":
            raise ErrorNegocio("Escriba la zona donde puede recoger.")

        # punto de su zona en el mapa (opcional) y que tan lejos esta dispuesto a ir
        lat, lon = leer_punto(datos.get("zona_latitud"), datos.get("zona_longitud"), obligatorio=False)
        try:
            radio = int(datos.get("radio_km") or 5)
        except (TypeError, ValueError):
            radio = 5
        if radio not in RADIOS_KM:
            raise ErrorNegocio("Escoja hasta qué distancia puede ir: 2, 5, 10 o 20 km.")

        usuario["tipo_vehiculo"] = vehiculo
        usuario["zona"] = zona
        usuario["zona_latitud"] = lat
        usuario["zona_longitud"] = lon
        usuario["radio_km"] = radio

    repo.usuarios.actualizar(usuario)
    return ver(id_usuario)


def cambiar_clave(id_usuario, datos):
    usuario = _buscar(id_usuario)
    actual = datos.get("actual", "")
    nueva = datos.get("nueva", "")
    confirmar = datos.get("confirmar", "")

    if not seguridad.verificar_clave(actual, usuario["clave_hash"], usuario["sal"]):
        raise ErrorNegocio("La contraseña actual no es correcta.")
    if len(nueva) < 8:
        raise ErrorNegocio("La contraseña nueva debe tener mínimo 8 caracteres.")
    if nueva != confirmar:
        raise ErrorNegocio("La contraseña nueva y la confirmación no coinciden.")
    if nueva == actual:
        raise ErrorNegocio("La contraseña nueva debe ser diferente a la actual.")

    h, sal = seguridad.generar_hash(nueva)
    usuario["clave_hash"] = h
    usuario["sal"] = sal
    repo.usuarios.actualizar(usuario)
