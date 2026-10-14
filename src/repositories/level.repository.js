// Data access layer for levels
export class LevelRepository {
  constructor(database) {
    this.db = database;
  }

  async create(data) {
    return this.db.query(
      'INSERT INTO levels (title, difficulty, grid_json) VALUES ($1, $2, $3) RETURNING *',
      [data.title, data.difficulty, JSON.stringify(data.grid_json)]
    );
  }

  async update(id, data) {
    return this.db.query(
      'UPDATE levels SET title = $1, difficulty = $2, grid_json = $3 WHERE id = $4 RETURNING *',
      [data.title, data.difficulty, JSON.stringify(data.grid_json), id]
    );
  }

  async delete(id) {
    return this.db.query('DELETE FROM levels WHERE id = $1 RETURNING *', [id]);
  }
}
