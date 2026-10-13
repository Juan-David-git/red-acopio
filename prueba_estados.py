from logica.usuarios_servicio import actualizar_disponibilidad
from logica import donaciones_servicio as ds
from logica.errores import ErrorNegocio

# 1. Laura dice que esta disponible pero sin horarios
try:
    actualizar_disponibilidad(2, True, [])
except ErrorNegocio as e:
    print("Sin horarios:", e)

# 2. Laura se pone NO disponible
actualizar_disponibilidad(2, False, [])
print("Laura ahora NO está disponible")

# 3. intenta aceptar la crema dental (id 4)
try:
    ds.aceptar_recogida(2, 4)
except ErrorNegocio as e:
    print("Aceptar:", e)

# 4. Laura vuelve a estar disponible en la tarde
actualizar_disponibilidad(2, True, ["tarde"])
print("Laura otra vez disponible en la tarde")