import re

from datos import repositorio_json as repo
from logica import seguridad
from logica.errores import ErrorNegocio
from logica.ubicacion import leer_punto

VEHICULOS = ["moto", "carro", "camioneta"]
FRANJAS = ["mañana", "tarde", "noche"]
DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
CATEGORIAS = ["Alimentos", "Ropa", "Aseo"]


def validar_celular(telefono):
    # celular colombiano: 10 numeros que empiezan por 3 (ej: 3001234567)
    telefono = str(telefono).replace(" ", "")
    if not (telefono.isdigit() and len(telefono) == 10 and telefono[0] == "3"):
        raise ErrorNegocio("El celular debe tener 10 números y empezar por 3, por ejemplo 3001234567.", campo="telefono")
    return telefono


def validar_placa(placa, vehiculo):
    # placas colombianas: carro y camioneta ABC123, moto ABC12D
    placa = str(placa).replace(" ", "").replace("-", "").upper()
    if vehiculo == "moto":
        ok = re.match(r"^[A-Z]{3}[0-9]{2}[A-Z]$", placa)
        ejemplo = "ABC12D"
    else:
        ok = re.match(r"^[A-Z]{3}[0-9]{3}$", placa)
        ejemplo = "ABC123"
    if not ok:
        raise ErrorNegocio("La placa no es válida. Para " + vehiculo + " debe ser como " + ejemplo + ".", campo="placa")
    return placa


def validar_capacidad_kg(valor):
    # cuantos kilos puede llevar el vehiculo
    try:
        kg = int(valor)
    except (TypeError, ValueError):
        raise ErrorNegocio("La capacidad del vehículo debe ser un número de kilos.", campo="capacidad_kg")
    if kg <= 0 or kg > 5000:
        raise ErrorNegocio("La capacidad del vehículo debe estar entre 1 y 5000 kg.", campo="capacidad_kg")
    return kg


def validar_horario(dias, franjas):
    if not isinstance(dias, list) or not isinstance(franjas, list):
        raise ErrorNegocio("Los días y horarios no son válidos.")
    for d in dias:
        if d not in DIAS:
            raise ErrorNegocio("Día no válido: " + str(d))
    for f in franjas:
        if f not in FRANJAS:
            raise ErrorNegocio("Horario no válido: " + str(f))
    # en el orden de la semana / del dia, sin repetidos
    return [d for d in DIAS if d in dias], [f for f in FRANJAS if f in franjas]


def _datos_basicos(datos):
    # valida lo que piden todos los registros y devuelve el usuario armado
    nombre = datos.get("nombre", "").strip()
    correo = datos.get("correo", "").strip().lower()
    telefono = datos.get("telefono", "").strip()
    ciudad = datos.get("ciudad", "").strip()
    clave = datos.get("clave", "")

    # el primer campo vacio es el que se resalta
    for valor, campo in ((nombre, "nombre"), (telefono, "telefono"), (ciudad, "ciudad"), (correo, "correo")):
        if valor == "":
            raise ErrorNegocio("Todos los campos son obligatorios.", campo=campo)
    # correo con forma de correo: algo@algo.algo
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", correo):
        raise ErrorNegocio("Escriba un correo válido, por ejemplo nombre@correo.com.", campo="correo")
    telefono = validar_celular(telefono)
    if len(clave) < 8:
        raise ErrorNegocio("La contraseña debe tener mínimo 8 caracteres.", campo="clave")
    if datos.get("acepta_privacidad") is not True:
        raise ErrorNegocio("Debe aceptar la política de privacidad para registrarse.", campo="acepta_privacidad")
    # CU-01: si ya tiene cuenta, se le ofrece ir a iniciar sesion
    if len(repo.usuarios.buscar_por("correo", correo)) > 0:
        raise ErrorNegocio("Ya existe una cuenta con ese correo. ¿Quiere iniciar sesión?", campo="correo",
                           accion={"texto": "Iniciar sesión", "href": "/login.html?correo=" + correo})

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

    if vehiculo not in VEHICULOS:
        raise ErrorNegocio("Seleccione un tipo de vehículo: moto, carro o camioneta.", campo="tipo_vehiculo")
    # CU-02: tipo, placa y capacidad del vehiculo
    placa = validar_placa(datos.get("placa", ""), vehiculo)
    capacidad_kg = validar_capacidad_kg(datos.get("capacidad_kg"))
    if zona == "":
        raise ErrorNegocio("Escriba la zona donde puede recoger.", campo="zona")
    dias, franjas = validar_horario(datos.get("dias", []), datos.get("franjas", []))

    usuario["rol"] = "conductor"
    usuario["tipo_vehiculo"] = vehiculo
    usuario["placa"] = placa
    usuario["capacidad_kg"] = capacidad_kg
    usuario["zona"] = zona
    usuario["dias"] = dias
    usuario["franjas"] = franjas
    # sin dias o sin franjas queda "sin disponibilidad" y no puede aceptar recogidas
    usuario["disponible"] = len(dias) > 0 and len(franjas) > 0
    return repo.usuarios.agregar(usuario)


def registrar_centro(datos):
    usuario = _datos_basicos(datos)

    nombre_centro = datos.get("nombre_centro", "").strip()
    direccion = datos.get("direccion", "").strip()
    barrio = datos.get("barrio", "").strip()
    horario = datos.get("horario", "").strip()
    necesidades = datos.get("necesidades", {})

    for valor, campo in ((nombre_centro, "nombre_centro"), (direccion, "direccion"), (barrio, "barrio"), (horario, "horario")):
        if valor == "":
            raise ErrorNegocio("Complete todos los datos del centro.", campo=campo)

    # numeros: si escriben letras, int() da error
    try:
        capacidad = int(datos.get("capacidad_maxima", 0))
    except (TypeError, ValueError):
        raise ErrorNegocio("La capacidad máxima debe ser un número.", campo="capacidad_maxima")

    # el centro tiene que estar en el mapa para que los conductores lleguen
    try:
        latitud, longitud = leer_punto(datos.get("latitud"), datos.get("longitud"), obligatorio=True,
                                       falta="Marque en el mapa dónde queda el centro de acopio.")
    except ErrorNegocio as e:
        raise ErrorNegocio(str(e), campo="mapa-centro")

    if capacidad <= 0:
        raise ErrorNegocio("La capacidad máxima debe ser mayor que cero.", campo="capacidad_maxima")
    if len(necesidades) == 0:
        raise ErrorNegocio("Indique al menos una cosa que necesite el centro.", campo="nec_alimentos")
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

def actualizar_disponibilidad(id_conductor, disponible, franjas, dias=None):
    conductor = repo.usuarios.buscar_por_id(id_conductor)
    # conductores viejos sin dias guardados: se toman todos los dias
    if dias is None:
        dias = conductor.get("dias", DIAS)
    dias, franjas = validar_horario(dias, franjas)

    if disponible and (len(franjas) == 0 or len(dias) == 0):
        raise ErrorNegocio("Si está disponible, marque al menos un día y un horario.")

    conductor["disponible"] = bool(disponible)
    conductor["franjas"] = franjas
    conductor["dias"] = dias
    repo.usuarios.actualizar(conductor)
    return conductor
