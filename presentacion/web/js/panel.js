// Panel del centro de acopio (rol "gestor"):
// ver lo que viene en camino, confirmar lo recibido y actualizar necesidades.
// (pedirApi, mostrarMensaje, limpiar, etc. estan en comun.js; mapas en mapa.js)

let centro = null;
let porLlegar = [];      // para el boton "Ver recorrido"
let mapaMiCentro = null;

// ---------- al abrir la pagina ----------
async function iniciar() {
  const r = await pedirApi("/api/sesion");
  if (!r.ok) return;
  if (r.datos.rol !== "gestor") {
    irAMiPanel(r.datos.rol);
    return;
  }
  document.getElementById("nombre-usuario").textContent = r.datos.nombre;

  await cargarCentro();
  cargarDonaciones();
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

    if (boton.dataset.seccion === "seccion-resumen") {
      pintarEstadisticas(document.getElementById("resumen"));
    } else if (boton.dataset.seccion === "seccion-centro") {
      llenarFormulario();
      mostrarMapaMiCentro();
    } else if (boton.dataset.seccion === "seccion-bodega") {
      cargarCentro();
      cargarDonaciones();
      cargarSalidas();
    } else {
      cargarDonaciones();
    }
  });
});

// ---------- resumen de arriba ----------
async function cargarCentro() {
  const r = await pedirApi("/api/mi-centro");
  if (!r.ok) {
    document.getElementById("nombre-centro").textContent = "Sin centro de acopio";
    return;
  }
  centro = r.datos;
  pintarResumen();
}

function pintarResumen() {
  document.getElementById("nombre-centro").textContent = centro.nombre;
  document.getElementById("direccion-centro").textContent =
    centro.direccion + ", " + centro.barrio + ", " + centro.ciudad + " · " + centro.horario;

  document.getElementById("cifra-libre").textContent = centro.libre;
  document.getElementById("cifra-bodega").textContent = centro.en_bodega;
  document.getElementById("texto-bodega").textContent = centro.en_bodega;

  // barra de ocupacion: verde normal, ambar desde 75 %, roja si esta lleno
  // (ocupado = lo que hay en bodega + lo que viene en camino)
  const porcentaje = centro.porcentaje;
  const barra = document.getElementById("ocupacion-barra");
  const relleno = document.getElementById("ocupacion-relleno");
  relleno.style.width = porcentaje + "%";
  barra.className = "ocupacion-barra " + nivelOcupacion(porcentaje);
  barra.setAttribute("aria-valuenow", porcentaje);
  document.getElementById("ocupacion-texto").textContent =
    centro.ocupado + " de " + centro.capacidad_maxima + " artículos (" + porcentaje + " %)";
}

// ---------- tarjeta de una donacion ----------
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
  if (d.modalidad === "personal") {
    // la trae el donante personalmente
    html += dato("usuario", "<strong>Donante:</strong> " + limpiar(d.donante_nombre) + " — la trae personalmente");
    if (d.estado === "por llevar" && d.cuando_llevara) {
      html += dato("reloj", "Dijo que vendría: " + limpiar(d.cuando_llevara));
    }
  } else {
    html += dato("usuario", "<strong>Donante:</strong> " + limpiar(d.donante_nombre));
  }
  if (d.conductor_nombre) {
    html += dato("vehiculo", "<strong>Conductor:</strong> " + limpiar(d.conductor_nombre) +
      (d.conductor_vehiculo ? " (" + limpiar(d.conductor_vehiculo) + ")" : ""));
  } else if (d.estado === "publicada") {
    html += dato("reloj", "Esperando que un conductor la acepte");
  }
  return html;
}

