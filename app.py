from logica.usuarios_servicio import iniciar_sesion, ErrorNegocio

pruebas = [
    ("laura@correo.com", "laura1234"),
    ("laura@correo.com", "otra-clave"),
    ("nadie@correo.com", "laura1234"),
    ("ROBERTO@correo.com", "roberto123"),
]

for correo, clave in pruebas:
    try:
        u = iniciar_sesion(correo, clave)
        print("OK", correo, "-> entró como", u["rol"])
    except ErrorNegocio as e:
        print("X ", correo, "->", e)