// Panel temporal: muestra quien inicio sesion

async function cargar() {
  // le preguntamos al servidor: ¿quien soy?
  const respuesta = await fetch("/api/sesion");
  const usuario = await respuesta.json();

  // si no hay sesion, lo devolvemos al login
  if (usuario.rol === null) {
    window.location.href = "/login.html";
    return;
  }

  document.getElementById("saludo").textContent = "¡Hola, " + usuario.nombre + "!";
  document.getElementById("detalle").textContent = "Usted entró como: " + usuario.rol;
}

document.getElementById("boton-salir").addEventListener("click", async function () {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/";
});

cargar();