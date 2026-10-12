from logica.usuarios_servicio import registrar_centro, ErrorNegocio

datos = {
    "nombre": "Roberto Castillo",
    "correo": "roberto@correo.com",
    "telefono": "3008887766",
    "ciudad": "Bucaramanga",
    "clave": "roberto123",
    "nombre_centro": "Tienda La Esperanza",
    "direccion": "Calle 52 # 18-40",
    "barrio": "La Concordia",
    "horario": "Lunes a sábado, 7 a. m. a 7 p. m.",
    "latitud": "7.1135",
    "longitud": "-73.1150",
    "capacidad_maxima": "180",
    "necesidades": {
        "Ropa": ["medias", "camisas"],
        "Alimentos": ["arroz"]
    }
}

try:
    usuario = registrar_centro(datos)
    print("Encargado registrado con id", usuario["id"])
except ErrorNegocio as e:
    print("Error:", e)