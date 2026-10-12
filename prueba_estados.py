from logica.estados import estado_de
from logica.errores import ErrorNegocio

# una donacion de prueba (no se guarda en ningun lado)
donacion = {"estado": "publicada", "id_conductor": None}

def intentar(accion, funcion):
    try:
        funcion()
        print("OK  ", accion, "-> ahora está:", donacion["estado"])
    except ErrorNegocio as e:
        print("NO  ", accion, "->", e)

intentar("completar", lambda: estado_de(donacion).completar(donacion))
intentar("aceptar",   lambda: estado_de(donacion).aceptar(donacion, 2))
intentar("cancelar",  lambda: estado_de(donacion).cancelar(donacion))
intentar("completar", lambda: estado_de(donacion).completar(donacion))
intentar("aceptar",   lambda: estado_de(donacion).aceptar(donacion, 5))