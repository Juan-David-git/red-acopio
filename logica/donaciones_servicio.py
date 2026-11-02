# Logica de donaciones
# Donante: RF002 publicar, RF010 ver estado, RF016 cancelar
# Conductor: RF005 ver entregas (y aceptar recogida), RF006 marcar entregada

from datos import repositorio_json as repo
from logica.errores import ErrorNegocio
from logica.estados import ahora, estado_de
from logica.usuarios_servicio import CATEGORIAS
from logica.ubicacion import leer_punto

MODALIDADES = ["recogida", "personal"]


# ======================= DONANTE =======================

def publicar(id_donante, datos):
    categoria = datos.get("categoria", "")
    articulo = datos.get("articulo", "").strip()
    descripcion = datos.get("descripcion", "").strip()
    direccion = datos.get("direccion_recogida", "").strip()

    try:
        cantidad = int(datos.get("cantidad", 0))
        id_centro = int(datos.get("id_centro") or 0)
    except (TypeError, ValueError):
        raise ErrorNegocio("Revise la cantidad y el centro de acopio.")

    if categoria not in CATEGORIAS:
        raise ErrorNegocio("Seleccione una categoría.")
    if articulo == "":
        raise ErrorNegocio("Escriba qué artículo va a donar.")
    if cantidad <= 0:
        raise ErrorNegocio("La cantidad debe ser mayor que cero.")
    # como llega al centro: "recogida" (la recoge un conductor) o "personal" (la lleva el donante)
    modalidad = datos.get("modalidad", "recogida")
    if modalidad not in MODALIDADES:
        raise ErrorNegocio("Escoja si la recogen o si usted la lleva al centro.")

    if modalidad == "recogida":
        if direccion == "":
            raise ErrorNegocio("Escriba la dirección donde se recoge la donación.")
        # punto de recogida marcado en el mapa (opcional: si no hay internet
        # el mapa no carga, y la donacion igual se puede publicar con la direccion)
        latitud, longitud = leer_punto(datos.get("latitud_recogida"), datos.get("longitud_recogida"), obligatorio=False)
        cuando = ""
    else:
        # la lleva el mismo: no hace falta direccion ni mapa
        direccion = ""
        latitud, longitud = None, None
        cuando = str(datos.get("cuando_llevara", "")).strip()[:80]   # opcional: "el sábado en la mañana"

    centro = repo.centros.buscar_por_id(id_centro)
    if centro is None:
        raise ErrorNegocio("Seleccione un centro de acopio.")

    # el centro tiene que necesitar esa categoria
    if categoria not in centro["necesidades"]:
        raise ErrorNegocio("El centro «" + centro["nombre"] + "» no está pidiendo " + categoria + ".")

    # el centro no puede recibir mas de su capacidad maxima
    libre = centro["capacidad_maxima"] - ocupacion_del_centro(id_centro)
    if cantidad > libre:
        if libre <= 0:
            raise ErrorNegocio("El centro «" + centro["nombre"] + "» ya está lleno. Escoja otro centro.")
        raise ErrorNegocio("El centro «" + centro["nombre"] + "» solo puede recibir " + str(libre) + " artículos más.")

    nueva = {
        "id_donante": id_donante,
        "id_centro": id_centro,
        "categoria": categoria,
        "articulo": articulo,
        "cantidad": cantidad,
        "descripcion": descripcion,
        "direccion_recogida": direccion,
        "latitud_recogida": latitud,
        "longitud_recogida": longitud,
        "modalidad": modalidad,
        "cuando_llevara": cuando,
        # si la lleva el mismo, no espera conductor: queda "por llevar"
        "estado": "publicada" if modalidad == "recogida" else "por llevar",
        "id_conductor": None,
        "fecha_publicacion": ahora(),
        "fecha_ultimo_cambio": ahora(),
        "fecha_entrega": None
    }
    return repo.donaciones.agregar(nueva)


def donaciones_del_donante(id_donante):
    lista = repo.donaciones.buscar_por("id_donante", id_donante)
    for d in lista:
        _agregar_detalle(d)
    return lista


def cancelar(id_donante, id_donacion):
    donacion = _buscar(id_donacion)

    # solo el dueño puede cancelarla
    if donacion["id_donante"] != id_donante:
        raise ErrorNegocio("Solo puede cancelar sus propias donaciones.")

    # el estado decide si se puede (patron State)
    estado_de(donacion).cancelar(donacion)

    repo.donaciones.actualizar(donacion)
    return donacion


# ======================= CONDUCTOR =======================

def disponibles_para_recoger():
    # donaciones publicadas que nadie ha aceptado
    lista = repo.donaciones.buscar_por("estado", "publicada")
    for d in lista:
        _agregar_detalle(d)
        # privacidad (RNF011): el telefono solo se ve despues de aceptar
        d.pop("donante_telefono", None)
    return lista


