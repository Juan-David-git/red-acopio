# Estadisticas para los paneles: donante, conductor y centro de acopio.
# Todo se calcula al momento a partir de los .json (no se guarda nada aparte).

import math
from datetime import datetime

from datos import repositorio_json as repo
from logica.usuarios_servicio import CATEGORIAS

MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]


# ======================= AYUDAS =======================

def _ultimos_meses(cuantos=6):
    # ["2026-06", ..., "2026-11"] terminando en el mes actual
    hoy = datetime.now()
    anio, mes = hoy.year, hoy.month
    lista = []
    for _ in range(cuantos):
        lista.append("%04d-%02d" % (anio, mes))
        mes -= 1
        if mes == 0:
            mes = 12
            anio -= 1
    lista.reverse()
    return lista


def _por_mes(registros, campo_fecha, campo_valor=None):
    # cuenta (o suma campo_valor) por mes en los ultimos 6 meses
    meses = _ultimos_meses()
    totales = {m: 0 for m in meses}
    for r in registros:
        fecha = r.get(campo_fecha) or ""
        clave = fecha[:7]
        if clave in totales:
            totales[clave] += r[campo_valor] if campo_valor else 1
    return [{"mes": MESES[int(m[5:7]) - 1] + " " + m[2:4], "valor": totales[m]} for m in meses]


def _por_categoria(donaciones):
    # articulos por categoria, de mayor a menor (todas las categorias, aunque sean 0)
    totales = {c: 0 for c in CATEGORIAS}
    for d in donaciones:
        if d["categoria"] in totales:
            totales[d["categoria"]] += d["cantidad"]
    lista = [{"categoria": c, "valor": v} for c, v in totales.items()]
    lista.sort(key=lambda x: -x["valor"])
    return lista


def _distancia_km(a, b):
    # linea recta entre dos puntos (haversine)
    rad = math.pi / 180
    d_lat = (b[0] - a[0]) * rad
    d_lon = (b[1] - a[1]) * rad
    h = math.sin(d_lat / 2) ** 2 + math.cos(a[0] * rad) * math.cos(b[0] * rad) * math.sin(d_lon / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


def _centros_por_id():
    return {c["id"]: c for c in repo.centros.listar()}


# ======================= DONANTE =======================

def del_donante(id_donante):
    mias = repo.donaciones.buscar_por("id_donante", id_donante)
    centros = _centros_por_id()

    entregadas = [d for d in mias if d["estado"] == "recibida"]
    en_curso = [d for d in mias if d["estado"] in ("publicada", "en camino", "por llevar")]
    canceladas = [d for d in mias if d["estado"] == "cancelada"]

    # a donde ha donado (solo lo que llego)
    por_centro = {}
    for d in entregadas:
        c = centros.get(d["id_centro"])
        nombre = c["nombre"] if c else "Centro eliminado"
        if nombre not in por_centro:
            por_centro[nombre] = {"centro": nombre, "barrio": c["barrio"] if c else "", "veces": 0, "articulos": 0}
        por_centro[nombre]["veces"] += 1
        por_centro[nombre]["articulos"] += d["cantidad"]
    lugares = sorted(por_centro.values(), key=lambda x: -x["articulos"])

    fechas = sorted(d["fecha_publicacion"] for d in mias if d.get("fecha_publicacion"))
    return {
        "donaciones": len(mias) - len(canceladas),
        "entregadas": len(entregadas),
        "en_curso": len(en_curso),
        "canceladas": len(canceladas),
        "articulos": sum(d["cantidad"] for d in entregadas),
        "centros_ayudados": len(lugares),
        "desde": fechas[0] if fechas else None,
        "por_categoria": _por_categoria(entregadas),
        "por_centro": lugares,
        "por_mes": _por_mes(entregadas, "fecha_entrega", "cantidad")
    }


# ======================= CONDUCTOR =======================

def del_conductor(id_conductor):
    mias = repo.donaciones.buscar_por("id_conductor", id_conductor)
    centros = _centros_por_id()

    hechas = [d for d in mias if d["estado"] == "recibida"]
    en_curso = [d for d in mias if d["estado"] == "en camino"]

    # kilometros aproximados: linea recta de la recogida al centro
    # (solo las donaciones que tienen punto marcado en el mapa)
    km = 0.0
    con_mapa = 0
    for d in hechas:
        c = centros.get(d["id_centro"])
        if d.get("latitud_recogida") is not None and c and c.get("latitud") is not None:
            km += _distancia_km([d["latitud_recogida"], d["longitud_recogida"]], [c["latitud"], c["longitud"]])
            con_mapa += 1

    por_centro = {}
    for d in hechas:
        c = centros.get(d["id_centro"])
        nombre = c["nombre"] if c else "Centro eliminado"
        if nombre not in por_centro:
            por_centro[nombre] = {"centro": nombre, "barrio": c["barrio"] if c else "", "veces": 0, "articulos": 0}
        por_centro[nombre]["veces"] += 1
        por_centro[nombre]["articulos"] += d["cantidad"]

    return {
        "servicios": len(hechas),
        "en_curso": len(en_curso),
        "articulos": sum(d["cantidad"] for d in hechas),
        "km": round(km, 1),
        "km_viajes_medidos": con_mapa,
        "donantes_ayudados": len(set(d["id_donante"] for d in hechas)),
        "centros_visitados": len(por_centro),
        "por_categoria": _por_categoria(hechas),
        "por_centro": sorted(por_centro.values(), key=lambda x: -x["veces"]),
        "por_mes": _por_mes(hechas, "fecha_entrega")
    }


# ======================= CENTRO DE ACOPIO =======================

def del_centro(id_centro):
    llegadas = [d for d in repo.donaciones.buscar_por("id_centro", id_centro) if d["estado"] == "recibida"]
    salidas = repo.salidas.buscar_por("id_centro", id_centro)

    # articulos que mas han llegado
    articulos = {}
    for d in llegadas:
        # una donacion puede traer varios articulos; las viejas traen uno solo
        for item in d.get("articulos") or [{"articulo": d["articulo"], "cantidad": d["cantidad"]}]:
            nombre = item["articulo"].strip().lower()
            articulos[nombre] = articulos.get(nombre, 0) + item["cantidad"]
    top = sorted(({"articulo": a, "valor": v} for a, v in articulos.items()), key=lambda x: -x["valor"])[:5]

    recibido_mes = _por_mes(llegadas, "fecha_entrega", "cantidad")
    repartido_mes = _por_mes(salidas, "fecha", "cantidad")

    return {
        "recibido": sum(d["cantidad"] for d in llegadas),
        "donaciones_recibidas": len(llegadas),
        "repartido": sum(s["cantidad"] for s in salidas),
        "entregas_familias": len(salidas),
        "donantes": len(set(d["id_donante"] for d in llegadas)),
        "conductores": len(set(d["id_conductor"] for d in llegadas if d.get("id_conductor"))),
        "por_categoria": _por_categoria(llegadas),
        "top_articulos": top,
        "recibido_por_mes": recibido_mes,
        "repartido_por_mes": repartido_mes
    }
