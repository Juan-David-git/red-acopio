# Logica de donaciones
# Donante: RF002 publicar, RF010 ver estado, RF016 cancelar
# Conductor: RF005 ver entregas (y aceptar recogida), RF006 marcar entregada

from datos import repositorio_json as repo
from logica.errores import ErrorNegocio
import copy
from datetime import date, datetime

from logica.estados import ahora, estado_de, registrar_historial
from logica.usuarios_servicio import CATEGORIAS
from logica.ubicacion import leer_punto

MODALIDADES = ["recogida", "personal"]
UNIDADES = ["unidades", "kg", "libras", "bolsas", "paquetes", "cajas"]
MAX_ARTICULOS = 10


# ======================= DONANTE =======================

def _leer_articulos(datos, categoria):
    # CU-04: una donacion puede traer varios articulos, cada uno con cantidad y unidad.
    # Si es comida, cada articulo lleva su fecha de vencimiento y no puede estar vencido.
    # (tambien se acepta el formato viejo: un solo "articulo" y "cantidad")
    lista = datos.get("articulos")
    if lista is None:
        lista = [{"articulo": datos.get("articulo", ""), "cantidad": datos.get("cantidad", 0),
                  "unidad": datos.get("unidad", "unidades"), "vencimiento": datos.get("vencimiento", "")}]
    if not isinstance(lista, list) or len(lista) == 0:
        raise ErrorNegocio("Escriba qué artículo va a donar.", campo="articulo-0")
    if len(lista) > MAX_ARTICULOS:
        raise ErrorNegocio("Puede agregar hasta " + str(MAX_ARTICULOS) + " artículos por donación.")

    hoy = date.today()
    items = []
    for i, a in enumerate(lista):
        if not isinstance(a, dict):
            raise ErrorNegocio("Los artículos no son válidos.")
        nombre = str(a.get("articulo", "") or "").strip()[:60]
        if nombre == "":
            raise ErrorNegocio("Escriba qué artículo va a donar.", campo="articulo-" + str(i))
        try:
            cantidad = int(a.get("cantidad", 0))
        except (TypeError, ValueError):
            raise ErrorNegocio("La cantidad de «" + nombre + "» debe ser un número.", campo="cantidad-" + str(i))
        if cantidad <= 0:
            raise ErrorNegocio("La cantidad de «" + nombre + "» debe ser mayor que cero.", campo="cantidad-" + str(i))
        unidad = a.get("unidad") or "unidades"
        if unidad not in UNIDADES:
            raise ErrorNegocio("Escoja la unidad de «" + nombre + "».", campo="unidad-" + str(i))

        vencimiento = None
        if categoria == "Alimentos":
            texto = str(a.get("vencimiento", "") or "").strip()
            if texto == "":
                raise ErrorNegocio("Escriba la fecha de vencimiento de «" + nombre + "».", campo="vencimiento-" + str(i))
            try:
                fecha = datetime.strptime(texto, "%Y-%m-%d").date()
            except ValueError:
                raise ErrorNegocio("La fecha de vencimiento de «" + nombre + "» no es válida.", campo="vencimiento-" + str(i))
            if fecha <= hoy:
                raise ErrorNegocio("«" + nombre + "» ya está vencido o vence hoy. Solo se reciben alimentos vigentes.",
                                   campo="vencimiento-" + str(i))
            vencimiento = texto
        items.append({"articulo": nombre, "cantidad": cantidad, "unidad": unidad, "vencimiento": vencimiento})
    return items


def publicar(id_donante, datos):
    categoria = datos.get("categoria", "")
    descripcion = str(datos.get("descripcion", "") or "").strip()[:200]
    direccion = str(datos.get("direccion_recogida", "") or "").strip()

    try:
        id_centro = int(datos.get("id_centro") or 0)
    except (TypeError, ValueError):
        raise ErrorNegocio("Seleccione un centro de acopio.", campo="id_centro")

    if categoria not in CATEGORIAS:
        raise ErrorNegocio("Seleccione una categoría.", campo="categoria")
    items = _leer_articulos(datos, categoria)
    # resumen para las listas: "arroz, aceite" y el total de articulos (lo que cuenta contra la capacidad)
    articulo = ", ".join(i["articulo"] for i in items)
    cantidad = sum(i["cantidad"] for i in items)
    # como llega al centro: "recogida" (la recoge un conductor) o "personal" (la lleva el donante)
    modalidad = datos.get("modalidad", "recogida")
    if modalidad not in MODALIDADES:
        raise ErrorNegocio("Escoja si la recogen o si usted la lleva al centro.")

    if modalidad == "recogida":
        if direccion == "":
            raise ErrorNegocio("Escriba la dirección donde se recoge la donación.", campo="direccion_recogida")
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
        raise ErrorNegocio("Seleccione un centro de acopio.", campo="id_centro")

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
        "articulos": items,
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
        "fecha_entrega": None,
        "historial": []
    }
    # CU-06: historial de estados (cada cambio queda con fecha)
    registrar_historial(nueva, "publicada" if modalidad == "recogida" else "por llevar",
                        "Publicada" if modalidad == "recogida" else "Publicada: la llevará el donante")
    return repo.donaciones.agregar(nueva)


