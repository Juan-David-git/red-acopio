# Perfil de cada usuario: ver y cambiar sus datos, cambiar la contraseña
# y (si es conductor) su vehiculo y su zona en el mapa.

from datos import repositorio_json as repo
from logica import seguridad
from logica.errores import ErrorNegocio
from logica.ubicacion import leer_punto
from logica.usuarios_servicio import VEHICULOS, validar_celular, validar_placa, validar_capacidad_kg

CIUDADES = ["Bucaramanga", "Floridablanca", "Girón", "Piedecuesta"]
RADIOS_KM = [2, 5, 10, 20]

# lo que se puede mostrar de un usuario (nunca la clave ni la sal)
CAMPOS_VISIBLES = ["id", "nombre", "correo", "telefono", "ciudad", "rol",
                   "tipo_vehiculo", "placa", "capacidad_kg", "zona", "dias", "franjas", "disponible",
                   "zona_latitud", "zona_longitud", "radio_km",
                   "direccion", "direccion_latitud", "direccion_longitud"]


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
        raise ErrorNegocio("Escriba su nombre.", campo="nombre")
    if ciudad not in CIUDADES:
        raise ErrorNegocio("Seleccione su ciudad.", campo="ciudad")
    usuario["nombre"] = nombre
    usuario["ciudad"] = ciudad
    usuario["telefono"] = validar_celular(datos.get("telefono", ""))

    # donante: su direccion de siempre, para no escribirla en cada donacion (CU-04)
    if usuario["rol"] == "donante":
        usuario["direccion"] = str(datos.get("direccion", "") or "").strip()[:120]
        lat, lon = leer_punto(datos.get("direccion_latitud"), datos.get("direccion_longitud"), obligatorio=False)
        usuario["direccion_latitud"] = lat
        usuario["direccion_longitud"] = lon

    # datos que solo tiene el conductor
    if usuario["rol"] == "conductor":
        vehiculo = datos.get("tipo_vehiculo", "")
        if vehiculo not in VEHICULOS:
            raise ErrorNegocio("Seleccione un tipo de vehículo: moto, carro o camioneta.", campo="tipo_vehiculo")
        placa = validar_placa(datos.get("placa", ""), vehiculo)
        capacidad_kg = validar_capacidad_kg(datos.get("capacidad_kg"))
        zona = str(datos.get("zona", "")).strip()
        if zona == "":
            raise ErrorNegocio("Escriba la zona donde puede recoger.", campo="zona")

        # punto de su zona en el mapa (opcional) y que tan lejos esta dispuesto a ir
        lat, lon = leer_punto(datos.get("zona_latitud"), datos.get("zona_longitud"), obligatorio=False)
        try:
            radio = int(datos.get("radio_km") or 5)
        except (TypeError, ValueError):
            radio = 5
        if radio not in RADIOS_KM:
            raise ErrorNegocio("Escoja hasta qué distancia puede ir: 2, 5, 10 o 20 km.")

        usuario["tipo_vehiculo"] = vehiculo
        usuario["placa"] = placa
        usuario["capacidad_kg"] = capacidad_kg
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
        raise ErrorNegocio("La contraseña actual no es correcta.", campo="clave_actual")
    if len(nueva) < 8:
        raise ErrorNegocio("La contraseña nueva debe tener mínimo 8 caracteres.", campo="clave_nueva")
    if nueva != confirmar:
        raise ErrorNegocio("La contraseña nueva y la confirmación no coinciden.", campo="clave_confirmar")
    if nueva == actual:
        raise ErrorNegocio("La contraseña nueva debe ser diferente a la actual.", campo="clave_nueva")

    h, sal = seguridad.generar_hash(nueva)
    usuario["clave_hash"] = h
    usuario["sal"] = sal
    repo.usuarios.actualizar(usuario)
