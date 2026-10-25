// Mapas de Red Acopio (Leaflet + OpenStreetMap).
// Necesita que la pagina cargue antes leaflet.css y leaflet.js, iconos.js y comun.js.
//
// Funciones principales:
//   crearMapa(elemento)                 -> mapa centrado en Bucaramanga
//   ponerMarcador(mapa, punto, tipo)    -> pin "recogida" (naranja) o "centro" (verde)
//   mostrarRecorrido(contenedor, d)     -> mapa + ruta de una donacion + boton de Google Maps
//
// Un "punto" es siempre un arreglo [latitud, longitud].

const BUCARAMANGA = [7.1193, -73.1227];

// ¿cargo Leaflet? (si no hay internet, no)
function mapaDisponible() {
  return typeof L !== "undefined";
}

function crearMapa(elemento, opciones) {
  const mapa = L.map(elemento, Object.assign({
    center: BUCARAMANGA,
    zoom: 13,
    scrollWheelZoom: false   // para no hacer zoom sin querer al bajar por la pagina
  }, opciones || {}));

  // mapa base claro y suave (CARTO Voyager, datos de OpenStreetMap)
  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    maxZoom: 19,
    subdomains: "abcd",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }).addTo(mapa);

  return mapa;
}

// pin con el estilo de la pagina: gota de color con un icono blanco adentro
function iconoPin(tipo) {
  const icono = { recogida: "caja", centro: "centro", centroApagado: "centro" }[tipo] || "pin";
  return L.divIcon({
    className: "pin pin-" + tipo,
    html: '<svg class="pin-gota" viewBox="0 0 32 42" aria-hidden="true">' +
          '<path d="M16 41S2 25.5 2 15.5a14 14 0 0 1 28 0C30 25.5 16 41 16 41z"/></svg>' +
          '<svg class="pin-icono" aria-hidden="true"><use href="#i-' + icono + '"></use></svg>',
    iconSize: [32, 42],
    iconAnchor: [16, 41],
    popupAnchor: [0, -36]
  });
}

function ponerMarcador(mapa, punto, tipo, texto) {
  const m = L.marker(punto, { icon: iconoPin(tipo), keyboard: false }).addTo(mapa);
  if (texto) m.bindPopup(texto);
  return m;
}

// ---------- recorrido ----------

// distancia en linea recta en km (formula de haversine)
function distanciaKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLon = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

function formatoKm(km) {
  return km.toLocaleString("es-CO", { maximumFractionDigits: 1 }) + " km";
}

// Pide la ruta por las calles al servicio publico de OSRM.
// Si no responde (sin internet, servicio caido), devuelve null y se dibuja una linea recta.
async function pedirRuta(origen, destino) {
  const url = "https://router.project-osrm.org/route/v1/driving/" +
    origen[1] + "," + origen[0] + ";" + destino[1] + "," + destino[0] +
    "?overview=full&geometries=geojson";
  try {
    const control = new AbortController();
    const espera = setTimeout(function () { control.abort(); }, 6000);
    const respuesta = await fetch(url, { signal: control.signal });
    clearTimeout(espera);
    const datos = await respuesta.json();
    if (datos.code !== "Ok" || !datos.routes.length) return null;
    const ruta = datos.routes[0];
    return {
      // GeoJSON viene como [longitud, latitud]; Leaflet usa [latitud, longitud]
      puntos: ruta.geometry.coordinates.map(function (c) { return [c[1], c[0]]; }),
      km: ruta.distance / 1000,
      minutos: Math.max(1, Math.round(ruta.duration / 60))
    };
  } catch (e) {
    return null;
  }
}

