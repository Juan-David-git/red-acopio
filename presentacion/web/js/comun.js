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
// etiqueta de color con icono; se distingue por color Y por icono
function etiquetaEstado(estado) {
  const info = {
    "publicada": ["Publicada", "reloj"],
    "en camino": ["En camino", "camion"],
    "recibida": ["Recibida", "check"],
    "cancelada": ["Cancelada", "equis"]
  };
  const e = info[estado] || [estado, "info"];
  return '<span class="estado ' + estado.replace(" ", "-") + '">' + icono(e[1]) + e[0] + "</span>";
}

// icono grande de la categoria para las tarjetas
function iconoCategoria(categoria) {
  const nombres = { "Alimentos": "alimentos", "Ropa": "ropa", "Aseo": "aseo" };
  return '<div class="donacion-icono ' + limpiar(categoria) + '">' + icono(nombres[categoria] || "caja") + "</div>";
}

// una linea de dato con icono: dato("pin", "<strong>Recoger en:</strong> ...")
function dato(nombreIcono, html) {
  return '<p class="dato">' + icono(nombreIcono) + "<span>" + html + "</span></p>";
}

// que tan lleno esta un centro: "" (con espacio), "casi" (desde 75 %) o "lleno"
function nivelOcupacion(porcentaje) {
  if (porcentaje >= 100) return "lleno";
  if (porcentaje >= 75) return "casi";
  return "";
}

// barra de ocupacion de un centro (necesita c.porcentaje, c.ocupado, c.capacidad_maxima y c.libre)
function barraOcupacion(c) {
  const nivel = nivelOcupacion(c.porcentaje);
  const texto = nivel === "lleno" ? "Sin espacio por ahora" : "Espacio para " + c.libre + " artículos";
  return '<div class="ocupacion">' +
    '<div class="ocupacion-texto"><span>' + c.porcentaje + " % lleno</span><span>" + texto + "</span></div>" +
    '<div class="ocupacion-barra ' + nivel + '" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + c.porcentaje + '">' +
    '<div style="width:' + c.porcentaje + '%"></div></div></div>';
}

// "2026-10-12 17:30" -> "12 oct. 2026, 17:30"  (formato colombiano, RNF015)
function formatearFecha(texto) {
  if (!texto) return "";
  const meses = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sep.", "oct.", "nov.", "dic."];
  const partes = texto.split(" ");
  const f = partes[0].split("-");
  return parseInt(f[2], 10) + " " + meses[parseInt(f[1], 10) - 1] + " " + f[0] + (partes[1] ? ", " + partes[1] : "");
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

// ---------- avisos automaticos ----------
// mostrarAviso("Su donación va en camino", "camion", { texto: "Ver", alTocar: fn })
// Aparece abajo de la pantalla y se va solo a los 8 segundos.
function mostrarAviso(texto, nombreIcono, accion) {
  let caja = document.getElementById("avisos");
  if (!caja) {
    caja = document.createElement("div");
    caja.id = "avisos";
    caja.className = "avisos";
    caja.setAttribute("aria-live", "polite");
    document.body.appendChild(caja);
  }
  const aviso = document.createElement("div");
  aviso.className = "aviso";
  aviso.innerHTML = icono(nombreIcono || "info") + '<span class="aviso-texto"></span>';
  aviso.querySelector(".aviso-texto").textContent = texto;

  if (accion) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "aviso-boton";
    boton.textContent = accion.texto;
    boton.addEventListener("click", function () {
      accion.alTocar();
      aviso.remove();
    });
    aviso.appendChild(boton);
  }
  const cerrar = document.createElement("button");
  cerrar.type = "button";
  cerrar.className = "aviso-cerrar";
  cerrar.setAttribute("aria-label", "Cerrar aviso");
  cerrar.innerHTML = icono("equis");
  cerrar.addEventListener("click", function () { aviso.remove(); });
  aviso.appendChild(cerrar);

  caja.appendChild(aviso);
  setTimeout(function () { aviso.classList.add("saliendo"); }, 7600);
  setTimeout(function () { aviso.remove(); }, 8000);

  // numerito en la pestaña del navegador hasta que la persona vuelva a mirar
  if (document.hidden) {
    avisosSinVer++;
    document.title = "(" + avisosSinVer + ") " + tituloOriginal;
  }
}

let avisosSinVer = 0;
const tituloOriginal = document.title;
document.addEventListener("visibilitychange", function () {
  if (!document.hidden) {
    avisosSinVer = 0;
    document.title = tituloOriginal;
  }
});

// Repite "revisar" cada tantos milisegundos, pero solo con la pagina a la vista
// (si la persona cambia de pestaña, se pausa; al volver, revisa de una vez).
function revisarCadaCierto(revisar, milisegundos) {
  let reloj = null;
  function arrancar() {
    if (reloj) return;
    reloj = setInterval(revisar, milisegundos);
  }
  function parar() {
    clearInterval(reloj);
    reloj = null;
  }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      parar();
    } else {
      revisar();
      arrancar();
    }
  });
  arrancar();
}

// ¿la seccion esta a la vista? (para refrescar la lista sin que la persona toque nada)
function seccionVisible(id) {
  const s = document.getElementById(id);
  return s && !s.classList.contains("oculto");
}

// ¿hay un mapa de recorrido abierto? (si lo hay, no se redibuja la lista para no cerrarlo)
function hayMapaAbierto(id) {
  return Boolean(document.querySelector("#" + id + " .donacion-mapa:not(.oculto)"));
}

// pedir datos sin mostrar errores (para las revisiones automaticas)
async function pedirEnSilencio(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  }
}
