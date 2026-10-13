# Prueba de estados y disponibilidad del conductor.
# Trabaja sobre una COPIA temporal de los .json, asi no cambia los datos reales
# (ni deja cambios en Git cada vez que alguien la corre).

import os
import shutil
import tempfile

from datos import repositorio_json as repo

# 1. copiar los .json a una carpeta temporal y apuntar los repositorios alla
carpeta_prueba = tempfile.mkdtemp()
for r in (repo.centros, repo.usuarios, repo.donaciones):
    nombre = os.path.basename(r.ruta)
    shutil.copy(r.ruta, os.path.join(carpeta_prueba, nombre))
    r.ruta = os.path.join(carpeta_prueba, nombre)

from logica.usuarios_servicio import actualizar_disponibilidad
from logica import donaciones_servicio as ds
from logica.errores import ErrorNegocio

try:
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
finally:
    # borrar la copia temporal
    shutil.rmtree(carpeta_prueba)
