// Panel del donante: publicar (RF002), ver estado (RF010) y cancelar (RF016)
// (pedirApi, mostrarMensaje, limpiar, etc. estan en comun.js)

let centros = [];
let misDonaciones = [];

// mapa del formulario
let mapaDonar = null;
let selectorRecogida = null;     // pin naranja que pone el donante (ver selectorDePunto en mapa.js)
let marcadoresCentros = {};      // id del centro -> marcador verde

// ---------- al abrir la pagina ----------
async function iniciar() {
  // revisar que haya sesion y que sea donante
  const r = await pedirApi("/api/sesion");
  if (!r.ok) return;
  const usuario = r.datos;
  if (usuario.rol !== "donante") {
    window.location.href = "/login.html";
    return;
  }
  document.getElementById("nombre-usuario").textContent = usuario.nombre;

  // traer los centros para el formulario
  const rc = await pedirApi("/api/centros");
  if (rc.ok) centros = rc.datos;

  iniciarMapaDonar();
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

    if (boton.dataset.seccion === "seccion-mis") {
      cargarDonaciones();
    }
    if (boton.dataset.seccion === "seccion-resumen") {
      pintarEstadisticas(document.getElementById("resumen"));
    }
  });
});

// ---------- categoria: botones grandes (Alimentos, Ropa, Aseo) ----------
const botonesCategoria = document.querySelectorAll(".categoria");

botonesCategoria.forEach(function (boton) {
  boton.addEventListener("click", function () {
    elegirCategoria(boton.dataset.categoria);
  });
});

function elegirCategoria(categoria) {
  document.getElementById("categoria").value = categoria;

  // marcar el boton escogido
  botonesCategoria.forEach(function (b) {
    const escogido = b.dataset.categoria === categoria;
    b.classList.toggle("activa", escogido);
    b.setAttribute("aria-checked", escogido ? "true" : "false");
  });

  // mostrar solo los centros que necesitan esa categoria
  const select = document.getElementById("id_centro");
  document.getElementById("necesita").textContent = "";

  if (categoria === "") {
    select.innerHTML = '<option value="">Primero escoja la categoría…</option>';
    pintarCentros();
    return;
  }

  let opciones = '<option value="">Seleccione un centro de acopio…</option>';
  let cuantos = 0;
  centros.forEach(function (c) {
    if (c.necesidades[categoria]) {
      // los centros llenos se ven pero no se pueden escoger
      const lleno = c.porcentaje >= 100;
      opciones += '<option value="' + c.id + '"' + (lleno ? " disabled" : "") + ">" +
        limpiar(c.nombre) + " — " + limpiar(c.barrio) + (lleno ? " (lleno)" : " · " + c.porcentaje + " % lleno") + "</option>";
      cuantos++;
    }
  });

  if (cuantos === 0) {
    opciones = '<option value="">Ningún centro necesita esto ahora</option>';
  }
  select.innerHTML = opciones;
  pintarCentros();
}

// ---------- al escoger centro: decir que necesita ----------
document.getElementById("id_centro").addEventListener("change", function () {
  const categoria = document.getElementById("categoria").value;
  const idEscogido = this.value;
  const centro = centros.find(function (c) { return String(c.id) === idEscogido; });
  const texto = document.getElementById("necesita");

  if (centro && centro.necesidades[categoria]) {
    texto.textContent = "Este centro necesita: " + centro.necesidades[categoria].join(", ") +
      ". Tiene espacio para " + centro.libre + " artículos más.";
  } else {
    texto.textContent = "";
  }

  const marcador = centro && marcadoresCentros[centro.id];
  if (marcador) {
    mapaDonar.panTo(marcador.getLatLng());
    marcador.openPopup();
  }
});

