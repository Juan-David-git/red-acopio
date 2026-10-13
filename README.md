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

## Notas

- Las sesiones se guardan en memoria: si se reinicia el servidor, hay que volver a iniciar sesión.
- Roles: donante, conductor y gestor (encargado de centro de acopio). El panel del gestor está pendiente.
