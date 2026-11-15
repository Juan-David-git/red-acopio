# Estados de una donacion (patron State)
# publicada -> en camino -> recibida      (la recoge un conductor)
# publicada -> cancelada
# por llevar -> recibida                  (el donante la lleva personalmente)
# por llevar -> cancelada
# cada estado solo deja hacer lo que le corresponde

from datetime import datetime
from logica.errores import ErrorNegocio


def ahora():
    # fecha y hora actual, ej: "2026-10-12 17:30"
    return datetime.now().strftime("%Y-%m-%d %H:%M")


def registrar_historial(donacion, estado, texto):
    # CU-06: cada cambio de estado queda guardado con su fecha, para que el donante vea el recorrido
    if "historial" not in donacion and donacion.get("fecha_publicacion"):
        # donacion vieja (de antes del historial): se arranca con la fecha en que se publico
        donacion["historial"] = [{"estado": "publicada", "fecha": donacion["fecha_publicacion"], "texto": "Publicada"}]
    donacion.setdefault("historial", []).append({"estado": estado, "fecha": ahora(), "texto": texto})


# ---------- clase padre ----------
class EstadoDonacion:
    nombre = ""

    # por defecto, NINGUNA accion esta permitida
    def aceptar(self, donacion, id_conductor):
        raise ErrorNegocio("Esta donación ya no está disponible para recoger.")

    def completar(self, donacion):
        raise ErrorNegocio("Solo se puede marcar como entregada una donación que esté en camino.")

    def cancelar(self, donacion):
        raise ErrorNegocio("Solo se puede cancelar una donación que no ha sido aceptada por un conductor.")


# ---------- clases hijas: cada una permite solo lo suyo ----------
class Publicada(EstadoDonacion):
    nombre = "publicada"

    def aceptar(self, donacion, id_conductor):
        donacion["estado"] = "en camino"
        donacion["id_conductor"] = id_conductor
        donacion["fecha_ultimo_cambio"] = ahora()
        registrar_historial(donacion, "en camino", "Un conductor aceptó la recogida")

    def cancelar(self, donacion):
        donacion["estado"] = "cancelada"
        donacion["fecha_ultimo_cambio"] = ahora()
        registrar_historial(donacion, "cancelada", "Cancelada por el donante")


class EnCamino(EstadoDonacion):
    nombre = "en camino"

    def completar(self, donacion):
        donacion["estado"] = "recibida"
        donacion["fecha_entrega"] = ahora()
        donacion["fecha_ultimo_cambio"] = ahora()
        registrar_historial(donacion, "recibida", "Recibida en el centro de acopio")


class PorLlevar(EstadoDonacion):
    # el donante la lleva el mismo al centro: no pasa por ningun conductor
    nombre = "por llevar"

    def completar(self, donacion):
        # la confirma el centro cuando el donante llega
        donacion["estado"] = "recibida"
        donacion["fecha_entrega"] = ahora()
        donacion["fecha_ultimo_cambio"] = ahora()
        registrar_historial(donacion, "recibida", "Recibida en el centro de acopio")

    def cancelar(self, donacion):
        donacion["estado"] = "cancelada"
        donacion["fecha_ultimo_cambio"] = ahora()
        registrar_historial(donacion, "cancelada", "Cancelada por el donante")


class Recibida(EstadoDonacion):
    nombre = "recibida"
    # estado final: no permite nada (usa lo de la clase padre)


class Cancelada(EstadoDonacion):
    nombre = "cancelada"
    # estado final: las demas acciones usan lo de la clase padre
    def cancelar(self, donacion):
        raise ErrorNegocio("Esta donación ya fue cancelada.")


# ---------- para saber en que estado esta una donacion ----------
ESTADOS = {
    "publicada": Publicada(),
    "en camino": EnCamino(),
    "por llevar": PorLlevar(),
    "recibida": Recibida(),
    "cancelada": Cancelada(),
}


def estado_de(donacion):
    return ESTADOS[donacion["estado"]]