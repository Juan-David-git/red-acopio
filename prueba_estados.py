from logica.donaciones_servicio import publicar, donaciones_del_donante
from logica.errores import ErrorNegocio

# Carmen (id 1) dona ropa al Salon Comunal San Francisco (id 2)
try:
    d = publicar(1, {
        "categoria": "Ropa",
        "articulo": "medias",
        "cantidad": "10",
        "descripcion": "medias de niño talla 8",
        "direccion_recogida": "Calle 45 # 12-20, Bucaramanga",
        "id_centro": "2"
    })
    print("Publicada con id", d["id"])
except ErrorNegocio as e:
    print("Error:", e)

# Carmen intenta donar arroz al Salon Comunal, que solo pide ropa
try:
    publicar(1, {
        "categoria": "Alimentos",
        "articulo": "arroz",
        "cantidad": "5",
        "direccion_recogida": "Calle 45 # 12-20",
        "id_centro": "2"
    })
except ErrorNegocio as e:
    print("Error:", e)

# ver las donaciones de Carmen
print("\nDonaciones de Carmen:")
for d in donaciones_del_donante(1):
    print("-", d["cantidad"], d["articulo"], "→", d["centro_nombre"], "| estado:", d["estado"])