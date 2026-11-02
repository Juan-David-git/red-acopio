# Red Acopio

Plataforma web para coordinar donaciones en especie (alimentos, ropa y aseo) entre donantes, conductores voluntarios y centros de acopio del área metropolitana de Bucaramanga. Proyecto académico — UNAB.

## Cómo correrlo

Requiere Python 3.8 o superior, sin librerías externas.

```
python app.py
```

Se abre solo el navegador en http://localhost:8000. Para detener el servidor: Ctrl + C.

## Estructura

- `presentacion/web/` — páginas HTML, estilos y JavaScript (`js/comun.js` tiene las funciones compartidas).
- `logica/` — reglas de negocio: registro, sesiones, donaciones y estados (patrón State en `estados.py`).
- `datos/` — lectura y escritura de los archivos JSON en `datos/json/`.

## Pruebas

```
python prueba_estados.py
```

Trabaja sobre una copia temporal de los JSON, así que no cambia los datos reales.

## Mapas

- Se usan [Leaflet](https://leafletjs.com) y mapas de OpenStreetMap (sin clave). El código está en `presentacion/web/js/mapa.js`.
- Al registrarse, el centro de acopio marca su ubicación en el mapa (sin internet se escriben latitud y longitud a mano).
- El donante marca en el mapa el punto de recogida; el conductor y el donante ven el recorrido planeado hasta el centro de acopio, con distancia, tiempo estimado y un botón para abrirlo en Google Maps.
- La ruta por calles la calcula el servicio público de OSRM. Si no responde, se dibuja una línea recta con la distancia aproximada.
- Los mapas necesitan internet. Sin conexión, la página sigue funcionando y la donación se publica solo con la dirección escrita.
- No hay seguimiento en tiempo real del conductor: se muestra el recorrido planeado.

## Notas

- Las sesiones se guardan en memoria: si se reinicia el servidor, hay que volver a iniciar sesión.
- Roles: donante, conductor y gestor (encargado de centro de acopio).
- Página pública de centros (`centros.html`): cualquiera ve en el mapa lo que pide cada centro y qué tan lleno está.
- Capacidad de los centros: cuenta lo que hay en bodega (recibido menos lo entregado a familias) más lo que viene en camino. Las entregas a familias se guardan en `datos/json/salidas.json`.
- Cada panel tiene una pestaña de resumen con estadísticas (donante, conductor y centro).
- Panel del centro (`panel.html`): el encargado ve lo que viene en camino y lo recibido, confirma la llegada de una donación (además del conductor) y actualiza horario, capacidad y necesidades. Si deja las necesidades vacías, el centro deja de aparecer para los donantes.
