# Logica del panel del centro de acopio (rol "gestor")
# Ver su centro, ver lo que le llega, confirmar recepcion
# y actualizar horario, capacidad y necesidades.

from datos import repositorio_json as repo
from logica.errores import ErrorNegocio
from logica.usuarios_servicio import CATEGORIAS
from logica import donaciones_servicio


def centro_del_gestor(id_gestor):
    # cada encargado tiene un centro (se unen por id_gestor)
    encontrados = repo.centros.buscar_por("id_gestor", id_gestor)
    if len(encontrados) == 0:
        raise ErrorNegocio("Su cuenta no tiene un centro de acopio registrado.")
    return encontrados[0]


def resumen(id_gestor):
    # datos del centro + cuanto tiene ocupado, para mostrar en el panel
    centro = centro_del_gestor(id_gestor)
    ocupado = donaciones_servicio.ocupacion_del_centro(centro["id"])
    centro["ocupado"] = ocupado
    centro["libre"] = max(0, centro["capacidad_maxima"] - ocupado)
    return centro


def donaciones(id_gestor):
    centro = centro_del_gestor(id_gestor)
    return donaciones_servicio.donaciones_del_centro(centro["id"])


def confirmar_recepcion(id_gestor, id_donacion):
    return donaciones_servicio.confirmar_recepcion(id_gestor, id_donacion)


def actualizar(id_gestor, datos):
    centro = centro_del_gestor(id_gestor)

    horario = datos.get("horario", "").strip()
    if horario == "":
        raise ErrorNegocio("Escriba el horario de atención.")

    try:
        capacidad = int(datos.get("capacidad_maxima", 0))
    except (TypeError, ValueError):
        raise ErrorNegocio("La capacidad máxima debe ser un número.")
    if capacidad <= 0:
        raise ErrorNegocio("La capacidad máxima debe ser mayor que cero.")

    # no puede bajar la capacidad por debajo de lo que ya tiene comprometido
    ocupado = donaciones_servicio.ocupacion_del_centro(centro["id"])
    if capacidad < ocupado:
        raise ErrorNegocio("Ya tiene " + str(ocupado) + " artículos comprometidos. La capacidad no puede ser menor.")

    # necesidades: {"Alimentos": ["arroz", ...], ...}
    # se permite dejarlas vacias: el centro deja de aparecer para los donantes
    necesidades = datos.get("necesidades", {})
    if not isinstance(necesidades, dict):
        raise ErrorNegocio("Las necesidades no son válidas.")
    limpias = {}
    for categoria, articulos in necesidades.items():
        if categoria not in CATEGORIAS:
            raise ErrorNegocio("Categoría no válida: " + str(categoria))
        if not isinstance(articulos, list):
            raise ErrorNegocio("Las necesidades no son válidas.")
        lista = [str(a).strip() for a in articulos if str(a).strip() != ""]
        if len(lista) > 0:
            limpias[categoria] = lista

    centro["horario"] = horario
    centro["capacidad_maxima"] = capacidad
    centro["necesidades"] = limpias
    repo.centros.actualizar(centro)
    return resumen(id_gestor)
