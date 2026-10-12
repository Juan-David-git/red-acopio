from logica.seguridad import generar_hash, verificar_clave

hash1, sal1 = generar_hash("carmen123")
print("Hash:", hash1)
print("Sal:", sal1)

print("¿carmen123 es correcta?", verificar_clave("carmen123", hash1, sal1))
print("¿carmen999 es correcta?", verificar_clave("carmen999", hash1, sal1))