// dibuja la ruta en el mapa y devuelve el texto con distancia y tiempo
async function dibujarRecorrido(mapa, origen, destino) {
  const ruta = await pedirRuta(origen, destino);

  if (ruta) {
    // borde blanco debajo para que la linea resalte sobre el mapa
    L.polyline(ruta.puntos, { color: "#fff", weight: 8, opacity: .9 }).addTo(mapa);
    L.polyline(ruta.puntos, { color: "#1E5A54", weight: 5 }).addTo(mapa);
    return "≈ " + formatoKm(ruta.km) + " · " + ruta.minutos + " min en carro";
  }

  L.polyline([origen, destino], { color: "#1E5A54", weight: 4, dashArray: "8 10" }).addTo(mapa);
  return "≈ " + formatoKm(distanciaKm(origen, destino)) + " en línea recta";
}

function enlaceGoogleMaps(origen, destino) {
  return "https://www.google.com/maps/dir/?api=1&travelmode=driving" +
    "&origin=" + origen[0] + "," + origen[1] +
    "&destination=" + destino[0] + "," + destino[1];
}

function puntoRecogida(d) {
  if (d.latitud_recogida == null || d.longitud_recogida == null) return null;
  return [d.latitud_recogida, d.longitud_recogida];
}

function puntoCentro(d) {
  if (d.centro_latitud == null || d.centro_longitud == null) return null;
  return [d.centro_latitud, d.centro_longitud];
}

// Arma dentro de "contenedor" el mapa del recorrido de una donacion:
// pin naranja (recogida) -> pin verde (centro), linea de ruta, distancia y boton a Google Maps.
async function mostrarRecorrido(contenedor, d) {
  if (!mapaDisponible()) {
    contenedor.innerHTML = '<p class="mapa-aviso">' + icono("info") +
      "No se pudo cargar el mapa. Revise su conexión a internet.</p>";
    return;
  }

  const origen = puntoRecogida(d);
  const destino = puntoCentro(d);

  contenedor.innerHTML =
    '<div class="mapa mapa-recorrido"></div>' +
    '<div class="mapa-pie">' +
      '<p class="mapa-leyenda">' +
        '<span><i class="punto recogida"></i>Recogida</span>' +
        '<span><i class="punto centro"></i>Centro de acopio</span>' +
      "</p>" +
      '<p class="mapa-distancia"></p>' +
    "</div>";

  const mapa = crearMapa(contenedor.querySelector(".mapa"));
  const textoDistancia = contenedor.querySelector(".mapa-distancia");

  if (destino) ponerMarcador(mapa, destino, "centro", limpiar(d.centro_nombre));
  if (origen) ponerMarcador(mapa, origen, "recogida", "Recoger aquí: " + limpiar(d.direccion_recogida));

  // sin punto de recogida: solo se ve el centro
  if (!origen || !destino) {
    mapa.setView(destino || origen || BUCARAMANGA, 15);
    textoDistancia.innerHTML = icono("info") + (origen
      ? "El centro no tiene ubicación registrada."
      : "El donante no marcó el punto en el mapa. Use la dirección escrita.");
    return;
  }

  mapa.fitBounds([origen, destino], { padding: [40, 40] });
  textoDistancia.innerHTML = icono("ruta") + "Calculando recorrido…";
  textoDistancia.innerHTML = icono("ruta") + await dibujarRecorrido(mapa, origen, destino);

  const boton = document.createElement("a");
  boton.className = "boton secundario ancho";
  boton.href = enlaceGoogleMaps(origen, destino);
  boton.target = "_blank";
  boton.rel = "noopener";
  boton.innerHTML = icono("pin") + "Abrir en Google Maps";
  contenedor.appendChild(boton);
}

// Boton "Ver recorrido" que abre y cierra el mapa debajo de una tarjeta.
// El mapa se crea solo la primera vez que se abre (asi no se piden rutas de mas).
function alternarRecorrido(boton, d) {
  const caja = boton.closest(".donacion").querySelector(".donacion-mapa");
  const abrir = caja.classList.contains("oculto");
  caja.classList.toggle("oculto", !abrir);
  boton.setAttribute("aria-expanded", abrir ? "true" : "false");
  boton.innerHTML = icono("ruta") + (abrir ? "Ocultar recorrido" : "Ver recorrido");
  if (abrir && !caja.dataset.listo) {
    caja.dataset.listo = "1";
    mostrarRecorrido(caja, d);
  }
}
