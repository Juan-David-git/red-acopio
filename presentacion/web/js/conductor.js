// Panel del conductor: aceptar recogida, ver entregas (RF005),
// marcar como entregada (RF006) y horarios (RF020)
// (pedirApi, mostrarMensaje, limpiar, etc. estan en comun.js)

let conductor = null;
let porRecoger = [];     // lista que se ve en "Recoger" (para el boton "Ver recorrido")

// ---------- al abrir la pagina ----------
async function iniciar() {
  const r = await pedirApi("/api/sesion");
  if (!r.ok) return;
  conductor = r.datos;

  // revisar que haya sesion y que sea conductor
  if (conductor.rol !== "conductor") {
    irAMiPanel(conductor.rol);
    return;
  }
  document.getElementById("nombre-usuario").textContent = conductor.nombre;
  iniciarZona();

  cargarPorRecoger();
  return true;
}

// ---------- pestañas ----------
const botones = document.querySelectorAll(".pestanas button");

botones.forEach(function (boton) {
  boton.addEventListener("click", function () {
    botones.forEach(function (b) {
      b.classList.remove("activa");
      document.getElementById(b.dataset.seccion).classList.add("oculto");
    });
    boton.classList.add("activa");
    document.getElementById(boton.dataset.seccion).classList.remove("oculto");
    ocultarMensaje();

    if (boton.dataset.seccion === "seccion-recoger") cargarPorRecoger();
    if (boton.dataset.seccion === "seccion-entregas") cargarEntregas();
    if (boton.dataset.seccion === "seccion-horarios") llenarHorarios();
    if (boton.dataset.seccion === "seccion-resumen") pintarEstadisticas(document.getElementById("resumen"));
  });
});

// ---------- tarjeta de una donacion (se usa en varias listas) ----------
// abre la tarjeta y su cuerpo; quien la usa agrega lo suyo y luego cierra con cerrarTarjeta()
function tarjeta(d) {
  let html = '<div class="donacion">';
  html += iconoCategoria(d.categoria);
  html += '<div class="donacion-cabeza">';
  html += "<h3>" + d.cantidad + " × " + limpiar(d.articulo) + "</h3>";
  html += etiquetaEstado(d.estado);
  html += "</div>";
  html += '<div class="donacion-cuerpo">';
  if (d.descripcion) {
    html += dato("nota", limpiar(d.descripcion));
  }
  html += dato("pin", "<strong>Recoger en:</strong> " + limpiar(d.direccion_recogida));
  html += dato("centro", "<strong>Llevar a:</strong> " + limpiar(d.centro_nombre) + " — " + limpiar(d.centro_direccion));
  return html;
}

// botones para contactar al donante (llamada y WhatsApp)
function contactoDonante(d) {
  const numero = String(d.donante_telefono || "").replace(/\D/g, "");
  let html = dato("usuario", "<strong>Donante:</strong> " + limpiar(d.donante_nombre));
  // mapa del recorrido entre la informacion y los botones (se llena despues)
  html += '</div><div class="donacion-mapa" data-id="' + d.id + '"></div>';
  html += '<div class="donacion-acciones">';
  html += '<a class="boton secundario" href="tel:' + numero + '">' + icono("telefono") + "Llamar</a>";
  html += '<a class="boton secundario" href="https://wa.me/57' + numero + '" target="_blank" rel="noopener">' + icono("chat") + "WhatsApp</a>";
  return html;
}

// ---------- POR RECOGER ----------
// ---------- cercania (filtrar por zona) ----------
let puntoPartida = null;      // [lat, lon] desde donde se miden las distancias
let origenPunto = "";         // "perfil" o "ahora"
let alcance = "cerca";        // "cerca" (dentro del radio) o "todas"

function iniciarZona() {
  if (conductor.zona_latitud != null && conductor.zona_longitud != null) {
    puntoPartida = [conductor.zona_latitud, conductor.zona_longitud];
    origenPunto = "perfil";
  }
  pintarTextoZona();
}

function pintarTextoZona() {
  const texto = document.getElementById("texto-zona");
  const radio = conductor.radio_km || 5;
  if (!puntoPartida) {
    texto.className = "mapa-estado";
    texto.innerHTML = icono("info") + '<span>Para ver primero las más cercanas, marque su punto de partida en <a href="/perfil.html">Mi perfil</a> o use dónde está ahora.</span>';
  } else {
    texto.className = "mapa-estado listo";
    texto.innerHTML = icono("pin") + "<span>Ordenadas por cercanía a " +
      (origenPunto === "ahora" ? "donde está ahora" : "su punto de partida") +
      ". «Cerca de mí» = hasta " + radio + " km.</span>";
  }
}

document.querySelectorAll("[data-alcance]").forEach(function (chip) {
  chip.addEventListener("click", function () {
    document.querySelectorAll("[data-alcance]").forEach(function (c) { c.classList.remove("activa"); });
    chip.classList.add("activa");
    alcance = chip.dataset.alcance;
    pintarPorRecoger();
  });
});

