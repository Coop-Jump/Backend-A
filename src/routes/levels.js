import { Router } from 'express';

import pool from '../config/database.js';

export function createLevelsRouter({ db = pool } = {}) {
  const router = Router();

  // Rutas protegidas: autenticación aplicada en app.js al montar el router

  // GET /levels - Listar niveles (protegido JWT)
  router.get('/', async (req, res) => {
    try {
      const result = await db.query(
        'SELECT id, title, difficulty, grid_json, created_at FROM levels ORDER BY created_at ASC',
      );
      return res.status(200).json({
        status: 'success',
        levels: result.rows,
      });
    } catch (error) {
      console.error('Error fetching levels:', error);
      return res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  });

  // GET /levels/:id - Obtener un nivel por ID (protegido JWT)
  router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const result = await db.query(
        'SELECT id, title, difficulty, grid_json, created_at FROM levels WHERE id = $1',
        [id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Level not found',
        });
      }

      return res.status(200).json({
        status: 'success',
        level: result.rows[0],
      });
    } catch (error) {
      console.error('Error fetching level:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
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
      console.error('Error fetching runs leaderboard:', error);
      return res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  });

  // POST /levels/runs - Registrar partida completada (JWT)
  router.post('/runs', async (req, res) => {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) return res.status(401).json({ status: 'error', message: 'User not authenticated' });

    const { level_id, completion_time_ms, deaths } = req.body;
    if (level_id == null || completion_time_ms == null || deaths == null) {
      return res.status(400).json({ status: 'error', message: 'level_id, completion_time_ms, deaths required' });
    }

    const lid = parseInt(level_id, 10),
      time = parseInt(completion_time_ms, 10),
      d = parseInt(deaths, 10);
    if (isNaN(lid) || isNaN(time) || isNaN(d)) return res.status(400).json({ status: 'error', message: 'Numeric values required' });

    try {
      const result = await db.query(
        `INSERT INTO runs (user_id, level_id, completion_time_ms, deaths) VALUES ($1,$2,$3,$4) RETURNING *`,
        [userId, lid, time, d],
      );
      return res.status(201).json({ status: 'success', run: result.rows[0] });
    } catch (error) {
      console.error('Error creating run:', error);
      return res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  });

  // PUT /levels/:id - Actualizar nivel (JWT)
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { title, difficulty, grid_json } = req.body;
    try {
      const result = await db.query(
        'UPDATE levels SET title = $1, difficulty = $2, grid_json = $3 WHERE id = $4 RETURNING *',
        [title, difficulty, JSON.stringify(grid_json), id],
      );
      if (result.rows.length === 0) return res.status(404).json({ status: 'error', message: 'Level not found' });
      return res.status(200).json({ status: 'success', level: result.rows[0] });
    } catch (e) {
      console.error('Error updating level:', e);
      return res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  });

  // DELETE /levels/:id - Eliminar nivel (JWT)
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const result = await db.query('DELETE FROM levels WHERE id = $1 RETURNING *', [id]);
      if (result.rows.length === 0) return res.status(404).json({ status: 'error', message: 'Level not found' });
      return res.status(200).json({ status: 'success', message: 'Level deleted', level: result.rows[0] });
    } catch (e) {
      console.error('Error deleting level:', e);
      return res.status(500).json({ status: 'error', message: 'Internal server error' });
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
      return res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  });

  return router;
}

export default createLevelsRouter();
