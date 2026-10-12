from logica.usuarios_servicio import registrar_conductor, ErrorNegocio

datos = {
    "nombre": "Laura Gómez",
    "correo": "laura2@correo.com",
    "telefono": "3005556677",
    "ciudad": "Bucaramanga",
    "clave": "laura1234",
    "tipo_vehiculo": "bicicleta",
    "zona": "Norte",
    "franjas": ["mañana", "tarde"]
}

try:
    usuario = registrar_conductor(datos)
    print("Conductor registrado con id", usuario["id"])
except ErrorNegocio as e:
    print("Error:", e)