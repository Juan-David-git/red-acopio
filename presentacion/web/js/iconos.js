// Iconos de Red Acopio (SVG de linea) + logo.
// Se cargan una sola vez al inicio del <body> y se usan asi:
//   <svg class="ico"><use href="#i-corazon"></use></svg>
// Toman el color del texto que los rodea (currentColor).

(function () {
  const L = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';

  const iconos = {
    // ----- generales -----
    "corazon": '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="currentColor" stroke="none"/>',
    "corazon-linea": '<path ' + L + ' d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    "caja": '<g ' + L + '><path d="M4 8.5 12 5l8 3.5v8L12 20l-8-3.5z"/><path d="M4 8.5 12 12l8-3.5M12 12v8"/></g><path d="M12 15.6s-2-1.2-2-2.6a1 1 0 0 1 2-.6 1 1 0 0 1 2 .6c0 1.4-2 2.6-2 2.6z" fill="currentColor"/>',
    "camion": '<g ' + L + '><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></g><path d="M8.5 12.3s-1.5-.9-1.5-2a.8.8 0 0 1 1.5-.4.8.8 0 0 1 1.5.4c0 1.1-1.5 2-1.5 2z" fill="currentColor"/>',
    "centro": '<g ' + L + '><path d="M3 11 12 4l9 7M5 9.5V20h14V9.5"/><path d="M10 20v-4h4v4"/></g><path d="M12 13.4s-1.6-1-1.6-2.1a.8.8 0 0 1 1.6-.5.8.8 0 0 1 1.6.5c0 1.1-1.6 2.1-1.6 2.1z" fill="currentColor"/>',
    "usuario": '<g ' + L + '><circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/></g>',
    "usuario-mas": '<g ' + L + '><circle cx="10" cy="8" r="3.6"/><path d="M3 20a7 7 0 0 1 14 0M19 7v6M16 10h6"/></g>',
    "flecha": '<path ' + L + ' d="M5 12h14M13 6l6 6-6 6"/>',
    "salir": '<path ' + L + ' d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l4-4-4-4M14 12H4"/>',
    "etiqueta": '<g ' + L + '><path d="M3 12V4h8l9 9-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/></g>',
    "pin": '<g ' + L + '><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></g>',
    "lista": '<path ' + L + ' d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    "cubos": '<g ' + L + '><path d="M8 3.5h8v6H8zM3 12.5h8v8H3zM13 12.5h8v8h-8z"/></g>',
    "nota": '<g ' + L + '><path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7M9 7h3"/></g>',
    "casa": '<g ' + L + '><path d="M3 11 12 4l9 7M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/></g>',
    "calendario": '<g ' + L + '><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></g>',
    "check": '<g ' + L + '><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></g>',
    "equis": '<g ' + L + '><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></g>',
    "reloj": '<g ' + L + '><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></g>',
    "basura": '<path ' + L + ' d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    "enviar": '<path ' + L + ' d="M21 3 3 10.5l7 2.5 2.5 7zM10 13l11-10"/>',
    "telefono": '<path ' + L + ' d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
    "chat": '<path ' + L + ' d="M4 20l1.4-4A8 8 0 1 1 8 18.6z"/>',
    "correo": '<g ' + L + '><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6 8.5 7 8.5-7"/></g>',
    "candado": '<g ' + L + '><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></g>',
    "ciudad": '<g ' + L + '><path d="M3 20h18M5 20V9l5-3v14M10 20V4h9v16M13 8h3M13 12h3M13 16h3"/></g>',
    "vehiculo": '<g ' + L + '><path d="M3 16v-4l2-5h14l2 5v4z"/><path d="M3 12h18"/><circle cx="7" cy="16.5" r="1.8"/><circle cx="17" cy="16.5" r="1.8"/></g>',
    "ruta": '<g ' + L + '><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H16a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h7.5"/></g>',
    "info": '<g ' + L + '><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/></g>',
    // ----- categorias -----
    "alimentos": '<g ' + L + '><path d="M3.5 12h17a8.5 8.5 0 0 1-17 0z"/><path d="M6 12a6 4.5 0 0 1 12 0"/><path d="M9 9.5h.01M12 8.5h.01M15 9.5h.01"/></g>',
    "ropa": '<path ' + L + ' d="M9 4 4 6.5l1.8 4L8 9.6V20h8V9.6l2.2.9 1.8-4L15 4a3 3 0 0 1-6 0z"/>',
    "aseo": '<g ' + L + '><path d="M9 9h6l1 3v8H8v-8z"/><path d="M10.5 9V6h3v3M13.5 4.5H10a2 2 0 0 0-2 2"/></g>'
  };

  let sprite = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">';
  for (const nombre in iconos) {
    sprite += '<symbol id="i-' + nombre + '" viewBox="0 0 24 24">' + iconos[nombre] + "</symbol>";
  }

  // logo: caja naranja con corazon sostenida por dos manos verdes
  sprite += '<symbol id="i-logo" viewBox="0 0 64 56">' +
    '<path d="M16 6h32l4 8H12z" fill="#F2A15F"/>' +
    '<path d="M13 14h38l-3 22a4 4 0 0 1-4 3.5H20a4 4 0 0 1-4-3.5z" fill="#E8793A"/>' +
    '<path d="M32 33s-8-4.6-8-10a4.2 4.2 0 0 1 8-2 4.2 4.2 0 0 1 8 2c0 5.4-8 10-8 10z" fill="#FFF6EC"/>' +
    '<path d="M3 28c3 0 5 3 8 8s7 8 13 8h6v8h-8C11 52 4 44 3 34z" fill="#1E5A54"/>' +
    '<path d="M61 28c-3 0-5 3-8 8s-7 8-13 8h-6v8h8c11 0 18-8 19-18z" fill="#1E5A54"/>' +
    "</symbol>";
  sprite += "</svg>";

  document.body.insertAdjacentHTML("afterbegin", sprite);
})();

// devuelve el HTML de un icono, para usarlo desde otros scripts
function icono(nombre, clase) {
  return '<svg class="ico ' + (clase || "") + '" aria-hidden="true"><use href="#i-' + nombre + '"></use></svg>';
}
