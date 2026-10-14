// Level model/entity
export class Level {
  constructor(id, title, difficulty, gridJson, createdAt) {
    this.id = id;
    this.title = title;
    this.difficulty = difficulty;
    this.gridJson = gridJson;
    this.createdAt = createdAt;
  }
}
