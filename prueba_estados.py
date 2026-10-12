from logica import donaciones_servicio as ds
from logica.errores import ErrorNegocio

print("Donaciones esperando conductor:")
disponibles = ds.disponibles_para_recoger()
for d in disponibles:
    print("-", d["id"], d["cantidad"], d["articulo"], "→", d["centro_nombre"])

# Laura (id 2) acepta la primera
primera = disponibles[0]["id"]
ds.aceptar_recogida(2, primera)
print("\nLaura aceptó la donación", primera)

# intenta aceptarla otra vez
try:
    ds.aceptar_recogida(2, primera)
except ErrorNegocio as e:
    print("Aceptarla otra vez:", e)

# Laura la entrega
ds.marcar_entregada(2, primera)
print("Laura la entregó")

entregas = ds.entregas_del_conductor(2)
print("\nPendientes de Laura:", len(entregas["pendientes"]))
print("Completadas de Laura:", len(entregas["completadas"]))