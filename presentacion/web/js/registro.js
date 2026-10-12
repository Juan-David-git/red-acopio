// Registro de donante 

const formulario = document.getElementById("form-registro");
const mensaje = document.getElementById("mensaje");

formulario.addEventListener("submit", async function (evento) {
  // que la pagina no se recargue al enviar
  evento.preventDefault();

  // 1. juntar los datos del formulario
  const datos = {
    nombre: document.getElementById("nombre").value,
    telefono: document.getElementById("telefono").value,
    ciudad: document.getElementById("ciudad").value,
    correo: document.getElementById("correo").value,
    clave: document.getElementById("clave").value
  };

  // la politica de privacidad se revisa aqui mismo (RNF011)
  if (!document.getElementById("acepta_privacidad").checked) {
    mostrarMensaje("Debe aceptar la política de privacidad.", "error");
    return;
  }

  // 2. enviarlos al servidor
  const respuesta = await fetch("/api/registro/donante", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos)
  });

  // 3. leer lo que respondio Python
  const resultado = await respuesta.json();

  // 4. mostrar el mensaje en verde o en rojo
  if (respuesta.ok) {
    mostrarMensaje(resultado.mensaje, "exito");
    formulario.reset();
  } else {
    mostrarMensaje(resultado.error, "error");
  }
});

function mostrarMensaje(texto, tipo) {
  mensaje.textContent = texto;
  mensaje.className = "mensaje " + tipo;
}