def aceptar_recogida(id_conductor, id_donacion):
    conductor = repo.usuarios.buscar_por_id(id_conductor)

    # RF020: si no esta disponible, no puede aceptar
    if not conductor.get("disponible"):
        raise ErrorNegocio("Usted está marcado como no disponible. Cambie sus horarios para aceptar recogidas.")

    donacion = _buscar(id_donacion)

    # el estado decide si se puede (patron State)
    estado_de(donacion).aceptar(donacion, id_conductor)

    repo.donaciones.actualizar(donacion)
    return donacion


def entregas_del_conductor(id_conductor):
    lista = repo.donaciones.buscar_por("id_conductor", id_conductor)
    pendientes = []
    completadas = []
    for d in lista:
        _agregar_detalle(d)
        if d["estado"] == "en camino":
            pendientes.append(d)
        elif d["estado"] == "recibida":
            completadas.append(d)
    return {"pendientes": pendientes, "completadas": completadas}


def marcar_entregada(id_conductor, id_donacion):
    donacion = _buscar(id_donacion)

    # solo el conductor que la acepto puede marcarla
    if donacion["id_conductor"] != id_conductor:
        raise ErrorNegocio("Solo puede marcar como entregadas sus propias recogidas.")

    # el estado decide si se puede (patron State)
    estado_de(donacion).completar(donacion)

    repo.donaciones.actualizar(donacion)
    return donacion


# ======================= CENTRO DE ACOPIO =======================

def confirmar_recepcion(id_gestor, id_donacion):
    # el encargado del centro confirma que la donacion llego
    # (lo mismo que "marcar entregada" del conductor, por si el conductor no lo hizo)
    donacion = _buscar(id_donacion)
    centro = repo.centros.buscar_por_id(donacion["id_centro"])

    if centro is None or centro.get("id_gestor") != id_gestor:
        raise ErrorNegocio("Esta donación no va para su centro de acopio.")
    if donacion["estado"] == "publicada":
        raise ErrorNegocio("Esta donación todavía no tiene conductor. Podrá recibirla cuando esté en camino.")

    # el estado decide si se puede (patron State): solo si esta en camino
    estado_de(donacion).completar(donacion)

    repo.donaciones.actualizar(donacion)
    return donacion


def inventario_del_centro(id_centro):
    # numeros del centro:
    #   recibido:   todo lo que ha llegado
    #   repartido:  lo que ya entrego a las familias
    #   en_bodega:  recibido - repartido (lo que tiene guardado ahora)
    #   en_camino:  publicado o en camino hacia el centro (ya comprometido)
    #   ocupado:    en_bodega + en_camino  -> esto es lo que cuenta contra la capacidad
    recibido = 0
    en_camino = 0
    for d in repo.donaciones.buscar_por("id_centro", id_centro):
        if d["estado"] == "recibida":
            recibido += d["cantidad"]
        elif d["estado"] in ("publicada", "en camino", "por llevar"):
            en_camino += d["cantidad"]

    repartido = 0
    for s in repo.salidas.buscar_por("id_centro", id_centro):
        repartido += s["cantidad"]

    en_bodega = max(0, recibido - repartido)
    return {
        "recibido": recibido,
        "repartido": repartido,
        "en_bodega": en_bodega,
        "en_camino": en_camino,
        "ocupado": en_bodega + en_camino
    }


def ocupacion_del_centro(id_centro):
    # cuantos articulos cuentan contra la capacidad del centro
    return inventario_del_centro(id_centro)["ocupado"]


def donaciones_del_centro(id_centro):
    lista = repo.donaciones.buscar_por("id_centro", id_centro)
    por_llegar = []
    recibidas = []
    for d in lista:
        _agregar_detalle(d)
        if d["estado"] in ("publicada", "en camino", "por llevar"):
            por_llegar.append(d)
        elif d["estado"] == "recibida":
            recibidas.append(d)
    return {"por_llegar": por_llegar, "recibidas": recibidas}


# ======================= AYUDAS =======================

def _buscar(id_donacion):
    donacion = repo.donaciones.buscar_por_id(id_donacion)
    if donacion is None:
        raise ErrorNegocio("La donación no existe.")
    return donacion


def _agregar_detalle(d):
    # le pega a la donacion datos del centro y del donante para mostrarlos
    centro = repo.centros.buscar_por_id(d["id_centro"])
    donante = repo.usuarios.buscar_por_id(d["id_donante"])
    if centro:
        d["centro_nombre"] = centro["nombre"]
        d["centro_direccion"] = centro["direccion"] + ", " + centro["barrio"] + ", " + centro["ciudad"]
        # para dibujar el recorrido en el mapa
        d["centro_horario"] = centro.get("horario", "")
        d["centro_latitud"] = centro.get("latitud")
        d["centro_longitud"] = centro.get("longitud")
    if donante:
        d["donante_nombre"] = donante["nombre"]
        d["donante_telefono"] = donante["telefono"]
    # quien la lleva (para que el centro sepa a quien esperar)
    if d.get("id_conductor"):
        conductor = repo.usuarios.buscar_por_id(d["id_conductor"])
        if conductor:
            d["conductor_nombre"] = conductor["nombre"]
            d["conductor_telefono"] = conductor["telefono"]
            d["conductor_vehiculo"] = conductor.get("tipo_vehiculo", "")