// ---------- mapa del formulario ----------
function iniciarMapaDonar() {
  const caja = document.getElementById("mapa-recogida");
  if (!mapaDisponible()) {
    caja.outerHTML = '<p class="mapa-aviso">' + icono("info") +
      "No se pudo cargar el mapa (revise su conexión). Puede publicar solo con la dirección.</p>";
    document.getElementById("boton-ubicacion").classList.add("oculto");
    document.getElementById("estado-punto").classList.add("oculto");
    return;
  }

  mapaDonar = crearMapa(caja);
  pintarCentros();

  // tocar el mapa (o "Usar mi ubicacion") = marcar el punto de recogida
  selectorRecogida = selectorDePunto(mapaDonar, {
    tipo: "recogida",
    estado: document.getElementById("estado-punto"),
    botonUbicacion: document.getElementById("boton-ubicacion")
  });
}

// centros en verde; si ya escogio categoria, los que no la necesitan quedan en gris
function pintarCentros() {
  if (!mapaDonar) return;
  const categoria = document.getElementById("categoria").value;

  Object.values(marcadoresCentros).forEach(function (m) { m.remove(); });
  marcadoresCentros = {};

  centros.forEach(function (c) {
    if (c.latitud == null || c.longitud == null) return;
    const sirve = categoria === "" || Boolean(c.necesidades[categoria]);
    let texto = limpiar(c.nombre) + '<br><small style="font-weight:400">' + limpiar(c.barrio) + "</small>";
    if (categoria !== "" && sirve) {
      texto += '<br><button type="button" class="boton verde" onclick="escogerCentro(' + c.id + ')">Llevar aquí</button>';
    } else if (categoria !== "") {
      texto += '<br><small style="font-weight:400">No está pidiendo ' + limpiar(categoria) + "</small>";
    }
    marcadoresCentros[c.id] = ponerMarcador(mapaDonar, [c.latitud, c.longitud], sirve ? "centro" : "centroApagado", texto);
  });
}

// boton "Llevar aqui" de la ventanita de un centro
function escogerCentro(id) {
  const select = document.getElementById("id_centro");
  select.value = String(id);
  select.dispatchEvent(new Event("change"));
  mapaDonar.closePopup();
}

// ---------- publicar ----------
document.getElementById("form-donacion").addEventListener("submit", async function (evento) {
  evento.preventDefault();
  const formulario = this;

  const datos = {
    categoria: document.getElementById("categoria").value,
    id_centro: document.getElementById("id_centro").value,
    articulo: document.getElementById("articulo").value,
    cantidad: document.getElementById("cantidad").value,
    descripcion: document.getElementById("descripcion").value,
    direccion_recogida: document.getElementById("direccion_recogida").value
  };

  if (datos.categoria === "" || datos.id_centro === "") {
    mostrarMensaje("Escoja la categoría y el centro de acopio.", "error");
    return;
  }

  // si el mapa cargo, el punto es obligatorio
  const punto = selectorRecogida ? selectorRecogida.punto() : null;
  if (selectorRecogida && !punto) {
    mostrarMensaje("Toque el mapa para marcar dónde se recoge la donación.", "error");
    return;
  }
  if (punto) {
    datos.latitud_recogida = punto[0];
    datos.longitud_recogida = punto[1];
  }

  const r = await enviarJson("/api/donaciones", datos);
  if (r.ok) {
    mostrarMensaje(r.datos.mensaje, "exito");
    formulario.reset();
    elegirCategoria("");
    if (selectorRecogida) selectorRecogida.quitar();
  }
});

