// Resumen y estadisticas de cada panel (donante, conductor y centro de acopio).
// Uso: pintarEstadisticas(document.getElementById("resumen"))
// Pide /api/mis-estadisticas y dibuja segun el rol de quien inicio sesion.
// Graficas hechas solo con HTML y CSS: barras horizontales ordenadas (un solo color)
// para comparar categorias, y columnas por mes para ver la tendencia.

const ICONOS_CAT = { Alimentos: "alimentos", Ropa: "ropa", Aseo: "aseo" };

function numero(n) {
  return Number(n).toLocaleString("es-CO", { maximumFractionDigits: 1 });
}

// fila de cifras grandes
function cifrasHtml(lista) {
  let html = '<div class="cifras cifras-' + lista.length + '">';
  lista.forEach(function (c) {
    html += '<div class="cifra cifra-neutra">' + icono(c.icono) +
      "<strong>" + numero(c.valor) + "</strong><span>" + c.texto + "</span></div>";
  });
  return html + "</div>";
}

// barras horizontales: comparar partes (ya vienen de mayor a menor)
function barrasHtml(lista, unidad) {
  const max = Math.max(1, ...lista.map(function (x) { return x.valor; }));
  let html = '<div class="barras">';
  lista.forEach(function (x) {
    const ancho = Math.round(x.valor * 100 / max);
    const texto = numero(x.valor) + " " + unidad;
    html += '<div class="barra-fila" title="' + limpiar(x.nombre) + ": " + texto + '">' +
      '<span class="barra-nombre">' + (x.icono ? icono(x.icono) : "") + limpiar(x.nombre) + "</span>" +
      '<span class="barra-pista"><span class="barra-relleno" style="width:' + ancho + '%"></span></span>' +
      '<span class="barra-valor">' + numero(x.valor) + "</span></div>";
  });
  return html + "</div>";
}

// columnas por mes (una serie). "max" permite compartir escala entre dos graficas
function columnasHtml(lista, unidad, max) {
  max = max || Math.max(1, ...lista.map(function (x) { return x.valor; }));
  let html = '<div class="columnas" role="img" aria-label="' +
    lista.map(function (x) { return x.mes + ": " + x.valor + " " + unidad; }).join(", ") + '">';
  lista.forEach(function (x) {
    const alto = Math.round(x.valor * 100 / max);
    html += '<div class="columna" title="' + x.mes + ": " + numero(x.valor) + " " + unidad + '">' +
      '<span class="columna-valor">' + (x.valor ? numero(x.valor) : "") + "</span>" +
      '<span class="columna-pista"><span class="columna-relleno" style="height:' + alto + '%"></span></span>' +
      '<span class="columna-mes">' + x.mes + "</span></div>";
  });
  return html + "</div>";
}

// lista de centros a los que ha ayudado / visitado
function lugaresHtml(lista, textoVeces) {
  if (!lista.length) return '<p class="vacio">Todavía no hay entregas completadas.</p>';
  let html = '<ul class="lugares">';
  lista.forEach(function (l) {
    html += "<li>" + icono("centro") + "<span><strong>" + limpiar(l.centro) + "</strong>" +
      (l.barrio ? " · " + limpiar(l.barrio) : "") + "<small>" + l.veces + " " + textoVeces + (l.veces === 1 ? "" : "s") +
      " · " + numero(l.articulos) + " artículos</small></span></li>";
  });
  return html + "</ul>";
}

function bloque(titulo, iconoTitulo, contenido, nota) {
  return '<section class="tarjeta bloque-estadistica"><h2 class="titulo-seccion">' + icono(iconoTitulo) + titulo + "</h2>" +
    contenido + (nota ? '<p class="ayuda">' + nota + "</p>" : "") + "</section>";
}

function categorias(lista) {
  return lista.map(function (x) { return { nombre: x.categoria, valor: x.valor, icono: ICONOS_CAT[x.categoria] }; });
}

