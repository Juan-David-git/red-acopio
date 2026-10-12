from datos import repositorio_json as repo
from logica import seguridad

VEHICULOS = ["moto", "carro", "camioneta"]
FRANJAS = ["mañana", "tarde", "noche"]
CATEGORIAS = ["Alimentos", "Ropa", "Aseo"]


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


def registrar_centro(datos):
    usuario = _datos_basicos(datos)

    nombre_centro = datos.get("nombre_centro", "").strip()
    direccion = datos.get("direccion", "").strip()
    barrio = datos.get("barrio", "").strip()
    horario = datos.get("horario", "").strip()
    necesidades = datos.get("necesidades", {})

    if nombre_centro == "" or direccion == "" or barrio == "" or horario == "":
        raise ErrorNegocio("Complete todos los datos del centro.")

    # numeros: si escriben letras, int() o float() dan error
    try:
        capacidad = int(datos.get("capacidad_maxima", 0))
        latitud = float(datos.get("latitud", 0))
        longitud = float(datos.get("longitud", 0))
    except ValueError:
        raise ErrorNegocio("La capacidad y la ubicación deben ser números.")

    if capacidad <= 0:
        raise ErrorNegocio("La capacidad máxima debe ser mayor que cero.")
    if len(necesidades) == 0:
        raise ErrorNegocio("Indique al menos una cosa que necesite el centro.")
    for categoria in necesidades:
        if categoria not in CATEGORIAS:
            raise ErrorNegocio("Categoría no válida: " + categoria)

    # 1. guardar al encargado
    usuario["rol"] = "gestor"
    usuario = repo.usuarios.agregar(usuario)

    # 2. guardar el centro, unido al encargado por id_gestor
    centro = {
        "id_gestor": usuario["id"],
        "nombre": nombre_centro,
        "direccion": direccion,
        "barrio": barrio,
        "ciudad": usuario["ciudad"],
        "horario": horario,
        "latitud": latitud,
        "longitud": longitud,
        "capacidad_maxima": capacidad,
        "necesidades": necesidades
    }
    repo.centros.agregar(centro)
    return usuario


def iniciar_sesion(correo, clave):
    correo = correo.strip().lower()

    encontrados = repo.usuarios.buscar_por("correo", correo)
    if len(encontrados) == 0:
        raise ErrorNegocio("Correo o contraseña incorrectos.")

    usuario = encontrados[0]
    if not seguridad.verificar_clave(clave, usuario["clave_hash"], usuario["sal"]):
        raise ErrorNegocio("Correo o contraseña incorrectos.")

    return usuario