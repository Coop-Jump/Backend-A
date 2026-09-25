# Backend-A

## Registro de usuarios

Endpoint disponible: `POST /auth/register`.

La base de datos debe contar con la tabla `users` del esquema compartido, incluyendo una restricción `UNIQUE` sobre `username` y la columna `password_hash`.

```json
{
  "username": "player",
  "password": "secret-password"
}
```

Reglas de validación:

- `username` es obligatorio, no puede contener solo espacios y admite hasta 50 caracteres.
- `password` es obligatoria, no puede contener solo espacios y admite hasta 72 bytes, límite de bcrypt.

Respuestas:

- `201 Created`: usuario registrado correctamente.
- `400 Bad Request`: faltan campos o no cumplen las reglas de validación.
- `409 Conflict`: el `username` ya existe.
