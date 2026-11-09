// Validación del payload de niveles (POST /levels y PUT /levels/:id)
export const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'];
export const TITLE_MAX_LENGTH = 100;

export function validateLevelPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      message: 'title, difficulty and grid_json are required',
      fields: ['title', 'difficulty', 'grid_json'],
    };
  }

  const { difficulty, grid_json: gridJson } = body;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const fields = [];

  if (!title) fields.push('title');
  if (!DIFFICULTIES.includes(difficulty)) fields.push('difficulty');
  if (!gridJson || typeof gridJson !== 'object' || Array.isArray(gridJson)) fields.push('grid_json');

  if (fields.length > 0) {
    return {
      message: `Invalid level data. title is required, difficulty must be one of: ${DIFFICULTIES.join(', ')}, and grid_json must be a JSON object`,
      fields,
    };
  }

  if (Array.from(title).length > TITLE_MAX_LENGTH) {
    return {
      message: `title must be at most ${TITLE_MAX_LENGTH} characters`,
      fields: ['title'],
    };
  }

  return { value: { title, difficulty, grid_json: gridJson } };
}