// ---------- POR LLEGAR y RECIBIDAS ----------
async function cargarDonaciones() {
  const r = await pedirApi("/api/mi-centro/donaciones");
  if (!r.ok) return;
  const datos = r.datos;

  // las mas nuevas primero
  porLlegar = datos.por_llegar.reverse();
  const recibidas = datos.recibidas.reverse();

  document.getElementById("cifra-llegar").textContent = porLlegar.length;

  // por llegar: primero las que ya vienen en camino
  // primero lo que ya viene (en camino o lo trae el donante), despues lo que espera conductor
  porLlegar.sort(function (a, b) {
    return (a.estado === "publicada" ? 1 : 0) - (b.estado === "publicada" ? 1 : 0);
  });

  const llegar = document.getElementById("lista-llegar");
  if (porLlegar.length === 0) {
    llegar.innerHTML = '<p class="vacio">No hay donaciones en camino a su centro por ahora.</p>';
  } else {
    let html = "";
    porLlegar.forEach(function (d) {
      html += tarjeta(d);
      html += dato("calendario", "Publicada el " + formatearFecha(d.fecha_publicacion));
      html += "</div>";
      html += '<div class="donacion-acciones">';
      if (d.modalidad === "personal") {
        // no hay recorrido: el donante llega por su cuenta. Se le puede llamar.
        if (d.donante_telefono) {
          const numero = String(d.donante_telefono).replace(/\D/g, "");
          html += '<a class="boton secundario" href="tel:' + numero + '">' + icono("telefono") + "Llamar al donante</a>";
        }
      } else {
        html += '<button class="boton secundario" aria-expanded="false" onclick="verRecorrido(this, ' + d.id + ')">' + icono("ruta") + "Ver recorrido</button>";
        if (d.conductor_telefono) {
          const numero = String(d.conductor_telefono).replace(/\D/g, "");
          html += '<a class="boton secundario" href="tel:' + numero + '">' + icono("telefono") + "Llamar</a>";
        }
      }
      if (d.estado === "en camino" || d.estado === "por llevar") {
        html += '<button class="boton verde" onclick="recibir(' + d.id + ')">' + icono("check") + "Confirmar recibido</button>";
      }
      html += "</div>";
      html += '<div class="donacion-mapa oculto"></div>';
      html += "</div>";
    });
    llegar.innerHTML = html;
  }

  const lista = document.getElementById("lista-recibidas");
  if (recibidas.length === 0) {
    lista.innerHTML = '<p class="vacio">Todavía no ha recibido donaciones.</p>';
  } else {
    let html = "";
    recibidas.forEach(function (d) {
      html += tarjeta(d);
      html += dato("check", "Recibida el " + formatearFecha(d.fecha_entrega));
      html += "</div></div>";
    });
    lista.innerHTML = html;
  }
}

function verRecorrido(boton, id) {
  const d = porLlegar.find(function (x) { return x.id === id; });
  if (d) alternarRecorrido(boton, d);
}

async function recibir(id) {
  if (!confirm("¿Confirma que esta donación ya llegó a su centro?")) {
    return;
  }
  recibidasPorMi.add(id);   // para no avisarle de su propia accion
  const r = await enviarJson("/api/donaciones/" + id + "/recibir");
  if (r.ok) {
    mostrarMensaje(r.datos.mensaje, "exito");
  }
  cargarCentro();
  cargarDonaciones();
}

// ---------- BODEGA: entregas a las familias ----------
const botonesSalida = document.querySelectorAll("#form-salida .categoria");

botonesSalida.forEach(function (boton) {
  boton.addEventListener("click", function () {
    elegirCategoriaSalida(boton.dataset.categoria);
  });
});

function elegirCategoriaSalida(categoria) {
  document.getElementById("salida_categoria").value = categoria;
  botonesSalida.forEach(function (b) {
    const escogido = b.dataset.categoria === categoria;
    b.classList.toggle("activa", escogido);
    b.setAttribute("aria-checked", escogido ? "true" : "false");
  });
}

document.getElementById("form-salida").addEventListener("submit", async function (evento) {
  evento.preventDefault();
  const formulario = this;
  const datos = {
    categoria: document.getElementById("salida_categoria").value,
    cantidad: document.getElementById("salida_cantidad").value,
    descripcion: document.getElementById("salida_descripcion").value
  };
  if (datos.categoria === "") {
    mostrarMensaje("Escoja qué entregó: Alimentos, Ropa, Aseo o Varias.", "error");
    return;
  }
  const r = await enviarJson("/api/mi-centro/salidas", datos);
  if (r.ok) {
    mostrarMensaje(r.datos.mensaje, "exito");
    formulario.reset();
    elegirCategoriaSalida("");
    cargarCentro();
    cargarSalidas();
  }
});

async function cargarSalidas() {
  const r = await pedirApi("/api/mi-centro/salidas");
  if (!r.ok) return;
  const caja = document.getElementById("lista-salidas");
  if (r.datos.length === 0) {
    caja.innerHTML = '<p class="vacio">Todavía no ha registrado entregas a las familias.</p>';
    return;
  }
  let html = "";
  r.datos.forEach(function (s) {
    html += '<div class="donacion">';
    html += iconoCategoria(s.categoria);
    html += '<div class="donacion-cabeza"><h3>' + s.cantidad + " artículos</h3>" +
      '<span class="estado recibida">' + icono("corazon") + limpiar(s.categoria) + "</span></div>";
    html += '<div class="donacion-cuerpo">';
    html += dato("usuario", limpiar(s.descripcion));
    html += dato("calendario", "Entregado el " + formatearFecha(s.fecha));
    html += "</div></div>";
  });
  caja.innerHTML = html;
}

