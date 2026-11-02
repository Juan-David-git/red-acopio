// Pagina publica de centros de acopio: mapa, necesidades y que tan llenos estan.
// No necesita sesion. (comun.js: pedirApi, limpiar, barraOcupacion...; mapa.js: crearMapa, ponerMarcador)

let centros = [];
let filtro = "";
let mapa = null;
let marcadores = {};   // id del centro -> marcador

const PANELES = { donante: "/donante.html", conductor: "/conductor.html", gestor: "/panel.html" };
const ICONOS_CATEGORIA = { Alimentos: "alimentos", Ropa: "ropa", Aseo: "aseo" };

async function iniciar() {
  // si ya inicio sesion, el boton de arriba lleva a su panel
  const s = await pedirApi("/api/sesion");
  if (s.ok && s.datos.rol) {
    const enlace = document.getElementById("enlace-cuenta");
    enlace.href = PANELES[s.datos.rol] || "/";
    enlace.innerHTML = icono("casa") + "<span>Mi panel</span>";
  }

  const r = await pedirApi("/api/centros");
  if (!r.ok) return;
  centros = r.datos;

  if (mapaDisponible()) {
    mapa = crearMapa(document.getElementById("mapa-centros"));
  } else {
    document.getElementById("mapa-centros").outerHTML = '<p class="mapa-aviso">' + icono("info") +
      "No se pudo cargar el mapa. Revise su conexión a internet.</p>";
  }
  pintar();
}

// ---------- filtro por categoria ----------
document.querySelectorAll(".chip").forEach(function (chip) {
  chip.addEventListener("click", function () {
    document.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("activa"); });
    chip.classList.add("activa");
    filtro = chip.dataset.filtro;
    pintar();
  });
});

function visibles() {
  return centros.filter(function (c) {
    return filtro === "" || Boolean(c.necesidades[filtro]);
  });
}

// ---------- mapa y lista ----------
function pintar() {
  const lista = visibles();

  // mapa: un pin por centro, con el color de que tan lleno esta
  if (mapa) {
    Object.values(marcadores).forEach(function (m) { m.remove(); });
    marcadores = {};
    const puntos = [];
    lista.forEach(function (c) {
      if (c.latitud == null || c.longitud == null) return;
      const tipo = { "": "centro", "casi": "centroCasi", "lleno": "centroLleno" }[nivelOcupacion(c.porcentaje)];
      const texto = limpiar(c.nombre) + '<br><small style="font-weight:400">' + c.porcentaje + " % lleno</small>";
      marcadores[c.id] = ponerMarcador(mapa, [c.latitud, c.longitud], tipo, texto);
      puntos.push([c.latitud, c.longitud]);
    });
    if (puntos.length) {
      mapa.fitBounds(L.latLngBounds(puntos), { paddingTopLeft: [30, 56], paddingBottomRight: [30, 24], maxZoom: 15 });
    }
  }

  // lista de tarjetas
  const caja = document.getElementById("lista-centros");
  if (lista.length === 0) {
    caja.innerHTML = '<p class="vacio">Ningún centro está pidiendo ' + limpiar(filtro) + " en este momento.</p>";
    return;
  }

  let html = "";
  lista.forEach(function (c) {
    html += '<article class="centro-tarjeta" data-id="' + c.id + '">';
    html += '<div class="centro-cabeza">';
    html += "<h3>" + limpiar(c.nombre) + "</h3>";
    if (c.porcentaje >= 100) {
      html += '<span class="estado cancelada">' + icono("equis") + "Lleno</span>";
    }
    html += "</div>";
    html += dato("pin", limpiar(c.direccion) + ", " + limpiar(c.barrio) + ", " + limpiar(c.ciudad));
    html += dato("reloj", limpiar(c.horario));

    // lo que necesita, por categoria
    const categorias = Object.keys(c.necesidades);
    if (categorias.length === 0) {
      html += dato("info", "Por ahora no está pidiendo donaciones.");
    } else {
      html += '<div class="necesidades">';
      categorias.forEach(function (cat) {
        html += '<p class="necesidad">' + icono(ICONOS_CATEGORIA[cat] || "caja") +
          "<strong>" + limpiar(cat) + ":</strong> " + c.necesidades[cat].map(limpiar).join(", ") + "</p>";
      });
      html += "</div>";
    }

    html += barraOcupacion(c);
    if (mapa && c.latitud != null) {
      html += '<button type="button" class="boton secundario" onclick="verEnMapa(' + c.id + ')">' + icono("pin") + "Ver en el mapa</button>";
    }
    html += "</article>";
  });
  caja.innerHTML = html;
}

function verEnMapa(id) {
  const m = marcadores[id];
  if (!m) return;
  document.getElementById("mapa-centros").scrollIntoView({ behavior: "smooth", block: "center" });
  mapa.setView(m.getLatLng(), 16);
  m.openPopup();
}

iniciar();
