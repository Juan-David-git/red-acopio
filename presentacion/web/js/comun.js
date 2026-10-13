// Funciones que usan varias paginas (donante, conductor...).
// Se carga ANTES del script de cada pagina.

// ---------- hablar con el servidor ----------
// Hace la peticion y devuelve { ok, datos }.
// Si la sesion se perdio (por ejemplo, se reinicio el servidor),
// avisa y manda al login en vez de dejar la pagina rota.
async function pedirApi(url, opciones) {
  let respuesta;
  try {
    respuesta = await fetch(url, opciones);
  } catch (e) {
    mostrarMensaje("No hay conexión con el servidor. Intente de nuevo.", "error");
    return { ok: false, datos: null };
  }

  let datos = null;
  try {
    datos = await respuesta.json();
  } catch (e) {
    datos = { error: "El servidor respondió algo inesperado." };
  }

  if (respuesta.status === 401) {
    alert("Su sesión terminó. Inicie sesión de nuevo.");
    window.location.href = "/login.html";
    return { ok: false, datos: datos };
  }

  if (!respuesta.ok) {
    mostrarMensaje(datos.error || "Ocurrió un error.", "error");
  }
  return { ok: respuesta.ok, datos: datos };
}

// atajo para mandar JSON por POST
function enviarJson(url, cuerpo) {
  return pedirApi(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo || {})
  });
}

// ---------- mensajes en pantalla ----------
function mostrarMensaje(texto, tipo) {
  const caja = document.getElementById("mensaje");
  if (!caja) return;
  caja.textContent = texto;
  caja.className = "mensaje " + tipo;
  window.scrollTo(0, 0);
}

function ocultarMensaje() {
  const caja = document.getElementById("mensaje");
  if (caja) caja.className = "mensaje";
}

// ---------- formatos ----------
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
  div.textContent = texto == null ? "" : texto;
  return div.innerHTML;
}

// ---------- salir ----------
function activarBotonSalir() {
  const boton = document.getElementById("boton-salir");
  if (!boton) return;
  boton.addEventListener("click", async function () {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
  });
}
