// Panel del conductor: aceptar recogida, ver entregas (RF005),
// marcar como entregada (RF006) y horarios (RF020)

const mensaje = document.getElementById("mensaje");
let conductor = null;

// ---------- al abrir la pagina ----------
async function iniciar() {
  const respuesta = await fetch("/api/sesion");
  conductor = await respuesta.json();

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
    mensaje.className = "mensaje";

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
  const respuesta = await fetch("/api/donaciones/disponibles");
  const lista = await respuesta.json();

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
  const respuesta = await fetch("/api/donaciones/" + id + "/aceptar", { method: "POST" });
  const resultado = await respuesta.json();

  if (respuesta.ok) {
    mostrarMensaje(resultado.mensaje, "exito");
  } else {
    mostrarMensaje(resultado.error, "error");
  }
  cargarPorRecoger();
}

// ---------- MIS ENTREGAS ----------
async function cargarEntregas() {
  const respuesta = await fetch("/api/mis-entregas");
  const datos = await respuesta.json();

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
  const respuesta = await fetch("/api/donaciones/" + id + "/completar", { method: "POST" });
  const resultado = await respuesta.json();

  if (respuesta.ok) {
    mostrarMensaje(resultado.mensaje, "exito");
  } else {
    mostrarMensaje(resultado.error, "error");
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

  const respuesta = await fetch("/api/disponibilidad", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ disponible: disponible, franjas: franjas })
  });
  const resultado = await respuesta.json();

  if (respuesta.ok) {
    conductor.disponible = disponible;
    conductor.franjas = franjas;
    mostrarMensaje(resultado.mensaje, "exito");
  } else {
    mostrarMensaje(resultado.error, "error");
  }
});

// ---------- salir ----------
document.getElementById("boton-salir").addEventListener("click", async function () {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/";
});

// ---------- ayudas ----------
function mostrarMensaje(texto, tipo) {
  mensaje.textContent = texto;
  mensaje.className = "mensaje " + tipo;
  window.scrollTo(0, 0);
}

function etiquetaEstado(estado) {
  const textos = {
    "publicada": "Publicada",
    "en camino": "En camino",
    "recibida": "Recibida",
    "cancelada": "Cancelada"
  };
  return '<span class="estado ' + estado.replace(" ", "-") + '">' + textos[estado] + "</span>";
}

function formatearFecha(texto) {
  if (!texto) return "";
  const partes = texto.split(" ");
  const f = partes[0].split("-");
  return f[2] + "/" + f[1] + "/" + f[0] + " " + partes[1];
}

function limpiar(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

iniciar();