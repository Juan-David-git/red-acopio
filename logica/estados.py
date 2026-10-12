# Estados de una donacion (patron State)
# publicada -> en camino -> recibida
# publicada -> cancelada
# cada estado solo deja hacer lo que le corresponde

from datetime import datetime
from logica.errores import ErrorNegocio


def ahora():
    # fecha y hora actual, ej: "2026-10-12 17:30"
    return datetime.now().strftime("%Y-%m-%d %H:%M")


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

    def cancelar(self, donacion):
        donacion["estado"] = "cancelada"
        donacion["fecha_ultimo_cambio"] = ahora()


class EnCamino(EstadoDonacion):
    nombre = "en camino"

    def completar(self, donacion):
        donacion["estado"] = "recibida"
        donacion["fecha_entrega"] = ahora()
        donacion["fecha_ultimo_cambio"] = ahora()


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
    "recibida": Recibida(),
    "cancelada": Cancelada(),
}


def estado_de(donacion):
    return ESTADOS[donacion["estado"]]