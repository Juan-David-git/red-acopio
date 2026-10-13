// Panel del conductor: aceptar recogida, ver entregas (RF005),
// marcar como entregada (RF006) y horarios (RF020)
// (pedirApi, mostrarMensaje, limpiar, etc. estan en comun.js)

let conductor = null;

// ---------- al abrir la pagina ----------
async function iniciar() {
  const r = await pedirApi("/api/sesion");
  if (!r.ok) return;
  conductor = r.datos;

  // revisar que haya sesion y que sea conductor
  if (conductor.rol !== "conductor") {
    window.location.href = "/login.html";
    return;
  }
  document.getElementById("nombre-usuario").textContent = conductor.nombre;

  cargarPorRecoger();
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
  html += '</div><div class="donacion-acciones">';
  html += '<a class="boton secundario" href="tel:' + numero + '">' + icono("telefono") + "Llamar</a>";
  html += '<a class="boton secundario" href="https://wa.me/57' + numero + '" target="_blank" rel="noopener">' + icono("chat") + "WhatsApp</a>";
  return html;
}

// ---------- POR RECOGER ----------
async function cargarPorRecoger() {
  const contenedor = document.getElementById("lista-recoger");
  const r = await pedirApi("/api/donaciones/disponibles");
  if (!r.ok) return;
  const lista = r.datos;

  if (lista.length === 0) {
    contenedor.innerHTML = '<p class="vacio">No hay donaciones esperando conductor en este momento. 🙌</p>';
    return;
  }

  let html = "";
  lista.forEach(function (d) {
    html += tarjeta(d);
    html += dato("calendario", "Publicada el " + formatearFecha(d.fecha_publicacion));
    html += '</div><div class="donacion-acciones">';
    html += '<button class="boton" onclick="aceptar(' + d.id + ')">' + icono("camion") + "Aceptar recogida</button>";
    html += "</div></div>";
  });
  contenedor.innerHTML = html;
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

activarBotonSalir();
iniciar();
