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
    irAMiPanel(usuario.rol);
    return;
  }
  document.getElementById("nombre-usuario").textContent = usuario.nombre;

  // traer los centros para el formulario
  const rc = await pedirApi("/api/centros");
  if (rc.ok) centros = rc.datos;

  iniciarMapaDonar();
  agregarArticulo();
  cargarMiDireccion();
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

  renumerarArticulos();   // la fecha de vencimiento solo se pide para alimentos

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

// ---------- articulos (CU-04): varios renglones con cantidad, unidad y vencimiento ----------
const UNIDADES = ["unidades", "kg", "libras", "bolsas", "paquetes", "cajas"];
const MAX_ARTICULOS = 10;

function hoyMasUno() {
  // el vencimiento tiene que ser despues de hoy
  const f = new Date();
  f.setDate(f.getDate() + 1);
  return f.getFullYear() + "-" + String(f.getMonth() + 1).padStart(2, "0") + "-" + String(f.getDate()).padStart(2, "0");
}

function agregarArticulo() {
  const caja = document.getElementById("articulos");
  if (caja.children.length >= MAX_ARTICULOS) return;
  const fila = document.createElement("div");
  fila.className = "articulo-fila";
  let opciones = "";
  UNIDADES.forEach(function (u) { opciones += '<option value="' + u + '">' + u + "</option>"; });
  fila.innerHTML =
    '<div class="a-cabeza"><strong class="a-numero"></strong>' +
    '<button type="button" class="a-quitar" title="Quitar este artículo" aria-label="Quitar este artículo">' + icono("basura") + "Quitar</button></div>" +
    '<label class="a-campo a-campo-nombre"><span>Artículo</span>' +
    '<input type="text" class="a-nombre" maxlength="60" placeholder="Ej: arroz, camiseta, jabón"></label>' +
    '<label class="a-campo"><span>Cantidad</span>' +
    '<input type="number" class="a-cantidad" min="1" placeholder="Ej: 5" inputmode="numeric"></label>' +
    '<label class="a-campo"><span>Unidad</span><select class="a-unidad">' + opciones + "</select></label>" +
    '<label class="a-campo a-vence"><span>Fecha de vencimiento</span>' +
    '<input type="date" class="a-vencimiento" min="' + hoyMasUno() + '"></label>';
  fila.querySelector(".a-quitar").addEventListener("click", function () {
    fila.remove();
    renumerarArticulos();
  });
  caja.appendChild(fila);
  renumerarArticulos();
}

// los ids (articulo-0, cantidad-0...) son los que el servidor usa para resaltar el campo con error
function renumerarArticulos() {
  const filas = document.querySelectorAll("#articulos .articulo-fila");
  const comida = document.getElementById("categoria").value === "Alimentos";
  filas.forEach(function (f, i) {
    f.querySelector(".a-nombre").id = "articulo-" + i;
    f.querySelector(".a-cantidad").id = "cantidad-" + i;
    f.querySelector(".a-unidad").id = "unidad-" + i;
    f.querySelector(".a-vencimiento").id = "vencimiento-" + i;
    f.querySelector(".a-numero").textContent = filas.length > 1 ? "Artículo " + (i + 1) : "";
    f.querySelector(".a-vence").classList.toggle("oculto", !comida);
    // siempre queda al menos un renglon
    f.querySelector(".a-quitar").classList.toggle("oculto", filas.length === 1);
  });
  document.getElementById("ayuda-vencimiento").classList.toggle("oculto", !comida);
  document.getElementById("boton-agregar-articulo").classList.toggle("oculto", filas.length >= MAX_ARTICULOS);
}

function leerArticulos() {
  const comida = document.getElementById("categoria").value === "Alimentos";
  return Array.from(document.querySelectorAll("#articulos .articulo-fila")).map(function (f) {
    return {
      articulo: f.querySelector(".a-nombre").value,
      cantidad: f.querySelector(".a-cantidad").value,
      unidad: f.querySelector(".a-unidad").value,
      vencimiento: comida ? f.querySelector(".a-vencimiento").value : ""
    };
  });
}

document.getElementById("boton-agregar-articulo").addEventListener("click", function () {
  agregarArticulo();
  const filas = document.querySelectorAll("#articulos .a-nombre");
  filas[filas.length - 1].focus();
});

