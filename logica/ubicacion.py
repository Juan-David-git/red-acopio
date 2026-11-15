# Validacion de puntos del mapa (latitud, longitud)
# La usan las donaciones (punto de recogida) y los centros de acopio.

from logica.errores import ErrorNegocio

# Zona donde operamos: area metropolitana de Bucaramanga
# (Bucaramanga, Floridablanca, Giron y Piedecuesta, con margen)
LIMITES = {"lat_min": 6.85, "lat_max": 7.35, "lon_min": -73.35, "lon_max": -72.90}


def leer_punto(latitud, longitud, obligatorio, falta="Marque el punto en el mapa."):
    # devuelve (latitud, longitud) redondeados, o (None, None) si no es obligatorio y no vino
    if latitud in (None, "") and longitud in (None, ""):
        if obligatorio:
            raise ErrorNegocio(falta)
        return None, None

    try:
        latitud = float(latitud)
        longitud = float(longitud)
    except (TypeError, ValueError):
        raise ErrorNegocio("El punto marcado en el mapa no es válido. Márquelo de nuevo.")

    l = LIMITES
    if not (l["lat_min"] <= latitud <= l["lat_max"] and l["lon_min"] <= longitud <= l["lon_max"]):
        raise ErrorNegocio("El punto está fuera del área metropolitana de Bucaramanga.")

    # 6 decimales = unos 10 cm, mas que suficiente
    return round(latitud, 6), round(longitud, 6)


def distancia_km(lat1, lon1, lat2, lon2):
    # distancia en linea recta entre dos puntos (formula de haversine)
    from math import radians, sin, cos, asin, sqrt
    lat1, lon1, lat2, lon2 = map(radians, (lat1, lon1, lat2, lon2))
    a = sin((lat2 - lat1) / 2) ** 2 + cos(lat1) * cos(lat2) * sin((lon2 - lon1) / 2) ** 2
    return 6371 * 2 * asin(sqrt(a))
