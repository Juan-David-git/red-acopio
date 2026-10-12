from datos.repositorio_json import RepositorioJSON

centros = RepositorioJSON("centros.json")

centro = centros.buscar_por_id(2)
centro["necesidades"]["Ropa"].append("pantalones")
centros.actualizar(centro)

print(centros.buscar_por_id(2)["necesidades"])