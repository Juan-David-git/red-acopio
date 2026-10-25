// Boton del ojito para mostrar u ocultar la contraseña (RNF006 usabilidad)
// Busca todos los campos de contraseña de la pagina y les pone el boton.
// Se carga al final de la pagina, despues de iconos.js.

document.querySelectorAll('input[type="password"]').forEach(function (campo) {
  // meter el campo en una cajita para poner el boton encima, a la derecha
  const caja = document.createElement("div");
  caja.className = "campo-clave";
  campo.parentNode.insertBefore(caja, campo);
  caja.appendChild(campo);

  const boton = document.createElement("button");
  boton.type = "button";   // para que NO envie el formulario
  boton.className = "boton-ojo";
  boton.setAttribute("aria-label", "Mostrar contraseña");
  boton.innerHTML = icono("ojo");
  caja.appendChild(boton);

  boton.addEventListener("click", function () {
    const estaOculta = campo.type === "password";
    campo.type = estaOculta ? "text" : "password";
    boton.innerHTML = icono(estaOculta ? "ojo-cerrado" : "ojo");
    boton.setAttribute("aria-label", estaOculta ? "Ocultar contraseña" : "Mostrar contraseña");
    campo.focus();
  });
});