// Inicio de sesion (RF012)

const formulario = document.getElementById("form-login");
const mensaje = document.getElementById("mensaje");

// a que pagina va cada rol
const paneles = {
  donante: "/donante.html",
  conductor: "/conductor.html",
  gestor: "/panel.html"
};

// si viene del registro con un correo que ya existe, se escribe solo
const correoSugerido = new URLSearchParams(window.location.search).get("correo");
if (correoSugerido) {
  document.getElementById("correo").value = correoSugerido;
  document.getElementById("clave").focus();
}

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
    window.location.href = paneles[resultado.rol];
  } else {
    mensaje.textContent = resultado.error;
    mensaje.className = "mensaje error";
  }
});