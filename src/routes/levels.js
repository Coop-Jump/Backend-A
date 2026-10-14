import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/authenticateToken.js';

const router = Router();

// Aplicar middleware de autenticación JWT a todas las rutas de escritura
router.use(authenticateToken);

/**
 * Valida que grid_json sea un objeto JSON válido con la estructura esperada.
 * @param {any} grid - El grid_json a validar
 * @returns {object} { valid: boolean, error?: string }
 */
function validateGridJson(grid) {
  if (grid === null || grid === undefined) {
    return { valid: false, error: 'grid_json is required' };
  }

  if (typeof grid !== 'object' || Array.isArray(grid)) {
    return { valid: false, error: 'grid_json must be an object' };
  }

  // Validar campos obligatorios del grid
  const requiredFields = ['width', 'height', 'cells'];
  for (const field of requiredFields) {
    if (!(field in grid)) {
      return { valid: false, error: `grid_json must contain '${field}'` };
    }
  }

  // Validar width y height como enteros positivos
  if (!Number.isInteger(grid.width) || grid.width <= 0) {
    return { valid: false, error: 'grid_json.width must be a positive integer' };
  }

  if (!Number.isInteger(grid.height) || grid.height <= 0) {
    return { valid: false, error: 'grid_json.height must be a positive integer' };
  }

  // Validar cells como array
  if (!Array.isArray(grid.cells)) {
    return { valid: false, error: 'grid_json.cells must be an array' };
  }

  // Validar que cells tenga la longitud correcta (width * height)
  if (grid.cells.length !== grid.width * grid.height) {
    return {
      valid: false,
      error: `grid_json.cells must have exactly ${grid.width * grid.height} elements (width * height)`,
    };
  }

  // Validar cada celda
  for (let i = 0; i < grid.cells.length; i++) {
    const cell = grid.cells[i];
    if (typeof cell !== 'object' || cell === null || Array.isArray(cell)) {
      return { valid: false, error: `grid_json.cells[${i}] must be an object` };
    }
    if (typeof cell.type !== 'string' || cell.type.trim() === '') {
      return { valid: false, error: `grid_json.cells[${i}].type must be a non-empty string` };
    }
  }

  return { valid: true };
}

/**
 * Valida el body de creación/actualización de nivel.
 * @param {any} body - El body de la request
 * @returns {object} { valid: boolean, error?: string, data?: { title, difficulty, grid_json } }
 */
function validateLevelBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request body must be an object' };
  }

  const { title, difficulty, grid_json } = body;

  if (typeof title !== 'string' || title.trim() === '') {
    return { valid: false, error: 'title is required and must be a non-empty string' };
  }

  if (typeof difficulty !== 'string' || difficulty.trim() === '') {
    return { valid: false, error: 'difficulty is required and must be a non-empty string' };
  }

  const gridValidation = validateGridJson(grid_json);
  if (!gridValidation.valid) {
    return { valid: false, error: gridValidation.error };
  }

  return {
    valid: true,
    data: {
      title: title.trim(),
      difficulty: difficulty.trim(),
      grid_json,
    },
  };
}

// POST /levels - Crear un nuevo nivel
router.post('/', async (req, res) => {
  const validation = validateLevelBody(req.body);

  if (!validation.valid) {
    return res.status(400).json({
      status: 'error',
      message: validation.error,
    });
  }

  const { title, difficulty, grid_json } = validation.data;

  try {
    const result = await pool.query(
      `INSERT INTO levels (title, difficulty, grid_json)
       VALUES ($1, $2, $3)
       RETURNING id, title, difficulty, grid_json, created_at`,
      [title, difficulty, JSON.stringify(grid_json)]
    );

    return res.status(201).json({
      status: 'success',
      message: 'Level created successfully',
      level: result.rows[0],
    });
  } catch (error) {
    console.error('Error creating level:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

// PUT /levels/:id - Actualizar un nivel existente
router.put('/:id', async (req, res) => {
  const { id } = req.params;

  // Validar que el ID sea un número
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid level ID',
    });
  }

  const validation = validateLevelBody(req.body);

  if (!validation.valid) {
    return res.status(400).json({
      status: 'error',
      message: validation.error,
    });
  }

  const { title, difficulty, grid_json } = validation.data;

  try {
    // Verificar si el nivel existe
    const existing = await pool.query('SELECT id FROM levels WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Level not found',
      });
    }

    const result = await pool.query(
      `UPDATE levels
       SET title = $1, difficulty = $2, grid_json = $3
       WHERE id = $4
       RETURNING id, title, difficulty, grid_json, created_at`,
      [title, difficulty, JSON.stringify(grid_json), id]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Level updated successfully',
      level: result.rows[0],
    });
  } catch (error) {
    console.error('Error updating level:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

// DELETE /levels/:id - Eliminar un nivel
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  // Validar que el ID sea un número
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid level ID',
    });
  }

  try {
    const result = await pool.query(
      'DELETE FROM levels WHERE id = $1 RETURNING id',
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
      message: 'Level deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting level:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
});

// GET / - Listar todos los niveles (público, sin autenticación)
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

// GET /:id - Obtener un nivel por ID (público, sin autenticación)
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