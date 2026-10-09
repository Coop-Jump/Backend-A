<!-- calidad:inicio -->
![Calidad](https://img.shields.io/badge/Calidad-15%2F100-red) ![Cumple](https://img.shields.io/badge/Cumple-9%2F15-yellow) ![Aprobado](https://img.shields.io/badge/Aprobado-NO-red)

**Calidad de servicios (heurístico):** índice **15/100** · cumple **9/15** · aprobado **NO** · capas **2**
`SEC 2 · SQL 0 · DBG 5 · duplicación 24.4% · endpoints 3 · tests 3`
<!-- calidad:fin -->

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

## Middleware de autenticación

`src/middleware/authenticateToken.js` exporta `authenticateToken` (y la factory `createAuthenticateToken`).

Uso en rutas privadas:

```js
import { authenticateToken } from './middleware/authenticateToken.js';

router.get('/profile', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});
```

Comportamiento:

- `401`: falta el header `Authorization: Bearer <token>` o el token está vacío.
- `403`: el token es inválido o expiró.
- En caso de token válido, el payload decodificado se inyecta en `req.user`.
