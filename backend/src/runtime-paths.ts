import path from 'node:path';

const resolveOverride = (value: string | undefined): string | null => {
  const trimmedValue = value?.trim();
  return trimmedValue ? path.resolve(trimmedValue) : null;
};

export const backendRoot = path.resolve(__dirname, '..');
export const projectRoot = path.resolve(backendRoot, '..');

export const dataDirectory = resolveOverride(process.env.DATA_DIR) ?? path.join(backendRoot, 'data');
export const promptsDirectory = resolveOverride(process.env.PROMPTS_DIR) ?? path.join(projectRoot, 'prompts');
export const publicDirectory = resolveOverride(process.env.PUBLIC_DIR) ?? path.join(backendRoot, 'dist', 'public');
export const questionGenerationPromptFile = path.join(promptsDirectory, 'question-generation.prompt.md');