def donaciones_del_donante(id_donante):
    lista = repo.donaciones.buscar_por("id_donante", id_donante)
    for d in lista:
        _agregar_detalle(d)
    return lista


MOTIVOS_CANCELACION = ["Ya no tengo los artículos", "Se la di a otra persona u organización",
                       "Me equivoqué al publicarla", "Nadie la ha recogido", "Otro motivo"]


def _texto_corto(datos, campo, maximo=200):
    valor = datos.get(campo, "") if isinstance(datos, dict) else ""
    return str(valor or "").strip()[:maximo]


def cancelar(id_donante, id_donacion, datos=None):
    donacion = _buscar(id_donacion)

    # solo el dueño puede cancelarla
    if donacion["id_donante"] != id_donante:
        raise ErrorNegocio("Solo puede cancelar sus propias donaciones.")

    # primero se revisa si se puede cancelar (en una copia, para no cambiar nada todavia)
    estado_de(donacion).cancelar(copy.deepcopy(donacion))

    # CU-05: el donante dice por que la cancela
    motivo = _texto_corto(datos, "motivo", 120)
    if motivo not in MOTIVOS_CANCELACION:
        raise ErrorNegocio("Escoja el motivo de la cancelación.", campo="motivo-" + str(id_donacion))
    detalle = _texto_corto(datos, "detalle", 200)
    if motivo == "Otro motivo" and detalle == "":
        raise ErrorNegocio("Cuéntenos brevemente el motivo.", campo="detalle-" + str(id_donacion))

    # el estado decide si se puede (patron State)
    estado_de(donacion).cancelar(donacion)
    donacion["motivo_cancelacion"] = motivo + (": " + detalle if detalle else "")
    donacion["historial"][-1]["texto"] += " (" + donacion["motivo_cancelacion"] + ")"

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


def _guardar_observacion(donacion, datos, quien):
    # CU-09: al entregar se puede dejar una nota (ej: "llegaron 2 bolsas rotas")
    observacion = _texto_corto(datos, "observacion", 200)
    if observacion:
        donacion["observacion_entrega"] = observacion
        donacion["observacion_de"] = quien
        donacion["historial"][-1]["texto"] += ". Nota: " + observacion


def marcar_entregada(id_conductor, id_donacion, datos=None):
    donacion = _buscar(id_donacion)

    # solo el conductor que la acepto puede marcarla
    if donacion["id_conductor"] != id_conductor:
        raise ErrorNegocio("Solo puede marcar como entregadas sus propias recogidas.")

    # el estado decide si se puede (patron State)
    estado_de(donacion).completar(donacion)
    donacion["historial"][-1]["texto"] = "Entregada en el centro por el conductor"
    _guardar_observacion(donacion, datos, "conductor")

    repo.donaciones.actualizar(donacion)
    return donacion


# ======================= CENTRO DE ACOPIO =======================

def confirmar_recepcion(id_gestor, id_donacion, datos=None):
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
    donacion["historial"][-1]["texto"] = "Recibida y confirmada por el centro de acopio"
    _guardar_observacion(donacion, datos, "centro")

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


def publicadas_de_la_zona(centro):
    # CU-07: el encargado ve lo que se esta publicando cerca de su centro
    # (todas las publicadas que aun no tienen conductor, la mas cercana primero)
    from logica.ubicacion import distancia_km
    lista = []
    for d in repo.donaciones.buscar_por("estado", "publicada"):
        _agregar_detalle(d)
        d.pop("donante_telefono", None)       # privacidad: el telefono no se muestra (igual que al conductor antes de aceptar)
        if d.get("latitud_recogida") is not None and centro.get("latitud") is not None:
            d["distancia_km"] = round(distancia_km(centro["latitud"], centro["longitud"],
                                                   d["latitud_recogida"], d["longitud_recogida"]), 1)
        else:
            d["distancia_km"] = None
        d.pop("latitud_recogida", None)
        d.pop("longitud_recogida", None)
        d["para_mi_centro"] = d["id_centro"] == centro["id"]
        lista.append(d)
    lista.sort(key=lambda d: (d["distancia_km"] is None, d["distancia_km"] or 0))
    return lista


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
    # donaciones viejas (de antes del historial): se arma con las fechas que haya
    if not d.get("historial"):
        d["historial"] = [{"estado": "publicada", "fecha": d.get("fecha_publicacion", ""), "texto": "Publicada"}]
        if d["estado"] != "publicada" and d.get("fecha_ultimo_cambio"):
            textos = {"en camino": "Un conductor aceptó la recogida", "recibida": "Recibida en el centro de acopio",
                      "cancelada": "Cancelada por el donante", "por llevar": "La llevará el donante"}
            d["historial"].append({"estado": d["estado"], "fecha": d.get("fecha_entrega") or d["fecha_ultimo_cambio"],
                                   "texto": textos.get(d["estado"], d["estado"])})
    # para donaciones viejas de un solo articulo
    if not d.get("articulos"):
        d["articulos"] = [{"articulo": d.get("articulo", ""), "cantidad": d.get("cantidad", 0),
                           "unidad": "unidades", "vencimiento": None}]
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