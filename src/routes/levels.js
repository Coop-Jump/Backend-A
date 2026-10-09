import { Router } from 'express';
import pool from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, difficulty, grid_json, created_at FROM levels ORDER BY created_at ASC'
    );
    return res.status(200).json({
      status: 'success',
      levels: result.rows,
    });
  } catch (error) {
    console.error('Error fetching levels:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT id, title, difficulty, grid_json, created_at FROM levels WHERE id = $1',
      [id]
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

export default router;