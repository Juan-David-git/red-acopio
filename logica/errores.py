class ErrorNegocio(Exception):
    # error con un mensaje que se le puede mostrar al usuario
    #   campo:  id del campo del formulario que hay que corregir (la pagina lo resalta)
    #   accion: un enlace que ayuda a resolverlo, ej: {"texto": "Iniciar sesión", "href": "/login.html"}
    def __init__(self, mensaje, campo=None, accion=None):
        super().__init__(mensaje)
        self.campo = campo
        self.accion = accion
