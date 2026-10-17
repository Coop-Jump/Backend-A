<!-- calidad:inicio -->
![Calidad](https://img.shields.io/badge/Calidad-21%2F100-red) ![Aprobado](https://img.shields.io/badge/Aprobado-NO-red) ![Cumple](https://img.shields.io/badge/Cumple-12%2F15-green) ![Duplicación](https://img.shields.io/badge/Duplicaci%C3%B3n-20.7%25-yellow) ![SEC](https://img.shields.io/badge/SEC-0-green) ![SQL](https://img.shields.io/badge/SQL-0-green) ![DBG](https://img.shields.io/badge/DBG-0-green) ![Capas](https://img.shields.io/badge/Capas-3-green) ![Tests](https://img.shields.io/badge/Tests-7-green) ![EP](https://img.shields.io/badge/EP-7-orange)

**Calidad de servicios (heurístico):** índice **21/100** · cumple **12/15** · aprobado **NO** · capas **3**
Detalle completo en [`docs/EVALUACION.md`](docs/EVALUACION.md).
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
