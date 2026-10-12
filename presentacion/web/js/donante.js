// Panel del donante: publicar (RF002), ver estado (RF010) y cancelar (RF016)

const mensaje = document.getElementById("mensaje");
let centros = [];

// ---------- al abrir la pagina ----------
async function iniciar() {
  // revisar que haya sesion y que sea donante
  const respuesta = await fetch("/api/sesion");
  const usuario = await respuesta.json();
  if (usuario.rol !== "donante") {
    window.location.href = "/login.html";
    return;
  }
  document.getElementById("nombre-usuario").textContent = usuario.nombre;

  // traer los centros para el formulario
  const r = await fetch("/api/centros");
  centros = await r.json();
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

    if (boton.dataset.seccion === "seccion-mis") {
      cargarDonaciones();
    }
  });
});

// ---------- al escoger categoria: mostrar solo los centros que la necesitan ----------
document.getElementById("categoria").addEventListener("change", function () {
  const categoria = this.value;
  const select = document.getElementById("id_centro");
  document.getElementById("necesita").textContent = "";

  if (categoria === "") {
    select.innerHTML = '<option value="">Primero escoja la categoría…</option>';
    return;
  }

  let opciones = '<option value="">Seleccione…</option>';
  let cuantos = 0;
  centros.forEach(function (c) {
    if (c.necesidades[categoria]) {
      opciones += '<option value="' + c.id + '">' + limpiar(c.nombre) + " — " + limpiar(c.barrio) + "</option>";
      cuantos++;
    }
  });

  if (cuantos === 0) {
    opciones = '<option value="">Ningún centro necesita esto ahora</option>';
  }
  select.innerHTML = opciones;
});

// ---------- al escoger centro: decir que necesita ----------
document.getElementById("id_centro").addEventListener("change", function () {
  const categoria = document.getElementById("categoria").value;
  const centro = centros.find(function (c) { return c.id == this.value; }, this);
  const texto = document.getElementById("necesita");

  if (centro) {
    texto.textContent = "Este centro necesita: " + centro.necesidades[categoria].join(", ");
  } else {
    texto.textContent = "";
  }
});

// ---------- publicar ----------
document.getElementById("form-donacion").addEventListener("submit", async function (evento) {
  evento.preventDefault();

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

  const respuesta = await fetch("/api/donaciones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos)
  });
  const resultado = await respuesta.json();

  if (respuesta.ok) {
    mostrarMensaje(resultado.mensaje, "exito");
    this.reset();
    document.getElementById("necesita").textContent = "";
  } else {
    mostrarMensaje(resultado.error, "error");
  }
});

// ---------- mis donaciones ----------
async function cargarDonaciones() {
  const contenedor = document.getElementById("lista-donaciones");
  const respuesta = await fetch("/api/mis-donaciones");
  const lista = await respuesta.json();

  if (lista.length === 0) {
    contenedor.innerHTML = '<p class="vacio">Todavía no ha publicado donaciones.</p>';
    return;
  }

  // las mas nuevas primero
  lista.reverse();

  let html = "";
  lista.forEach(function (d) {
    html += '<div class="donacion">';
    html += "<h3>" + d.cantidad + " × " + limpiar(d.articulo) + "</h3>";
    html += etiquetaEstado(d.estado);
    if (d.descripcion) {
      html += "<p>" + limpiar(d.descripcion) + "</p>";
    }
    html += "<p>Va para: " + limpiar(d.centro_nombre) + "</p>";
    html += "<p>Publicada: " + formatearFecha(d.fecha_publicacion) + "</p>";
    if (d.estado === "recibida") {
      html += "<p>Entregada: " + formatearFecha(d.fecha_entrega) + "</p>";
    }
    // solo se puede cancelar si esta publicada (RF016)
    if (d.estado === "publicada") {
      html += '<button class="boton peligro" onclick="cancelar(' + d.id + ')">Cancelar donación</button>';
    }
    html += "</div>";
  });
  contenedor.innerHTML = html;
}

async function cancelar(id) {
  // confirmar antes de algo que no se puede deshacer (RNF006)
  if (!confirm("¿Seguro que quiere cancelar esta donación? No se puede deshacer.")) {
    return;
  }

  const respuesta = await fetch("/api/donaciones/" + id + "/cancelar", { method: "POST" });
  const resultado = await respuesta.json();

  if (respuesta.ok) {
    mostrarMensaje(resultado.mensaje, "exito");
  } else {
    mostrarMensaje(resultado.error, "error");
  }
  cargarDonaciones();
}

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

// "2026-10-12 17:30" -> "12/10/2026 17:30"  (formato colombiano, RNF015)
function formatearFecha(texto) {
  if (!texto) return "";
  const partes = texto.split(" ");
  const f = partes[0].split("-");
  return f[2] + "/" + f[1] + "/" + f[0] + " " + partes[1];
}

// evita que alguien meta codigo HTML en los textos (seguridad)
function limpiar(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

iniciar();