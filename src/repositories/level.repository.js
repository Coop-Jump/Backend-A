// Data access layer for levels
const LEVEL_COLUMNS = 'id, title, difficulty, grid_json, created_at';

export class LevelRepository {
  constructor(database) {
    this.db = database;
  }

  async findAll() {
    return this.db.query(`SELECT ${LEVEL_COLUMNS} FROM levels ORDER BY created_at ASC`);
  }

  async findById(id) {
    return this.db.query(`SELECT ${LEVEL_COLUMNS} FROM levels WHERE id = $1`, [id]);
  }

  async create(data) {
    return this.db.query(
      `INSERT INTO levels (title, difficulty, grid_json, created_by) VALUES ($1, $2, $3, $4) RETURNING ${LEVEL_COLUMNS}`,
      [data.title, data.difficulty, JSON.stringify(data.grid_json), data.created_by ?? null],
    );
  }

  async update(id, data) {
    return this.db.query(
      `UPDATE levels SET title = $1, difficulty = $2, grid_json = $3 WHERE id = $4 RETURNING ${LEVEL_COLUMNS}`,
      [data.title, data.difficulty, JSON.stringify(data.grid_json), id],
    );
  }

  async delete(id) {
    return this.db.query(`DELETE FROM levels WHERE id = $1 RETURNING ${LEVEL_COLUMNS}`, [id]);
  }
}