// ---------- por rol ----------
function resumenDonante(e) {
  let html = cifrasHtml([
    { valor: e.donaciones, texto: "Donaciones hechas", icono: "corazon" },
    { valor: e.articulos, texto: "Artículos entregados", icono: "caja" },
    { valor: e.centros_ayudados, texto: "Centros ayudados", icono: "centro" },
    { valor: e.en_curso, texto: "En curso", icono: "camion" }
  ]);
  if (e.desde) {
    html += '<p class="ayuda centrado">Dona con Red Acopio desde el ' + formatearFecha(e.desde).split(",")[0] + ". ¡Gracias!</p>";
  }
  html += bloque("A dónde ha llegado su ayuda", "pin", lugaresHtml(e.por_centro, "donación"));
  html += bloque("Qué ha donado", "etiqueta", barrasHtml(categorias(e.por_categoria), "artículos"), "Artículos que ya llegaron al centro.");
  html += bloque("Artículos entregados por mes", "calendario", columnasHtml(e.por_mes, "artículos"), "Últimos 6 meses.");
  return html;
}

function resumenConductor(e) {
  let html = cifrasHtml([
    { valor: e.servicios, texto: "Servicios hechos", icono: "check" },
    { valor: e.articulos, texto: "Artículos llevados", icono: "caja" },
    { valor: e.km, texto: "Km recorridos", icono: "ruta" },
    { valor: e.donantes_ayudados, texto: "Donantes ayudados", icono: "usuario" }
  ]);
  html += '<p class="ayuda centrado">Kilómetros aproximados en línea recta, de la recogida al centro' +
    (e.km_viajes_medidos < e.servicios ? " (solo los viajes con punto marcado en el mapa)" : "") + ".</p>";
  html += bloque("Centros que ha visitado", "centro", lugaresHtml(e.por_centro, "viaje"));
  html += bloque("Qué ha transportado", "etiqueta", barrasHtml(categorias(e.por_categoria), "artículos"));
  html += bloque("Servicios por mes", "calendario", columnasHtml(e.por_mes, "servicios"), "Últimos 6 meses.");
  return html;
}

function resumenCentro(e) {
  let html = cifrasHtml([
    { valor: e.recibido, texto: "Artículos recibidos", icono: "caja" },
    { valor: e.repartido, texto: "Entregados a familias", icono: "corazon" },
    { valor: e.donantes, texto: "Donantes", icono: "usuario" },
    { valor: e.conductores, texto: "Conductores", icono: "camion" }
  ]);
  html += bloque("Lo recibido por categoría", "etiqueta", barrasHtml(categorias(e.por_categoria), "artículos"));
  if (e.top_articulos.length) {
    html += bloque("Lo que más le donan", "lista",
      barrasHtml(e.top_articulos.map(function (x) { return { nombre: x.articulo, valor: x.valor }; }), "artículos"));
  }
  // dos graficas con la misma escala para poder compararlas
  const max = Math.max(1, ...e.recibido_por_mes.concat(e.repartido_por_mes).map(function (x) { return x.valor; }));
  html += bloque("Recibido por mes", "check", columnasHtml(e.recibido_por_mes, "artículos", max));
  html += bloque("Entregado a familias por mes", "corazon-linea", columnasHtml(e.repartido_por_mes, "artículos", max),
    "Las dos gráficas usan la misma escala. Últimos 6 meses.");
  return html;
}

async function pintarEstadisticas(contenedor) {
  contenedor.innerHTML = '<p class="vacio">Cargando…</p>';
  const r = await pedirApi("/api/mis-estadisticas");
  if (!r.ok) {
    contenedor.innerHTML = "";
    return;
  }
  const e = r.datos;
  if ("servicios" in e) contenedor.innerHTML = resumenConductor(e);
  else if ("recibido" in e) contenedor.innerHTML = resumenCentro(e);
  else contenedor.innerHTML = resumenDonante(e);
}
