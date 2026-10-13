// Panel del donante: publicar (RF002), ver estado (RF010) y cancelar (RF016)
// (pedirApi, mostrarMensaje, limpiar, etc. estan en comun.js)

let centros = [];

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
    return;
  }

  let opciones = '<option value="">Seleccione un centro de acopio…</option>';
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
}

// ---------- al escoger centro: decir que necesita ----------
document.getElementById("id_centro").addEventListener("change", function () {
  const categoria = document.getElementById("categoria").value;
  const idEscogido = this.value;
  const centro = centros.find(function (c) { return String(c.id) === idEscogido; });
  const texto = document.getElementById("necesita");

  if (centro && centro.necesidades[categoria]) {
    texto.textContent = "Este centro necesita: " + centro.necesidades[categoria].join(", ");
  } else {
    texto.textContent = "";
  }
});

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

  const r = await enviarJson("/api/donaciones", datos);
  if (r.ok) {
    mostrarMensaje(r.datos.mensaje, "exito");
    formulario.reset();
    elegirCategoria("");
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

    // solo se puede cancelar si esta publicada (RF016)
    if (d.estado === "publicada") {
      html += '<div class="donacion-acciones">';
      html += '<button class="boton peligro" onclick="cancelar(' + d.id + ')">' + icono("basura") + "Cancelar donación</button>";
      html += "</div>";
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
  const r = await enviarJson("/api/donaciones/" + id + "/cancelar");
  if (r.ok) {
    mostrarMensaje(r.datos.mensaje, "exito");
  }
  cargarDonaciones();
}

activarBotonSalir();
iniciar();
