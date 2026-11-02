// Mi perfil: datos personales, contraseña y (conductor) vehiculo y zona en el mapa.
// (pedirApi, enviarJson, mostrarMensaje... en comun.js; crearMapa, selectorDePunto en mapa.js)

const ROLES = { donante: "Donante", conductor: "Conductor voluntario", gestor: "Encargado de centro de acopio" };

let perfil = null;
let selectorZona = null;

async function iniciar() {
  // sin sesion: directo al login (sin ventanita de "sesion termino")
  const s = await pedirApi("/api/sesion");
  if (!s.ok) return;
  if (!s.datos.rol) {
    window.location.href = "/login.html";
    return;
  }
  const r = await pedirApi("/api/perfil");
  if (!r.ok) return;
  perfil = r.datos;

  document.getElementById("volver-panel").href = PANEL_DE_ROL[perfil.rol] || "/";
  pintarCabeza();
  llenarFormulario();

  if (perfil.rol === "conductor") {
    document.getElementById("campos-conductor").classList.remove("oculto");
    iniciarMapaZona();
  }
}

function pintarCabeza() {
  document.getElementById("perfil-nombre").textContent = perfil.nombre;
  document.getElementById("perfil-rol").textContent = ROLES[perfil.rol] + " · " + perfil.ciudad;
}

function llenarFormulario() {
  document.getElementById("nombre").value = perfil.nombre;
  document.getElementById("telefono").value = perfil.telefono;
  document.getElementById("ciudad").value = perfil.ciudad;
  document.getElementById("correo").value = perfil.correo;
  if (perfil.rol === "conductor") {
    document.getElementById("tipo_vehiculo").value = perfil.tipo_vehiculo || "moto";
    document.getElementById("zona").value = perfil.zona || "";
    document.getElementById("radio_km").value = String(perfil.radio_km || 5);
  }
}

// ---------- mapa de la zona del conductor ----------
function iniciarMapaZona() {
  if (!mapaDisponible()) {
    document.getElementById("ubicacion-mapa").innerHTML = '<p class="mapa-aviso">' + icono("info") +
      "No se pudo cargar el mapa. Revise su conexión a internet.</p>";
    return;
  }
  const mapa = crearMapa(document.getElementById("mapa-zona"));
  const quitar = document.getElementById("boton-quitar-punto");
  selectorZona = selectorDePunto(mapa, {
    tipo: "recogida",
    estado: document.getElementById("estado-punto"),
    botonUbicacion: document.getElementById("boton-ubicacion"),
    alCambiar: function (punto) { quitar.classList.toggle("oculto", !punto); }
  });
  quitar.addEventListener("click", function () { selectorZona.quitar(); });

  if (perfil.zona_latitud != null && perfil.zona_longitud != null) {
    const punto = [perfil.zona_latitud, perfil.zona_longitud];
    selectorZona.marcar(punto);
    mapa.setView(punto, 15);
  }
}

// ---------- guardar datos ----------
document.getElementById("form-perfil").addEventListener("submit", async function (evento) {
  evento.preventDefault();
  const datos = {
    nombre: document.getElementById("nombre").value,
    telefono: document.getElementById("telefono").value,
    ciudad: document.getElementById("ciudad").value
  };
  if (perfil.rol === "conductor") {
    datos.tipo_vehiculo = document.getElementById("tipo_vehiculo").value;
    datos.zona = document.getElementById("zona").value;
    datos.radio_km = document.getElementById("radio_km").value;
    const punto = selectorZona ? selectorZona.punto() : null;
    // sin mapa (sin internet) se conserva el punto que ya tenia
    datos.zona_latitud = selectorZona ? (punto ? punto[0] : null) : perfil.zona_latitud;
    datos.zona_longitud = selectorZona ? (punto ? punto[1] : null) : perfil.zona_longitud;
  }
  const r = await enviarJson("/api/perfil", datos);
  if (r.ok) {
    perfil = r.datos.perfil;
    pintarCabeza();
    mostrarMensaje(r.datos.mensaje, "exito");
  }
});

// ---------- cambiar contraseña ----------
document.getElementById("form-clave").addEventListener("submit", async function (evento) {
  evento.preventDefault();
  const formulario = this;
  const r = await enviarJson("/api/perfil/clave", {
    actual: document.getElementById("clave_actual").value,
    nueva: document.getElementById("clave_nueva").value,
    confirmar: document.getElementById("clave_confirmar").value
  });
  if (r.ok) {
    mostrarMensaje(r.datos.mensaje, "exito");
    formulario.reset();
  }
});

activarBotonSalir();
iniciar();
