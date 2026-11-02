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

## Datos de demostración (HU-18)

Para tener la plataforma con datos listos para mostrar:

```
python datos/semilla.py
```

Agrega 10 donantes, 5 conductores, un encargado para cada centro que no tenga y donaciones en todos los estados (publicada, en camino, por llevar, recibida y cancelada). No borra nada y se puede correr varias veces sin duplicar.

Todas las cuentas de prueba tienen la contraseña **RedAcopio2026**:

| Rol | Correos |
|---|---|
| Donante | marta, jorge, luisa, andres, sandra, hector, paola, camilo, diana, oscar `@demo.redacopio.co` |
| Conductor | ricardo, natalia, fabian, yolanda `@demo.redacopio.co` (mauricio queda sin disponibilidad, para probar que no puede aceptar) |
| Centro de acopio | gloria (Tienda Don Roberto), hernan (Salón Comunal San Francisco), beatriz (Fundación Luz), alvaro (Parroquia San Juan Bautista) `@demo.redacopio.co` |

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

**Por qué OSRM y no la API de Google Maps (HU-14).** La historia pide calcular la ruta del conductor. Se usa el servidor público de [OSRM](https://project-osrm.org), que trabaja sobre los mismos datos de OpenStreetMap que el mapa, porque:

- no pide clave ni tarjeta de crédito (la API de Rutas de Google exige una cuenta de facturación y la clave quedaría expuesta en el JavaScript del navegador);
- devuelve la misma información que necesita la historia: el trazado por calles, la distancia y el tiempo estimado;
- si en algún momento el servicio no responde, la página no se cae: dibuja una línea recta con la distancia aproximada.

Para la navegación paso a paso, el botón «Cómo llegar» abre el mismo recorrido en Google Maps en el celular del conductor, así que no se pierde nada frente a usar Google.

## Notas

- Las sesiones se guardan en memoria: si se reinicia el servidor, hay que volver a iniciar sesión.
- Roles: donante, conductor y gestor (encargado de centro de acopio).
- Página pública de centros (`centros.html`): cualquiera ve en el mapa lo que pide cada centro y qué tan lleno está.
- Capacidad de los centros: cuenta lo que hay en bodega (recibido menos lo entregado a familias) más lo que viene en camino. Las entregas a familias se guardan en `datos/json/salidas.json`.
- Cada panel tiene una pestaña de resumen con estadísticas (donante, conductor y centro).
- Perfil (`perfil.html`, tocando el nombre arriba): cambiar datos y contraseña. El conductor marca su punto de partida y hasta qué distancia puede ir; con eso la lista "Recoger" muestra primero las donaciones más cercanas.
- Entrega personal: al donar se escoge "Que la recojan" o "Yo la llevo". Si la lleva el donante, la donación queda en estado "por llevar" (no la ven los conductores) y el centro la confirma al recibirla.
- Avisos automáticos: cada 20 segundos (solo con la página a la vista) se revisa si algo cambió y aparece un aviso abajo.
- Panel del centro (`panel.html`): el encargado ve lo que viene en camino y lo recibido, confirma la llegada de una donación (además del conductor) y actualiza horario, capacidad y necesidades. Si deja las necesidades vacías, el centro deja de aparecer para los donantes.
- Donar varios artículos a la vez (CU-04): cada artículo lleva cantidad y unidad (unidades, kg, libras, bolsas, paquetes o cajas). Si son alimentos se pide la fecha de vencimiento y no se aceptan vencidos. El donante puede usar la dirección guardada en su perfil.
- Cancelar (CU-05): el donante escoge el motivo y queda guardado.
- Mis donaciones (CU-06): filtro por estado, historial con fecha de cada cambio y, cuando va en camino, el nombre y teléfono del conductor.
- Observación de entrega (CU-09): al marcar entregada (conductor) o confirmar recibido (centro) se puede dejar una nota, que ve el donante.
- En la zona (CU-07): el encargado ve las donaciones publicadas cerca de su centro, de la más cercana a la más lejana, y puede buscar por artículo o barrio. No se muestra el teléfono del donante.
- Buscar centros (CU-11): en `centros.html` se busca por nombre o barrio y el botón «Cerca de mí» los ordena por distancia.
- Alerta de capacidad (CU-13): cuando un centro llega al 80 % aparece un aviso en su panel; se quita cuando baja del 70 %.

## Navegadores (HU-19)

Probado en Chrome. Antes de entregar hay que abrirlo también en Firefox y Edge (registro, publicar, aceptar, entregar y el mapa) y anotar el resultado.