// ---------- MI CENTRO ----------
function llenarFormulario() {
  if (!centro) return;
  const n = centro.necesidades || {};
  document.getElementById("nec_alimentos").value = (n["Alimentos"] || []).join(", ");
  document.getElementById("nec_ropa").value = (n["Ropa"] || []).join(", ");
  document.getElementById("nec_aseo").value = (n["Aseo"] || []).join(", ");
  document.getElementById("horario").value = centro.horario;
  document.getElementById("capacidad_maxima").value = centro.capacidad_maxima;
}

// "arroz, atún , aceite" -> ["arroz", "atún", "aceite"]
function separarPorComas(texto) {
  return texto.split(",").map(function (p) { return p.trim(); }).filter(function (p) { return p !== ""; });
}

document.getElementById("form-centro").addEventListener("submit", async function (evento) {
  evento.preventDefault();

  const necesidades = {
    "Alimentos": separarPorComas(document.getElementById("nec_alimentos").value),
    "Ropa": separarPorComas(document.getElementById("nec_ropa").value),
    "Aseo": separarPorComas(document.getElementById("nec_aseo").value)
  };
  const vacio = necesidades.Alimentos.length + necesidades.Ropa.length + necesidades.Aseo.length === 0;
  if (vacio && !confirm("No escribió ninguna necesidad. Su centro dejará de aparecer para los donantes. ¿Continuar?")) {
    return;
  }

  const r = await enviarJson("/api/mi-centro", {
    horario: document.getElementById("horario").value,
    capacidad_maxima: document.getElementById("capacidad_maxima").value,
    necesidades: necesidades
  });
  if (r.ok) {
    centro = r.datos.centro;
    pintarResumen();
    llenarFormulario();
    mostrarMensaje(r.datos.mensaje, "exito");
  }
});

// mapa pequeño con el pin del centro (se crea la primera vez que se abre la pestaña)
function mostrarMapaMiCentro() {
  const caja = document.getElementById("mapa-mi-centro");
  if (mapaMiCentro || !centro) return;

  if (!mapaDisponible()) {
    caja.innerHTML = '<p class="mapa-aviso">' + icono("info") + "No se pudo cargar el mapa. Revise su conexión a internet.</p>";
    return;
  }
  caja.className = "mapa";
  const punto = [centro.latitud, centro.longitud];
  mapaMiCentro = crearMapa(caja, { center: punto, zoom: 16 });
  ponerMarcador(mapaMiCentro, punto, "centro", limpiar(centro.nombre));
}

// ---------- avisos automaticos: lo que viene para el centro ----------
let llegadasConocidas = null;   // id -> estado de lo que viene o ya llego
const recibidasPorMi = new Set();

function abrirPestana(seccion) {
  document.querySelector('.pestanas [data-seccion="' + seccion + '"]').click();
}

async function revisarLlegadas() {
  const datos = await pedirEnSilencio("/api/mi-centro/donaciones");
  if (!datos) return;
  const todas = datos.por_llegar.concat(datos.recibidas);

  let huboCambio = false;
  if (llegadasConocidas) {
    todas.forEach(function (d) {
      const antes = llegadasConocidas[d.id];
      const que = d.cantidad + " × " + d.articulo;
      const ver = { texto: "Ver", alTocar: function () { abrirPestana("seccion-llegar"); } };
      if (!antes) {
        huboCambio = true;
        mostrarAviso("Nueva donación para su centro: " + que +
          (d.modalidad === "personal" ? ". La trae el donante personalmente." : "."), "caja", ver);
      } else if (antes !== d.estado) {
        huboCambio = true;
        if (d.estado === "en camino") {
          mostrarAviso(que + " ya viene en camino" + (d.conductor_nombre ? " con " + d.conductor_nombre : "") + ".", "camion", ver);
        } else if (d.estado === "recibida" && !recibidasPorMi.has(d.id)) {
          mostrarAviso((d.conductor_nombre || "El conductor") + " entregó " + que + ". Ya está en bodega.", "check",
            { texto: "Ver", alTocar: function () { abrirPestana("seccion-bodega"); } });
        }
      }
    });
    // alguna se cancelo o cambio: tambien hay que refrescar los numeros
    if (Object.keys(llegadasConocidas).length !== todas.length) huboCambio = true;
  }
  llegadasConocidas = {};
  todas.forEach(function (d) { llegadasConocidas[d.id] = d.estado; });

  if (huboCambio) {
    cargarCentro();   // cifras y barra de capacidad
    if ((seccionVisible("seccion-llegar") && !hayMapaAbierto("seccion-llegar")) || seccionVisible("seccion-bodega")) {
      cargarDonaciones();
    }
  }
}

activarBotonSalir();
iniciar().then(function (listo) {
  if (!listo) return;                      // no era encargado de centro: ya se fue a su panel
  revisarLlegadas();                       // primera foto de como estan
  revisarCadaCierto(revisarLlegadas, 20000);
});