document.getElementById("boton-aqui").addEventListener("click", function () {
  const boton = this;
  if (!navigator.geolocation) {
    mostrarMensaje("Su navegador no permite saber su ubicación.", "error");
    return;
  }
  boton.disabled = true;
  navigator.geolocation.getCurrentPosition(function (pos) {
    boton.disabled = false;
    puntoPartida = [pos.coords.latitude, pos.coords.longitude];
    origenPunto = "ahora";
    pintarTextoZona();
    pintarPorRecoger();
  }, function () {
    boton.disabled = false;
    mostrarMensaje("No pudimos obtener su ubicación. Revise el permiso del navegador.", "error");
  }, { enableHighAccuracy: true, timeout: 10000 });
});

// distancia del conductor al punto de recogida (null si no se puede saber)
function distanciaA(d) {
  if (!puntoPartida || d.latitud_recogida == null || d.longitud_recogida == null) return null;
  return distanciaKm(puntoPartida, [d.latitud_recogida, d.longitud_recogida]);
}

// ---------- POR RECOGER ----------
async function cargarPorRecoger() {
  const r = await pedirApi("/api/donaciones/disponibles");
  if (!r.ok) return;
  porRecoger = r.datos;
  pintarPorRecoger();
}

function pintarPorRecoger() {
  const contenedor = document.getElementById("lista-recoger");
  if (porRecoger.length === 0) {
    contenedor.innerHTML = '<p class="vacio">No hay donaciones esperando conductor en este momento. 🙌</p>';
    return;
  }

  // calcular distancias y ordenar: primero las mas cercanas, al final las que no tienen punto
  let lista = porRecoger.map(function (d) { d.distancia = distanciaA(d); return d; });
  if (puntoPartida) {
    lista.sort(function (a, b) {
      if (a.distancia == null) return 1;
      if (b.distancia == null) return -1;
      return a.distancia - b.distancia;
    });
  }

  // "Cerca de mi": solo las que estan dentro del radio (las que no tienen punto no se pueden medir)
  let ocultas = 0;
  if (puntoPartida && alcance === "cerca") {
    const radio = conductor.radio_km || 5;
    const cerca = lista.filter(function (d) { return d.distancia != null && d.distancia <= radio; });
    ocultas = lista.length - cerca.length;
    lista = cerca;
  }

  let html = "";
  if (lista.length === 0) {
    html += '<p class="vacio">No hay donaciones dentro de ' + (conductor.radio_km || 5) + " km. Toque «Todas» para ver las demás.</p>";
  }
  lista.forEach(function (d) {
    html += tarjeta(d);
    if (d.distancia != null) {
      html += '<p class="dato dato-distancia">' + icono("ruta") + "<span>A " + formatoKm(d.distancia) + " de usted</span></p>";
    } else if (puntoPartida) {
      html += dato("info", "Sin punto en el mapa: revise la dirección");
    }
    html += dato("calendario", "Publicada el " + formatearFecha(d.fecha_publicacion));
    html += '</div><div class="donacion-acciones">';
    // antes de aceptar puede ver que tan lejos queda
    html += '<button class="boton secundario" aria-expanded="false" onclick="verRecorrido(this, ' + d.id + ')">' + icono("ruta") + "Ver recorrido</button>";
    html += '<button class="boton" onclick="aceptar(' + d.id + ')">' + icono("camion") + "Aceptar recogida</button>";
    html += "</div>";
    html += '<div class="donacion-mapa oculto"></div>';
    html += "</div>";
  });
  if (ocultas > 0 && lista.length > 0) {
    html += '<p class="ayuda centrado">Hay ' + ocultas + " donación" + (ocultas === 1 ? "" : "es") + " más lejos. Toque «Todas» para verlas.</p>";
  }
  contenedor.innerHTML = html;
}

function verRecorrido(boton, id) {
  const d = porRecoger.find(function (x) { return x.id === id; });
  if (d) alternarRecorrido(boton, d);
}

async function aceptar(id) {
  if (!confirm("¿Se compromete a recoger esta donación y llevarla al centro de acopio?")) {
    return;
  }
  const r = await enviarJson("/api/donaciones/" + id + "/aceptar");
  if (r.ok) {
    mostrarMensaje(r.datos.mensaje, "exito");
  }
  cargarPorRecoger();
}

