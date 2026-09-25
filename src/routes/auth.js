import bcrypt from 'bcrypt';
import { Router } from 'express';

import pool from '../config/database.js';

const DEFAULT_SALT_ROUNDS = 12;
const USERNAME_MAX_LENGTH = 50;
const PASSWORD_MAX_BYTES = 72;

function validateRegistration(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      message: 'username and password are required',
      fields: ['username', 'password'],
    };
  }

  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = body.password;
  const fields = [];

  if (!username) {
    fields.push('username');
  }

  if (typeof password !== 'string' || !password.trim()) {
    fields.push('password');
  }

  if (fields.length > 0) {
    return {
      message: 'username and password are required',
      fields,
    };
  }

  if (Array.from(username).length > USERNAME_MAX_LENGTH) {
    return {
      message: `username must be at most ${USERNAME_MAX_LENGTH} characters`,
      fields: ['username'],
    };
  }

  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
    return {
      message: `password must be at most ${PASSWORD_MAX_BYTES} bytes`,
      fields: ['password'],
    };
  }

  return { username, password };
}

export function createAuthRouter({
  database = pool,
  passwordHasher = bcrypt,
  saltRounds = DEFAULT_SALT_ROUNDS,
} = {}) {
  const router = Router();

  router.post('/register', async (req, res, next) => {
    const registration = validateRegistration(req.body);

    if (registration.fields) {
      return res.status(400).json({
        status: 'error',
        message: registration.message,
        fields: registration.fields,
      });
    }

    try {
      const passwordHash = await passwordHasher.hash(
        registration.password,
        saltRounds,
      );

      const result = await database.query(
        `INSERT INTO users (username, password_hash)
         VALUES ($1, $2)
         ON CONFLICT (username) DO NOTHING
         RETURNING id, username, created_at`,
        [registration.username, passwordHash],
      );

      const [user] = result.rows;

      if (!user) {
        return res.status(409).json({
          status: 'error',
          message: 'Username already exists',
        });
      }

      return res.status(201).json({
        status: 'success',
        message: 'User registered successfully',
        user,
      });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({
          status: 'error',
          message: 'Username already exists',
        });
      }

      return next(error);
    }
  });

  return router;
}

export default createAuthRouter();
