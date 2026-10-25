import json
import os
import threading

# carpeta donde estan los .json (al lado de este archivo)
CARPETA_JSON = os.path.join(os.path.dirname(__file__), "json")

# El servidor atiende varias peticiones al mismo tiempo (hilos).
# Este candado hace que solo una a la vez lea y modifique los .json,
# asi dos conductores no pueden aceptar la misma donacion al tiempo.
# Es RLock para que el mismo hilo pueda tomarlo varias veces.
candado = threading.RLock()


class RepositorioJSON:

    def __init__(self, nombre_archivo):
        self.ruta = os.path.join(CARPETA_JSON, nombre_archivo)

    def _leer(self):
        with candado:
            with open(self.ruta, "r", encoding="utf-8") as archivo:
                return json.load(archivo)

    def _guardar(self, lista):
        with candado:
            # se escribe primero en un archivo temporal y luego se reemplaza,
            # asi si algo falla a mitad de camino el .json no queda dañado
            temporal = self.ruta + ".tmp"
            with open(temporal, "w", encoding="utf-8") as archivo:
                json.dump(lista, archivo, ensure_ascii=False, indent=2)
            os.replace(temporal, self.ruta)

    def listar(self):
        return self._leer()

    def buscar_por_id(self, id_buscado):
        for item in self._leer():
            if item["id"] == id_buscado:
                return item
        return None

    def buscar_por(self, campo, valor):
        resultado = []
        for item in self._leer():
            if item.get(campo) == valor:
                resultado.append(item)
        return resultado

    def agregar(self, nuevo):
        with candado:
            lista = self._leer()
            # el id nuevo es el mayor que haya + 1
            mayor = 0
            for item in lista:
                if item["id"] > mayor:
                    mayor = item["id"]
            nuevo["id"] = mayor + 1
            lista.append(nuevo)
            self._guardar(lista)
            return nuevo

    def actualizar(self, registro):
        with candado:
            lista = self._leer()
            for i in range(len(lista)):
                if lista[i]["id"] == registro["id"]:
                    lista[i] = registro
                    self._guardar(lista)
                    return True
            return False


centros = RepositorioJSON("centros.json")
usuarios = RepositorioJSON("usuarios.json")
donaciones = RepositorioJSON("donaciones.json")