// ---------- MIS ENTREGAS ----------
async function cargarEntregas() {
  const r = await pedirApi("/api/mis-entregas");
  if (!r.ok) return;
  const datos = r.datos;

  // pendientes: con boton para marcar entregada
  const pendientes = document.getElementById("lista-pendientes");
  if (datos.pendientes.length === 0) {
    pendientes.innerHTML = '<p class="vacio">No tiene entregas pendientes.</p>';
  } else {
    let html = "";
    datos.pendientes.forEach(function (d) {
      html += tarjeta(d);
      html += contactoDonante(d);
      html += '<button class="boton verde" onclick="completar(' + d.id + ')">' + icono("check") + "Marcar como entregada</button>";
      html += "</div></div>";
    });
    pendientes.innerHTML = html;

    // un mapa con el recorrido en cada entrega pendiente
    datos.pendientes.forEach(function (d) {
      mostrarRecorrido(pendientes.querySelector('.donacion-mapa[data-id="' + d.id + '"]'), d);
    });
  }

  // completadas: solo informacion
  const completadas = document.getElementById("lista-completadas");
  if (datos.completadas.length === 0) {
    completadas.innerHTML = '<p class="vacio">Todavía no ha completado entregas.</p>';
  } else {
    let html = "";
    datos.completadas.forEach(function (d) {
      html += tarjeta(d);
      html += dato("check", "Entregada el " + formatearFecha(d.fecha_entrega));
      html += "</div></div>";
    });
    completadas.innerHTML = html;
  }
}

async function completar(id) {
  if (!confirm("¿Confirma que ya entregó esta donación en el centro de acopio?")) {
    return;
  }
  completadasPorMi.add(id);   // para no avisarle de su propia accion
  const r = await enviarJson("/api/donaciones/" + id + "/completar");
  if (r.ok) {
    mostrarMensaje(r.datos.mensaje, "exito");
  }
  cargarEntregas();
}

// ---------- HORARIOS ----------
function llenarHorarios() {
  // marcar las casillas con lo que tiene guardado
  document.getElementById("disponible").checked = conductor.disponible;
  document.querySelectorAll('input[name="franja"]').forEach(function (c) {
    c.checked = conductor.franjas.includes(c.value);
  });
}

document.getElementById("form-horarios").addEventListener("submit", async function (evento) {
  evento.preventDefault();

  const disponible = document.getElementById("disponible").checked;
  const franjas = [];
  document.querySelectorAll('input[name="franja"]:checked').forEach(function (c) {
    franjas.push(c.value);
  });

  const r = await enviarJson("/api/disponibilidad", { disponible: disponible, franjas: franjas });
  if (r.ok) {
    conductor.disponible = disponible;
    conductor.franjas = franjas;
    mostrarMensaje(r.datos.mensaje, "exito");
  }
});

// ---------- avisos automaticos ----------
// - donaciones nuevas esperando conductor
// - el centro confirmo una entrega que usted llevaba
let disponiblesConocidas = null;   // ids que ya habia visto en "Recoger"
let completadasConocidas = null;   // ids de sus entregas ya completadas
const completadasPorMi = new Set(); // las que usted mismo marco como entregadas (no se avisan)

function abrirPestana(seccion) {
  document.querySelector('.pestanas [data-seccion="' + seccion + '"]').click();
}

async function revisarCambios() {
  // 1. donaciones nuevas para recoger
  const disponibles = await pedirEnSilencio("/api/donaciones/disponibles");
  if (disponibles) {
    const ids = disponibles.map(function (d) { return d.id; });
    if (disponiblesConocidas) {
      const nuevas = disponibles.filter(function (d) { return !disponiblesConocidas.has(d.id); });
      if (nuevas.length) {
        const texto = nuevas.length === 1
          ? "Hay una donación nueva para recoger: " + nuevas[0].cantidad + " × " + nuevas[0].articulo + "."
          : "Hay " + nuevas.length + " donaciones nuevas para recoger.";
        mostrarAviso(texto, "caja", { texto: "Ver", alTocar: function () { abrirPestana("seccion-recoger"); } });
      }
      // la lista se refresca sola si la esta mirando (y no tiene un mapa abierto)
      const cambio = nuevas.length || ids.length !== disponiblesConocidas.size;
      if (cambio && seccionVisible("seccion-recoger") && !hayMapaAbierto("seccion-recoger")) {
        porRecoger = disponibles;
        pintarPorRecoger();
      }
    }
    disponiblesConocidas = new Set(ids);
  }

  // 2. el centro confirmo una de sus entregas
  const entregas = await pedirEnSilencio("/api/mis-entregas");
  if (entregas) {
    if (completadasConocidas) {
      entregas.completadas.forEach(function (d) {
        // una entrega que aparece como completada y que usted no marco: la confirmo el centro
        if (!completadasConocidas.has(d.id) && !completadasPorMi.has(d.id)) {
          mostrarAviso("El centro " + d.centro_nombre + " confirmó que recibió " + d.cantidad + " × " + d.articulo + ". ¡Gracias!", "check",
            { texto: "Ver", alTocar: function () { abrirPestana("seccion-entregas"); } });
          if (seccionVisible("seccion-entregas") && !hayMapaAbierto("seccion-entregas")) cargarEntregas();
        }
      });
    }
    completadasConocidas = new Set(entregas.completadas.map(function (d) { return d.id; }));
  }
}

activarBotonSalir();
iniciar().then(function (listo) {
  if (!listo) return;                      // no era conductor: ya se fue a su panel
  revisarCambios();                        // primera foto de como estan
  revisarCadaCierto(revisarCambios, 20000);
});