// ---------- "Usar la direccion de mi perfil" ----------
let miDireccion = null;

async function cargarMiDireccion() {
  const r = await pedirEnSilencio("/api/perfil");
  if (r && r.direccion) {
    miDireccion = r;
    document.getElementById("boton-mi-direccion").classList.remove("oculto");
  }
}

document.getElementById("boton-mi-direccion").addEventListener("click", function () {
  if (!miDireccion) return;
  const campo = document.getElementById("direccion_recogida");
  campo.value = miDireccion.direccion;
  campo.dispatchEvent(new Event("input"));
  if (selectorRecogida && miDireccion.direccion_latitud != null) {
    const punto = [miDireccion.direccion_latitud, miDireccion.direccion_longitud];
    selectorRecogida.marcar(punto);
    mapaDonar.setView(punto, 16);
  }
});

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

// ---------- ¿la recogen o la lleva usted? ----------
const botonesModalidad = document.querySelectorAll(".modalidad");

botonesModalidad.forEach(function (boton) {
  boton.addEventListener("click", function () {
    elegirModalidad(boton.dataset.modalidad);
  });
});

function elegirModalidad(modalidad) {
  document.getElementById("modalidad").value = modalidad;
  botonesModalidad.forEach(function (b) {
    const escogido = b.dataset.modalidad === modalidad;
    b.classList.toggle("activa", escogido);
    b.setAttribute("aria-checked", escogido ? "true" : "false");
  });
  const personal = modalidad === "personal";
  document.getElementById("bloque-recogida").classList.toggle("oculto", personal);
  document.getElementById("bloque-personal").classList.toggle("oculto", !personal);
  if (personal) {
    pintarInfoCentro();
  } else if (mapaDonar) {
    mapaDonar.invalidateSize();   // el mapa estuvo escondido: que vuelva a medir su tamaño
  }
}

// direccion y horario del centro escogido, para el que la lleva personalmente
function pintarInfoCentro() {
  const caja = document.getElementById("info-centro-personal");
  const id = document.getElementById("id_centro").value;
  const c = centros.find(function (x) { return String(x.id) === id; });
  if (!c) {
    caja.innerHTML = '<p class="ayuda">Escoja primero el centro de acopio para ver su dirección y horario.</p>';
    return;
  }
  let html = "<strong>Llévela a " + limpiar(c.nombre) + "</strong>";
  html += dato("pin", limpiar(c.direccion) + ", " + limpiar(c.barrio) + ", " + limpiar(c.ciudad));
  html += dato("reloj", "Horario: " + limpiar(c.horario));
  if (c.latitud != null) {
    html += '<a class="boton secundario" href="' + enlaceComoLlegar([c.latitud, c.longitud]) +
      '" target="_blank" rel="noopener">' + icono("ruta") + "Cómo llegar</a>";
  }
  caja.innerHTML = html;
}

document.getElementById("id_centro").addEventListener("change", pintarInfoCentro);

// ---------- publicar ----------
document.getElementById("form-donacion").addEventListener("submit", async function (evento) {
  evento.preventDefault();
  const formulario = this;

  const datos = {
    categoria: document.getElementById("categoria").value,
    id_centro: document.getElementById("id_centro").value,
    articulos: leerArticulos(),
    descripcion: document.getElementById("descripcion").value,
    modalidad: document.getElementById("modalidad").value
  };

  if (datos.categoria === "" || datos.id_centro === "") {
    mostrarMensaje("Escoja la categoría y el centro de acopio.", "error");
    return;
  }

  if (datos.modalidad === "personal") {
    // la lleva usted: no hace falta direccion ni mapa
    datos.cuando_llevara = document.getElementById("cuando_llevara").value;
  } else {
    datos.direccion_recogida = document.getElementById("direccion_recogida").value;
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
  }

  const r = await enviarJson("/api/donaciones", datos);
  if (r.ok) {
    mostrarMensaje(r.datos.mensaje, "exito");
    formulario.reset();
    document.getElementById("articulos").innerHTML = "";
    agregarArticulo();
    elegirCategoria("");
    elegirModalidad("recogida");
    if (selectorRecogida) selectorRecogida.quitar();
  }
});

