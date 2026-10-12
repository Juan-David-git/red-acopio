// Inicio de sesion (RF012)

const formulario = document.getElementById("form-login");
const mensaje = document.getElementById("mensaje");

formulario.addEventListener("submit", async function (evento) {
  evento.preventDefault();

  const datos = {
    correo: document.getElementById("correo").value,
    clave: document.getElementById("clave").value
  };

  const respuesta = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos)
  });

  const resultado = await respuesta.json();

  if (respuesta.ok) {
    // entro bien: lo mandamos a su panel
    window.location.href = "/panel.html";
  } else {
    mensaje.textContent = resultado.error;
    mensaje.className = "mensaje error";
  }
});