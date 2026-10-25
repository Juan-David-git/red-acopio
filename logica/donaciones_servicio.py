# Logica de donaciones
# Donante: RF002 publicar, RF010 ver estado, RF016 cancelar
# Conductor: RF005 ver entregas (y aceptar recogida), RF006 marcar entregada

from datos import repositorio_json as repo
from logica.errores import ErrorNegocio
from logica.estados import ahora, estado_de
from logica.usuarios_servicio import CATEGORIAS
from logica.ubicacion import leer_punto


# ======================= DONANTE =======================

def publicar(id_donante, datos):
    categoria = datos.get("categoria", "")
    articulo = datos.get("articulo", "").strip()
    descripcion = datos.get("descripcion", "").strip()
    direccion = datos.get("direccion_recogida", "").strip()

    try:
        cantidad = int(datos.get("cantidad", 0))
        id_centro = int(datos.get("id_centro", 0))
    except ValueError:
        raise ErrorNegocio("La cantidad debe ser un número.")

    if categoria not in CATEGORIAS:
        raise ErrorNegocio("Seleccione una categoría.")
    if articulo == "":
        raise ErrorNegocio("Escriba qué artículo va a donar.")
    if cantidad <= 0:
        raise ErrorNegocio("La cantidad debe ser mayor que cero.")
    if direccion == "":
        raise ErrorNegocio("Escriba la dirección donde se recoge la donación.")

    # punto de recogida marcado en el mapa (opcional: si no hay internet
    # el mapa no carga, y la donacion igual se puede publicar con la direccion)
    latitud, longitud = leer_punto(datos.get("latitud_recogida"), datos.get("longitud_recogida"), obligatorio=False)

    centro = repo.centros.buscar_por_id(id_centro)
    if centro is None:
        raise ErrorNegocio("Seleccione un centro de acopio.")

    # el centro tiene que necesitar esa categoria
    if categoria not in centro["necesidades"]:
        raise ErrorNegocio("El centro «" + centro["nombre"] + "» no está pidiendo " + categoria + ".")

    # el centro no puede recibir mas de su capacidad maxima
    # (cuenta lo que esta publicado, en camino o ya recibido; lo cancelado no)
    ocupado = 0
    for d in repo.donaciones.buscar_por("id_centro", id_centro):
        if d["estado"] != "cancelada":
            ocupado += d["cantidad"]
    libre = centro["capacidad_maxima"] - ocupado
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
        "estado": "publicada",
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
        d["centro_latitud"] = centro.get("latitud")
        d["centro_longitud"] = centro.get("longitud")
    if donante:
        d["donante_nombre"] = donante["nombre"]
        d["donante_telefono"] = donante["telefono"]