// ---------- mis donaciones ----------
// CU-06: filtro por estado, historial, quien la lleva y que paso al entregarla
const FILTROS = [
  { valor: "todas", texto: "Todas" },
  { valor: "activas", texto: "En proceso" },
  { valor: "recibida", texto: "Recibidas" },
  { valor: "cancelada", texto: "Canceladas" }
];
let filtro = "todas";

function pasaFiltro(d) {
  if (filtro === "todas") return true;
  if (filtro === "activas") return d.estado === "publicada" || d.estado === "en camino" || d.estado === "por llevar";
  return d.estado === filtro;
}

function elegirFiltro(valor) {
  filtro = valor;
  pintarDonaciones();
}

async function cargarDonaciones() {
  const r = await pedirApi("/api/mis-donaciones");
  if (!r.ok) return;
  misDonaciones = r.datos.reverse();   // las mas nuevas primero
  pintarDonaciones();
}

function pintarDonaciones() {
  const contenedor = document.getElementById("lista-donaciones");
  const lista = misDonaciones;

  if (lista.length === 0) {
    contenedor.innerHTML = '<div class="vacio">' + icono("caja") +
      "<p>Todavía no ha publicado donaciones.</p>" +
      '<button type="button" class="boton" onclick="abrirPestana(\'seccion-donar\')">' + icono("corazon") + "Hacer mi primera donación</button></div>";
    return;
  }

  // filtro por estado (con cuantas hay de cada una)
  let html = '<div class="filtros" role="group" aria-label="Filtrar por estado">';
  FILTROS.forEach(function (f) {
    const antes = filtro;
    filtro = f.valor;
    const cuantas = lista.filter(pasaFiltro).length;
    filtro = antes;
    html += '<button type="button" class="filtro' + (f.valor === filtro ? " activa" : "") + '" aria-pressed="' + (f.valor === filtro) +
      '" onclick="elegirFiltro(\'' + f.valor + '\')">' + f.texto + " <span>" + cuantas + "</span></button>";
  });
  html += "</div>";

  const visibles = lista.filter(pasaFiltro);
  if (visibles.length === 0) {
    html += '<p class="vacio">No tiene donaciones en este estado.</p>';
  }

  visibles.forEach(function (d) {
    html += '<div class="donacion">';
    html += iconoCategoria(d.categoria);
    html += '<div class="donacion-cabeza">';
    html += "<h3>" + limpiar(tituloDonacion(d)) + "</h3>";
    html += etiquetaEstado(d.estado);
    html += "</div>";

    html += '<div class="donacion-cuerpo">';
    html += detalleArticulos(d);
    if (d.descripcion) {
      html += dato("nota", limpiar(d.descripcion));
    }
    const personal = d.modalidad === "personal";
    if (d.estado === "por llevar") {
      // la lleva usted: a donde y cuando
      html += dato("centro", "Llévela a: <strong>" + limpiar(d.centro_nombre) + "</strong> — " + limpiar(d.centro_direccion));
      if (d.centro_horario) html += dato("reloj", "Horario: " + limpiar(d.centro_horario));
      if (d.cuando_llevara) html += dato("calendario", "Usted dijo: " + limpiar(d.cuando_llevara));
    } else {
      html += dato("centro", "Va para: <strong>" + limpiar(d.centro_nombre) + "</strong>" + (personal ? " (la llevó usted)" : ""));
    }
    // quien la recoge
    if (d.conductor_nombre && (d.estado === "en camino" || d.estado === "recibida")) {
      html += dato("vehiculo", "Conductor: <strong>" + limpiar(d.conductor_nombre) + "</strong>" +
        (d.conductor_vehiculo ? " · " + limpiar(d.conductor_vehiculo) : ""));
      if (d.estado === "en camino" && d.conductor_telefono) {
        html += dato("telefono", '<a href="tel:' + limpiar(d.conductor_telefono) + '">' + limpiar(d.conductor_telefono) + "</a>");
      }
    }
    if (d.motivo_cancelacion) html += dato("info", "Motivo: " + limpiar(d.motivo_cancelacion));
    if (d.observacion_entrega) {
      html += dato("chat", "Nota de la entrega (" + (d.observacion_de === "centro" ? "centro" : "conductor") + "): " + limpiar(d.observacion_entrega));
    }
    html += "</div>";

    // historial de estados, plegado
    html += '<details class="donacion-historial"><summary>' + icono("reloj") + "Historial</summary>" + historialDe(d) + "</details>";

    const activa = d.estado === "publicada" || d.estado === "en camino";
    const cancelable = d.estado === "publicada" || d.estado === "por llevar";   // RF016
    if (activa || cancelable) {
      html += '<div class="donacion-acciones">';
      if (activa) {
        // mientras no se ha entregado, puede ver el recorrido planeado hasta el centro
        html += '<button class="boton secundario" aria-expanded="false" onclick="verRecorrido(this, ' + d.id + ')">' + icono("ruta") + "Ver recorrido</button>";
      }
      if (d.estado === "por llevar" && d.centro_latitud != null) {
        html += '<a class="boton secundario" href="' + enlaceComoLlegar([d.centro_latitud, d.centro_longitud]) +
          '" target="_blank" rel="noopener">' + icono("ruta") + "Cómo llegar</a>";
      }
      if (cancelable) {
        html += '<button class="boton peligro" aria-expanded="false" onclick="abrirCancelar(this, ' + d.id + ')">' + icono("basura") + "Cancelar donación</button>";
      }
      html += "</div>";
      if (cancelable) html += formularioCancelar(d.id);
      if (activa) html += '<div class="donacion-mapa oculto"></div>';
    }
    html += "</div>";
  });
  contenedor.innerHTML = html;
}

