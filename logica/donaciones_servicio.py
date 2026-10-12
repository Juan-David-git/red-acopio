# Logica de donaciones
# RF002 publicar, RF010 ver estado, RF016 cancelar

from datos import repositorio_json as repo
from logica.errores import ErrorNegocio
from logica.estados import ahora, estado_de


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

    if articulo == "":
        raise ErrorNegocio("Escriba qué artículo va a donar.")
    if cantidad <= 0:
        raise ErrorNegocio("La cantidad debe ser mayor que cero.")
    if direccion == "":
        raise ErrorNegocio("Escriba la dirección donde se recoge la donación.")

    centro = repo.centros.buscar_por_id(id_centro)
    if centro is None:
        raise ErrorNegocio("Seleccione un centro de acopio.")

    # el centro tiene que necesitar esa categoria
    if categoria not in centro["necesidades"]:
        raise ErrorNegocio("El centro «" + centro["nombre"] + "» no está pidiendo " + categoria + ".")

    nueva = {
        "id_donante": id_donante,
        "id_centro": id_centro,
        "categoria": categoria,
        "articulo": articulo,
        "cantidad": cantidad,
        "descripcion": descripcion,
        "direccion_recogida": direccion,
        "estado": "publicada",
        "id_conductor": None,
        "fecha_publicacion": ahora(),
        "fecha_ultimo_cambio": ahora(),
        "fecha_entrega": None
    }
    return repo.donaciones.agregar(nueva)


def donaciones_del_donante(id_donante):
    lista = repo.donaciones.buscar_por("id_donante", id_donante)

    # a cada donacion le agregamos el nombre del centro para mostrarlo
    for d in lista:
        centro = repo.centros.buscar_por_id(d["id_centro"])
        d["centro_nombre"] = centro["nombre"] if centro else ""

    return lista


def cancelar(id_donante, id_donacion):
    donacion = repo.donaciones.buscar_por_id(id_donacion)
    if donacion is None:
        raise ErrorNegocio("La donación no existe.")

    # solo el dueño puede cancelarla
    if donacion["id_donante"] != id_donante:
        raise ErrorNegocio("Solo puede cancelar sus propias donaciones.")

    # el estado decide si se puede (patron State)
    estado_de(donacion).cancelar(donacion)

    repo.donaciones.actualizar(donacion)
    return donacion