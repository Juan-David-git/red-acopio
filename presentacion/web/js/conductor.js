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
function tarjeta(d) {
  let html = '<div class="donacion">';
  html += "<h3>" + d.cantidad + " × " + limpiar(d.articulo) + "</h3>";
  if (d.descripcion) {
    html += "<p>" + limpiar(d.descripcion) + "</p>";
  }
  html += "<p>📍 <strong>Recoger en:</strong> " + limpiar(d.direccion_recogida) + "</p>";
  html += "<p>🏪 <strong>Llevar a:</strong> " + limpiar(d.centro_nombre) + " — " + limpiar(d.centro_direccion) + "</p>";
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
    html += "<p>Publicada: " + formatearFecha(d.fecha_publicacion) + "</p>";
    html += '<button class="boton" onclick="aceptar(' + d.id + ')">Aceptar recogida</button>';
    html += "</div>";
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
      html += "<p>📞 Donante: " + limpiar(d.donante_nombre) + " — " + limpiar(d.donante_telefono) + "</p>";
      html += etiquetaEstado(d.estado);
      html += '<br><button class="boton" onclick="completar(' + d.id + ')">Marcar como entregada</button>';
      html += "</div>";
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
      html += etiquetaEstado(d.estado);
      html += "<p>Entregada: " + formatearFecha(d.fecha_entrega) + "</p>";
      html += "</div>";
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