function verRecorrido(boton, id) {
  const d = misDonaciones.find(function (x) { return x.id === id; });
  if (d) alternarRecorrido(boton, d);
}

// ---------- cancelar (CU-05): se pide el motivo ----------
const MOTIVOS = ["Ya no tengo los artículos", "Se la di a otra persona u organización",
  "Me equivoqué al publicarla", "Nadie la ha recogido", "Otro motivo"];

function formularioCancelar(id) {
  let opciones = '<option value="">Escoja el motivo…</option>';
  MOTIVOS.forEach(function (m) { opciones += "<option>" + m + "</option>"; });
  return '<form class="cancelar-form oculto" onsubmit="cancelar(event, ' + id + ')">' +
    '<label for="motivo-' + id + '">¿Por qué la cancela?</label>' +
    '<select id="motivo-' + id + '">' + opciones + "</select>" +
    '<input type="text" id="detalle-' + id + '" maxlength="200" placeholder="Cuéntenos un poco más (opcional)">' +
    '<p class="ayuda">Esto no se puede deshacer.</p>' +
    '<div class="donacion-acciones">' +
    '<button type="submit" class="boton peligro">' + icono("basura") + "Sí, cancelar</button>" +
    '<button type="button" class="boton secundario" onclick="cerrarCancelar(this)">No, volver</button></div></form>';
}

function abrirCancelar(boton, id) {
  const form = boton.closest(".donacion").querySelector(".cancelar-form");
  const abrir = form.classList.contains("oculto");
  form.classList.toggle("oculto", !abrir);
  boton.setAttribute("aria-expanded", abrir ? "true" : "false");
  if (abrir) document.getElementById("motivo-" + id).focus();
}

function cerrarCancelar(boton) {
  const tarjeta = boton.closest(".donacion");
  tarjeta.querySelector(".cancelar-form").classList.add("oculto");
  tarjeta.querySelector('[onclick^="abrirCancelar"]').setAttribute("aria-expanded", "false");
}

async function cancelar(evento, id) {
  evento.preventDefault();
  const motivo = document.getElementById("motivo-" + id).value;
  if (motivo === "") {
    mostrarMensaje("Escoja el motivo de la cancelación.", "error");
    resaltarCampo("motivo-" + id);
    return;
  }
  const r = await enviarJson("/api/donaciones/" + id + "/cancelar", {
    motivo: motivo,
    detalle: document.getElementById("detalle-" + id).value
  });
  if (r.ok) {
    mostrarMensaje(r.datos.mensaje, "exito");
    cargarDonaciones();
  }
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
      const que = tituloDonacion(d);
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
iniciar().then(function (listo) {
  if (!listo) return;                      // no era donante: ya se fue a su panel
  revisarDonaciones();                     // primera foto de como estan
  revisarCadaCierto(revisarDonaciones, 20000);
});
