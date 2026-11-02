// Registro de donante (RF001), conductor (RF007) y centro de acopio (RF008)

const formulario = document.getElementById("form-registro");
const mensaje = document.getElementById("mensaje");

// que tipo de registro esta escogido ahora
let tipo = "donante";

// ---------- pestañas ----------
const botones = document.querySelectorAll(".pestanas button");

botones.forEach(function (boton) {
  boton.addEventListener("click", function () {
    // quitar el verde a todas y ponerselo a la que tocaron
    botones.forEach(function (b) { b.classList.remove("activa"); });
    boton.classList.add("activa");

    tipo = boton.dataset.tipo;

    // mostrar u ocultar los campos extra
    document.getElementById("campos-conductor").classList.toggle("oculto", tipo !== "conductor");
    document.getElementById("campos-centro").classList.toggle("oculto", tipo !== "centro");

    // cambiar el titulo
    if (tipo === "centro") {
      document.getElementById("titulo-datos").textContent = "Datos del encargado";
    } else {
      document.getElementById("titulo-datos").textContent = "Sus datos";
    }

    mensaje.className = "mensaje";

    // el mapa se crea la primera vez que se abre la pestaña del centro
    // (Leaflet necesita que el mapa este visible para medir su tamaño)
    if (tipo === "centro") iniciarMapaCentro();
  });
});

// ---------- mapa para ubicar el centro de acopio ----------
let selectorCentro = null;

function iniciarMapaCentro() {
  if (selectorCentro || document.getElementById("ubicacion-mapa").classList.contains("oculto")) return;

  // sin internet: mostrar los campos para escribir latitud y longitud
  if (!mapaDisponible()) {
    document.getElementById("ubicacion-mapa").classList.add("oculto");
    document.getElementById("ubicacion-manual").classList.remove("oculto");
    return;
  }

  const mapa = crearMapa(document.getElementById("mapa-centro"));
  selectorCentro = selectorDePunto(mapa, {
    tipo: "centro",
    estado: document.getElementById("estado-punto"),
    botonUbicacion: document.getElementById("boton-ubicacion"),
    // guardar el punto en los campos que se envian al servidor
    alCambiar: function (punto) {
      document.getElementById("latitud").value = punto ? punto[0].toFixed(6) : "";
      document.getElementById("longitud").value = punto ? punto[1].toFixed(6) : "";
    }
  });
}

// ---------- ayudas ----------
function valor(id) {
  return document.getElementById(id).value.trim();
}

// "arroz, atún , aceite" -> ["arroz", "atún", "aceite"]
function separarPorComas(texto) {
  const lista = [];
  texto.split(",").forEach(function (parte) {
    if (parte.trim() !== "") {
      lista.push(parte.trim());
    }
  });
  return lista;
}

// (mostrarMensaje esta en comun.js)

// ---------- enviar ----------
formulario.addEventListener("submit", async function (evento) {
  evento.preventDefault();

  if (!document.getElementById("acepta_privacidad").checked) {
    mostrarMensaje("Debe aceptar la política de privacidad.", "error");
    resaltarCampo("acepta_privacidad");
    return;
  }

  // datos que piden los tres
  const datos = {
    nombre: valor("nombre"),
    telefono: valor("telefono"),
    ciudad: valor("ciudad"),
    correo: valor("correo"),
    clave: document.getElementById("clave").value,
    acepta_privacidad: document.getElementById("acepta_privacidad").checked
  };

  // datos extra del conductor
  if (tipo === "conductor") {
    datos.tipo_vehiculo = valor("tipo_vehiculo");
    datos.placa = valor("placa");
    datos.capacidad_kg = valor("capacidad_kg");
    datos.zona = valor("zona");
    datos.dias = [];
    document.querySelectorAll('input[name="dia"]:checked').forEach(function (c) {
      datos.dias.push(c.value);
    });
    datos.franjas = [];
    document.querySelectorAll('input[name="franja"]:checked').forEach(function (c) {
      datos.franjas.push(c.value);
    });
  }

  // datos extra del centro
  if (tipo === "centro") {
    datos.nombre_centro = valor("nombre_centro");
    datos.direccion = valor("direccion");
    datos.barrio = valor("barrio");
    datos.horario = valor("horario");
    datos.capacidad_maxima = valor("capacidad_maxima");
    datos.latitud = valor("latitud");
    datos.longitud = valor("longitud");

    // solo se mandan las categorias que tengan algo escrito
    datos.necesidades = {};
    const alimentos = separarPorComas(valor("nec_alimentos"));
    const ropa = separarPorComas(valor("nec_ropa"));
    const aseo = separarPorComas(valor("nec_aseo"));
    if (alimentos.length > 0) datos.necesidades["Alimentos"] = alimentos;
    if (ropa.length > 0) datos.necesidades["Ropa"] = ropa;
    if (aseo.length > 0) datos.necesidades["Aseo"] = aseo;
  }

  // la ruta cambia segun el tipo: /api/registro/donante, /conductor o /centro
  // (enviarJson muestra el error, resalta el campo y ofrece "Iniciar sesión" si el correo ya existe)
  const boton = formulario.querySelector('button[type="submit"]');
  boton.disabled = true;
  const r = await enviarJson("/api/registro/" + tipo, datos);
  boton.disabled = false;

  if (r.ok) {
    // CU-01: queda con la sesion abierta y entra directo a su panel
    mostrarMensaje(r.datos.mensaje, "exito");
    setTimeout(function () { irAMiPanel(r.datos.rol); }, 900);
  }
});
