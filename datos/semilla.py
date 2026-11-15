# Datos de demostracion (HU-18): 10 donantes, 5 conductores y un encargado para cada centro
# que no tenga, ademas de donaciones en todos los estados.
#
# Uso (desde la carpeta del proyecto):   python datos/semilla.py
#
# - No borra nada: solo agrega lo que falte. Se puede correr varias veces sin duplicar.
# - Todas las cuentas de prueba tienen la misma contraseña: RedAcopio2026
# - Los correos terminan en @demo.redacopio.co para distinguirlas de las cuentas reales.

import os
import sys

# para poder importar "datos" y "logica" aunque se corra desde otra carpeta
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datos import repositorio_json as repo
from logica import seguridad
from logica import usuarios_servicio as usuarios
from logica import donaciones_servicio as donaciones
from logica.errores import ErrorNegocio

CLAVE = "RedAcopio2026"
DOMINIO = "@demo.redacopio.co"

DONANTES = [
    ("Marta Cecilia Duarte", "marta", "3101234501", "Bucaramanga", "Calle 36 # 27-15, San Alonso", 7.1205, -73.1190),
    ("Jorge Iván Peña", "jorge", "3101234502", "Bucaramanga", "Carrera 33 # 45-60, Cabecera", 7.1180, -73.1070),
    ("Luisa Fernanda Ardila", "luisa", "3101234503", "Floridablanca", "Calle 5 # 8-20, Cañaveral", 7.0700, -73.1000),
    ("Andrés Felipe Rueda", "andres", "3101234504", "Bucaramanga", "Calle 14 # 22-11, San Francisco", 7.1260, -73.1210),
    ("Sandra Milena Ortiz", "sandra", "3101234505", "Girón", "Carrera 25 # 30-40, Centro", 7.0690, -73.1690),
    ("Héctor Julio Mantilla", "hector", "3101234506", "Bucaramanga", "Calle 52 # 31-09, Sotomayor", 7.1150, -73.1130),
    ("Paola Andrea Serrano", "paola", "3101234507", "Bucaramanga", "Carrera 9 # 18-30, Comuneros", 7.1310, -73.1290),
    ("Camilo Ernesto Vargas", "camilo", "3101234508", "Floridablanca", "Calle 30 # 10-05, Lagos", 7.0750, -73.0950),
    ("Diana Carolina Pinzón", "diana", "3101234509", "Bucaramanga", "Calle 105 # 22-14, Provenza", 7.0950, -73.1080),
    ("Óscar Mauricio León", "oscar", "3101234510", "Bucaramanga", "Carrera 15 # 4-21, Norte", 7.1450, -73.1250),
]

CONDUCTORES = [
    # nombre, usuario, celular, vehiculo, placa, kg, zona, dias, franjas
    ("Ricardo Gómez", "ricardo", "3201234501", "moto", "RGM12A", 40, "Norte",
     ["lunes", "miércoles", "viernes"], ["mañana", "tarde"]),
    ("Natalia Suárez", "natalia", "3201234502", "carro", "NSU345", 200, "Cabecera",
     ["martes", "jueves", "sábado"], ["tarde"]),
    ("Fabián Torres", "fabian", "3201234503", "camioneta", "FTR678", 800, "Floridablanca",
     ["lunes", "martes", "miércoles", "jueves", "viernes"], ["mañana"]),
    ("Yolanda Rincón", "yolanda", "3201234504", "carro", "YRI901", 250, "Centro",
     ["sábado", "domingo"], ["mañana", "tarde", "noche"]),
    # este queda SIN disponibilidad (no escogio dias), para probar que no puede aceptar
    ("Mauricio Silva", "mauricio", "3201234505", "moto", "MSI23B", 30, "Girón",
     [], []),
]

# encargados para los centros que vinieron sin uno
ENCARGADOS = [
    ("Gloria Patiño", "gloria", "3151234501"),
    ("Hernán Quintero", "hernan", "3151234502"),
    ("Beatriz Lozano", "beatriz", "3151234503"),
    ("Álvaro Méndez", "alvaro", "3151234504"),
]


def correo(usuario):
    return usuario + DOMINIO


def buscar_usuario(email):
    for u in repo.usuarios.listar():
        if u["correo"] == email:
            return u
    return None


def crear_donantes():
    ids = []
    for nombre, usuario, celular, ciudad, direccion, lat, lon in DONANTES:
        u = buscar_usuario(correo(usuario))
        if u is None:
            u = usuarios.registrar_donante({
                "nombre": nombre, "correo": correo(usuario), "telefono": celular, "ciudad": ciudad,
                "clave": CLAVE, "acepta_privacidad": True
            })
            # direccion guardada en el perfil (para "Usar la dirección de mi perfil")
            u = repo.usuarios.buscar_por_id(u["id"])
            u["direccion"] = direccion
            u["direccion_latitud"] = lat
            u["direccion_longitud"] = lon
            repo.usuarios.actualizar(u)
            print("  + donante  ", correo(usuario))
        ids.append(u["id"])
    return ids


def crear_conductores():
    ids = []
    for nombre, usuario, celular, vehiculo, placa, kg, zona, dias, franjas in CONDUCTORES:
        u = buscar_usuario(correo(usuario))
        if u is None:
            u = usuarios.registrar_conductor({
                "nombre": nombre, "correo": correo(usuario), "telefono": celular, "ciudad": "Bucaramanga",
                "clave": CLAVE, "acepta_privacidad": True, "tipo_vehiculo": vehiculo, "placa": placa,
                "capacidad_kg": kg, "zona": zona, "dias": dias, "franjas": franjas
            })
            print("  + conductor", correo(usuario))
        ids.append(u["id"])
    return ids


