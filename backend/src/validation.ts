export const validDifficulties = ['easy', 'medium', 'hard'] as const;

export function isValidDifficulty(value: unknown): value is 'easy' | 'medium' | 'hard' {
  return typeof value === 'string' && validDifficulties.includes(value as 'easy' | 'medium' | 'hard');
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateQuestionBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return 'Request body is required.';
  }

  const requestBody = body as Record<string, unknown>;
  const requiredFields = ['title', 'question', 'answer'] as const;

  for (const field of requiredFields) {
    if (!isNonEmptyString(requestBody[field])) {
      return `${field} is required.`;
    }
  }

  if (typeof requestBody.category !== 'string') {
    return 'category is required.';
  }

  if (!isValidDifficulty(requestBody.difficulty)) {
    return 'difficulty must be easy, medium, or hard.';
  }

  return null;
}

export function validateGenerationRequestBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return 'Request body is required.';
  }

  const requestBody = body as Record<string, unknown>;

  if (!isNonEmptyString(requestBody.topic)) {
    return 'topic is required.';
  }

  if (typeof requestBody.category !== 'string') {
    return 'category is required.';
  }

  if (!isValidDifficulty(requestBody.difficulty)) {
    return 'difficulty must be easy, medium, or hard.';
  }

  return null;
}
