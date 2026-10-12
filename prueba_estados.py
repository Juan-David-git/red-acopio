from logica.donaciones_servicio import cancelar, donaciones_del_donante
from logica.errores import ErrorNegocio

# 1. alguien que NO es Carmen intenta cancelar la donacion 1
try:
    cancelar(99, 1)
except ErrorNegocio as e:
    print("Otro usuario:", e)

# 2. Carmen (id 1) cancela su donacion 1
try:
    cancelar(1, 1)
    print("Carmen: donación cancelada")
except ErrorNegocio as e:
    print("Carmen:", e)

# 3. Carmen intenta cancelarla otra vez
try:
    cancelar(1, 1)
except ErrorNegocio as e:
    print("Otra vez:", e)

print("\nDonaciones de Carmen:")
for d in donaciones_del_donante(1):
    print("-", d["cantidad"], d["articulo"], "| estado:", d["estado"])