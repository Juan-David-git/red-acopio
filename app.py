from logica.usuarios_servicio import registrar_donante, ErrorNegocio

datos = {
    "nombre": "Carmen Rodríguez",
    "correo": "carmen@correo.com",
    "telefono": "3001234567",
    "ciudad": "Bucaramanga",
    "clave": "carmen123"
}

try:
    usuario = registrar_donante(datos)
    print("Registrado con id", usuario["id"])
except ErrorNegocio as e:
    print("Error:", e)