def crear_encargados():
    # a cada centro sin encargado se le asigna uno (en orden)
    sin_encargado = [c for c in repo.centros.listar() if not c.get("id_gestor")]
    for centro, (nombre, usuario, celular) in zip(sin_encargado, ENCARGADOS):
        u = buscar_usuario(correo(usuario))
        if u is None:
            h, sal = seguridad.generar_hash(CLAVE)
            u = repo.usuarios.agregar({
                "nombre": nombre, "correo": correo(usuario), "telefono": celular,
                "ciudad": centro.get("ciudad", "Bucaramanga"), "rol": "gestor",
                "clave_hash": h, "sal": sal, "acepta_privacidad": True
            })
            print("  + encargado", correo(usuario), "->", centro["nombre"])
        centro["id_gestor"] = u["id"]
        repo.centros.actualizar(centro)


def manana():
    from datetime import date, timedelta
    return (date.today() + timedelta(days=60)).isoformat()


def publicar(id_donante, id_centro, categoria, articulos, recogida=True):
    donante = repo.usuarios.buscar_por_id(id_donante)
    datos = {"categoria": categoria, "id_centro": id_centro, "articulos": articulos,
             "modalidad": "recogida" if recogida else "personal"}
    if recogida:
        datos["direccion_recogida"] = donante["direccion"]
        datos["latitud_recogida"] = donante["direccion_latitud"]
        datos["longitud_recogida"] = donante["direccion_longitud"]
    else:
        datos["cuando_llevara"] = "El sábado en la mañana"
    d = donaciones.publicar(id_donante, datos)
    repo.donaciones.actualizar(dict(d, demo=True))
    return d["id"]


def crear_donaciones(don, con):
    if any(d.get("demo") for d in repo.donaciones.listar()):
        print("  (las donaciones de demostración ya estaban)")
        return

    # centro donde se puede donar cada categoria (el primero que la pida)
    def centro_que_pide(categoria):
        for c in repo.centros.listar():
            if categoria in c["necesidades"]:
                return c["id"]
        return None

    ali, ropa, aseo = centro_que_pide("Alimentos"), centro_que_pide("Ropa"), centro_que_pide("Aseo")
    v = manana()
    hechas = []
    try:
        # publicadas (esperando conductor)
        hechas.append(publicar(don[0], ali, "Alimentos", [{"articulo": "arroz", "cantidad": 5, "unidad": "kg", "vencimiento": v},
                                                         {"articulo": "aceite", "cantidad": 2, "unidad": "unidades", "vencimiento": v}]))
        hechas.append(publicar(don[1], ropa, "Ropa", [{"articulo": "chaquetas", "cantidad": 4, "unidad": "unidades"}]))
        hechas.append(publicar(don[2], aseo, "Aseo", [{"articulo": "jabón", "cantidad": 2, "unidad": "cajas"}]))
        # en camino
        en_camino = publicar(don[3], ali, "Alimentos", [{"articulo": "lentejas", "cantidad": 6, "unidad": "libras", "vencimiento": v}])
        donaciones.aceptar_recogida(con[0], en_camino)
        en_camino2 = publicar(don[4], ropa, "Ropa", [{"articulo": "pantalones", "cantidad": 3, "unidad": "unidades"}])
        donaciones.aceptar_recogida(con[1], en_camino2)
        # recibidas (una con nota de entrega)
        r1 = publicar(don[5], ali, "Alimentos", [{"articulo": "fríjol", "cantidad": 4, "unidad": "libras", "vencimiento": v}])
        donaciones.aceptar_recogida(con[2], r1)
        donaciones.marcar_entregada(con[2], r1, {"observacion": "Una bolsa venía rota, se recogió completa."})
        r2 = publicar(don[6], aseo, "Aseo", [{"articulo": "papel higiénico", "cantidad": 3, "unidad": "paquetes"}])
        donaciones.aceptar_recogida(con[3], r2)
        donaciones.marcar_entregada(con[3], r2)
        # la lleva el donante
        hechas.append(publicar(don[7], ropa, "Ropa", [{"articulo": "cobijas", "cantidad": 2, "unidad": "unidades"}], recogida=False))
        # cancelada con motivo
        c1 = publicar(don[8], aseo, "Aseo", [{"articulo": "crema dental", "cantidad": 5, "unidad": "unidades"}])
        donaciones.cancelar(don[8], c1, {"motivo": "Se la di a otra persona u organización"})
        hechas.append(publicar(don[9], ali, "Alimentos", [{"articulo": "panela", "cantidad": 10, "unidad": "unidades", "vencimiento": v}]))
    except ErrorNegocio as e:
        # ej: algun centro ya esta lleno; lo demas queda creado
        print("  ! no se pudo crear una donación:", e)
    # se marcan como demo las que se cambiaron de estado (se reescribieron sin la marca)
    for d in repo.donaciones.listar():
        if d["id_donante"] in don and not d.get("demo"):
            repo.donaciones.actualizar(dict(d, demo=True))
    print("  + donaciones de demostración en todos los estados")


if __name__ == "__main__":
    with repo.candado:
        print("Agregando datos de demostración…")
        don = crear_donantes()
        con = crear_conductores()
        crear_encargados()
        crear_donaciones(don, con)
    print("Listo. Contraseña de todas las cuentas de prueba:", CLAVE)
