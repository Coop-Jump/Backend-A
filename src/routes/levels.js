import { Router } from 'express';

import pool from '../config/database.js';
import { LevelRepository } from '../repositories/level.repository.js';
import { LevelService } from '../services/level.service.js';
import { validateLevelPayload } from '../validators/level.validator.js';

const INVALID_UUID = '22P02';
const FOREIGN_KEY_VIOLATION = '23503';

function internalError(res) {
  return res.status(500).json({ status: 'error', message: 'Internal server error' });
}

function levelNotFound(res) {
  return res.status(404).json({ status: 'error', message: 'Level not found' });
}

function invalidLevel(res, validation) {
  return res.status(400).json({
    status: 'error',
    message: validation.message,
    fields: validation.fields,
  });
}

// Entero no negativo (número o string numérico estricto); null si no es válido.
function toNonNegativeInt(value) {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0 ? value : null;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const parsed = parseInt(value, 10);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

export function createLevelsRouter({ db = pool, levelService = new LevelService(new LevelRepository(db)) } = {}) {
  const router = Router();

  // Rutas protegidas: autenticación aplicada en app.js al montar el router

  // GET /levels - Listar niveles (protegido JWT)
  router.get('/', async (req, res) => {
    try {
      const result = await levelService.findAll();
      return res.status(200).json({
        status: 'success',
        levels: result.rows,
      });
    } catch (error) {
      console.error('Error fetching levels:', error);
      return internalError(res);
    }
  });

  // POST /levels - Crear nivel (JWT)
  router.post('/', async (req, res) => {
    const validation = validateLevelPayload(req.body);
    if (validation.fields) return invalidLevel(res, validation);

    const createdBy = req.user?.sub || req.user?.id || null;

    try {
      const result = await levelService.create({ ...validation.value, created_by: createdBy });
      return res.status(201).json({ status: 'success', level: result.rows[0] });
    } catch (error) {
      // created_by apunta a un usuario que ya no existe (token de un usuario borrado)
      if (error.code === FOREIGN_KEY_VIOLATION) {
        return res.status(401).json({ status: 'error', message: 'User not authenticated' });
      }
      console.error('Error creating level:', error);
      return internalError(res);
    }
  });

  // GET /levels/:id - Obtener un nivel por ID (protegido JWT)
  router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const result = await levelService.findById(id);

      if (result.rows.length === 0) return levelNotFound(res);

      return res.status(200).json({
        status: 'success',
        level: result.rows[0],
      });
    } catch (error) {
      // Un id que no es UUID no puede existir: es un 404, no un error del servidor.
      if (error.code === INVALID_UUID) return levelNotFound(res);
      console.error('Error fetching level:', error);
      return internalError(res);
    }
  });

  // GET /levels/:id/runs - Leaderboard de un nivel (protegido JWT)
  router.get('/:id/runs', async (req, res) => {
    const { id } = req.params;

    try {
      const result = await db.query(
        `SELECT r.id, r.user_id, r.completion_time_ms, r.deaths, r.created_at, u.username
         FROM runs r
         LEFT JOIN levels l ON r.level_id = l.id
         LEFT JOIN users u ON r.user_id = u.id
         WHERE r.level_id = $1 AND l.id IS NOT NULL
         ORDER BY r.completion_time_ms ASC
         LIMIT 10`,
        [id],
      );

      return res.status(200).json({
        status: 'success',
        runs: result.rows,
      });
    } catch (error) {
      if (error.code === INVALID_UUID) return levelNotFound(res);
      console.error('Error fetching runs leaderboard:', error);
      return internalError(res);
    }
  });

  // POST /levels/runs - Registrar partida completada (JWT)
  router.post('/runs', async (req, res) => {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) return res.status(401).json({ status: 'error', message: 'User not authenticated' });

    const { level_id, completion_time_ms, deaths } = req.body ?? {};
    if (level_id == null || completion_time_ms == null || deaths == null) {
      return res.status(400).json({ status: 'error', message: 'level_id, completion_time_ms, deaths required' });
    }

    // level_id es un UUID: se pasa como string, la base valida el formato.
    if (typeof level_id !== 'string' || !level_id.trim()) {
      return res.status(400).json({ status: 'error', message: 'level_id must be a valid level id' });
    }
    const lid = level_id.trim();
    const time = toNonNegativeInt(completion_time_ms);
    const d = toNonNegativeInt(deaths);
    if (time === null || d === null) {
      return res.status(400).json({ status: 'error', message: 'Numeric values required' });
    }

    try {
      const result = await db.query(
        `INSERT INTO runs (user_id, level_id, completion_time_ms, deaths) VALUES ($1,$2,$3,$4) RETURNING *`,
        [userId, lid, time, d],
      );
      return res.status(201).json({ status: 'success', run: result.rows[0] });
    } catch (error) {
      if (error.code === INVALID_UUID) {
        return res.status(400).json({ status: 'error', message: 'level_id must be a valid level id' });
      }
      if (error.code === FOREIGN_KEY_VIOLATION) {
        return levelNotFound(res);
      }
      console.error('Error creating run:', error);
      return internalError(res);
    }
  });

  // PUT /levels/:id - Actualizar nivel (JWT)
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const validation = validateLevelPayload(req.body);
    if (validation.fields) return invalidLevel(res, validation);

    try {
      const result = await levelService.update(id, validation.value);
      if (result.rows.length === 0) return levelNotFound(res);
      return res.status(200).json({ status: 'success', level: result.rows[0] });
    } catch (e) {
      if (e.code === INVALID_UUID) return levelNotFound(res);
      console.error('Error updating level:', e);
      return internalError(res);
    }
  });

  // DELETE /levels/:id - Eliminar nivel (JWT)
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const result = await levelService.delete(id);
      if (result.rows.length === 0) return levelNotFound(res);
      return res.status(200).json({ status: 'success', message: 'Level deleted', level: result.rows[0] });
    } catch (e) {
      if (e.code === INVALID_UUID) return levelNotFound(res);
      console.error('Error deleting level:', e);
      return internalError(res);
    }
  });

  // GET /users/me/runs - Historial del usuario (JWT)
  router.get('/users/me/runs', async (req, res) => {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) return res.status(401).json({ status: 'error', message: 'User not authenticated' });

    try {
      const result = await db.query(
        `SELECT r.*, l.title as level_title FROM runs r LEFT JOIN levels l ON r.level_id = l.id WHERE r.user_id = $1 ORDER BY r.created_at DESC`,
        [userId],
      );
      return res.status(200).json({ status: 'success', runs: result.rows });
    } catch (e) {
      console.error('Error fetching runs:', e);
      return internalError(res);
    }
  });

  return router;
}

export default createLevelsRouter();