// ---------- mis donaciones ----------
async function cargarDonaciones() {
  const contenedor = document.getElementById("lista-donaciones");
  const r = await pedirApi("/api/mis-donaciones");
  if (!r.ok) return;
  const lista = r.datos;

  if (lista.length === 0) {
    contenedor.innerHTML = '<p class="vacio">Todavía no ha publicado donaciones.</p>';
    return;
  }

  // las mas nuevas primero
  lista.reverse();
  misDonaciones = lista;

  let html = "";
  lista.forEach(function (d) {
    html += '<div class="donacion">';
    html += iconoCategoria(d.categoria);
    html += '<div class="donacion-cabeza">';
    html += "<h3>" + d.cantidad + " × " + limpiar(d.articulo) + "</h3>";
    html += etiquetaEstado(d.estado);
    html += "</div>";

    html += '<div class="donacion-cuerpo">';
    if (d.descripcion) {
      html += dato("nota", limpiar(d.descripcion));
    }
    html += dato("centro", "Va para: <strong>" + limpiar(d.centro_nombre) + "</strong>");
    html += dato("calendario", "Publicada el " + formatearFecha(d.fecha_publicacion));
    if (d.estado === "recibida") {
      html += dato("check", "Entregada el " + formatearFecha(d.fecha_entrega));
    }
    html += "</div>";

    // mientras no se ha entregado, puede ver el recorrido planeado hasta el centro
    const activa = d.estado === "publicada" || d.estado === "en camino";
    if (activa) {
      html += '<div class="donacion-acciones">';
      html += '<button class="boton secundario" aria-expanded="false" onclick="verRecorrido(this, ' + d.id + ')">' + icono("ruta") + "Ver recorrido</button>";
      // solo se puede cancelar si esta publicada (RF016)
      if (d.estado === "publicada") {
        html += '<button class="boton peligro" onclick="cancelar(' + d.id + ')">' + icono("basura") + "Cancelar donación</button>";
      }
      html += "</div>";
      html += '<div class="donacion-mapa oculto"></div>';
    }
    html += "</div>";
  });
  contenedor.innerHTML = html;
}

function verRecorrido(boton, id) {
  const d = misDonaciones.find(function (x) { return x.id === id; });
  if (d) alternarRecorrido(boton, d);
}

async function cancelar(id) {
  // confirmar antes de algo que no se puede deshacer (RNF006)
  if (!confirm("¿Seguro que quiere cancelar esta donación? No se puede deshacer.")) {
    return;
  }
  const r = await enviarJson("/api/donaciones/" + id + "/cancelar");
  if (r.ok) {
    mostrarMensaje(r.datos.mensaje, "exito");
  }
  cargarDonaciones();
}

// ---------- avisos automaticos: cuando su donacion cambia de estado ----------
let estadosConocidos = null;   // id de la donacion -> estado la ultima vez que se reviso

function abrirPestana(seccion) {
  document.querySelector('.pestanas [data-seccion="' + seccion + '"]').click();
}

async function revisarDonaciones() {
  const lista = await pedirEnSilencio("/api/mis-donaciones");
  if (!lista) return;

  let huboCambio = false;
  if (estadosConocidos) {
    lista.forEach(function (d) {
      // si no la conocia (la publico hace poco y cambio antes de revisar), se toma como "publicada"
      const antes = estadosConocidos[d.id] || "publicada";
      if (antes === d.estado) return;
      huboCambio = true;
      const que = d.cantidad + " × " + d.articulo;
      const ver = { texto: "Ver", alTocar: function () { abrirPestana("seccion-mis"); } };
      if (d.estado === "en camino") {
        mostrarAviso("Un conductor va por su donación de " + que + ".", "camion", ver);
      } else if (d.estado === "recibida") {
        mostrarAviso("¡Su donación de " + que + " llegó a " + d.centro_nombre + "! Gracias.", "check", ver);
      }
    });
  }
  estadosConocidos = {};
  lista.forEach(function (d) { estadosConocidos[d.id] = d.estado; });

  // si esta mirando la lista, se actualiza sola (menos si tiene un mapa abierto)
  if (huboCambio && seccionVisible("seccion-mis") && !hayMapaAbierto("seccion-mis")) {
    cargarDonaciones();
  }
}

activarBotonSalir();
iniciar();
revisarDonaciones();                       // primera foto de como estan
revisarCadaCierto(revisarDonaciones, 20000);
