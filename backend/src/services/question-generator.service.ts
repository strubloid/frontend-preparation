import { readFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Question, QuestionInput } from '../models/question.model.js';
import { GeneratedQuestionPayload, GenerationRequestInput } from '../models/generation-request.model.js';
import { QuestionFileDbService } from './question-file-db.service.js';
import { validDifficulties } from '../validation.js';
import { projectRoot, questionGenerationPromptFile } from '../runtime-paths.js';

const execFileAsync = promisify(execFile);
const codexReadyCacheTtlMs = 30_000;
const codexFastFailTimeoutMs = 2_000;
const codexGenerationTimeoutMs = 15_000;

let cachedCodexReadyState: { checkedAt: number; isReady: boolean } | null = null;

export interface QuestionGeneratorService {
  createQuestionFromTopic(input: GenerationRequestInput): Promise<Question>;
}

export class LocalQuestionGeneratorService implements QuestionGeneratorService {
  constructor(private readonly questionDb: QuestionFileDbService) {}

  async createQuestionFromTopic(input: GenerationRequestInput): Promise<Question> {
    const existingQuestions = await this.questionDb.getAll();
    const shouldTryCodex = await this.isCodexReady();

    if (!shouldTryCodex) {
      const fallbackQuestion = this.generateFallbackQuestion(input, existingQuestions);
      return this.questionDb.createWithId(fallbackQuestion, randomUUID());
    }

    try {
      const generatedQuestion = await this.generateQuestionWithCodex(input, existingQuestions);
      return await this.questionDb.createWithId(generatedQuestion, randomUUID());
    } catch {
      const fallbackQuestion = this.generateFallbackQuestion(input, existingQuestions);
      return this.questionDb.createWithId(fallbackQuestion, randomUUID());
    }
  }

  private async generateQuestionWithCodex(
    input: GenerationRequestInput,
    existingQuestions: Question[],
  ): Promise<GeneratedQuestionPayload> {
    const tempOutputFile = path.join(os.tmpdir(), `codex-question-${randomUUID()}.json`);
    const promptContract = await readFile(questionGenerationPromptFile, 'utf8');
    const generationInstructions = [
      'Generate exactly one interview study question for this app.',
      'Use the attached rules file as the strict output contract.',
      `Topic: ${input.topic.trim()}`,
      `Requested category: ${input.category.trim()}`,
      `Requested difficulty: ${input.difficulty}`,
      'Avoid duplicating any existing question titles from the list below.',
      `Existing question titles: ${JSON.stringify(existingQuestions.map((question) => question.title).slice(-80))}`,
      'Keep the answer concise but useful for interview practice.',
      'Return only valid JSON with title, question, answer, category, difficulty.',
    ].join('\n');
    const codexPrompt = [promptContract.trim(), '', generationInstructions].join('\n');

    try {
      await execFileAsync(
        'codex',
        [
          'exec',
          '--skip-git-repo-check',
          '--color',
          'never',
          '--sandbox',
          'read-only',
          '-m',
          'gpt-5.5',
          '-C',
          projectRoot,
          '-o',
          tempOutputFile,
          codexPrompt,
        ],
        {
          cwd: projectRoot,
          env: process.env,
          timeout: codexGenerationTimeoutMs,
          maxBuffer: 1024 * 1024,
        },
      );

      const content = await readFile(tempOutputFile, 'utf8').catch(() => {
        throw new Error('Codex finished without producing an output file.');
      });
      const parsed = this.parseGeneratedQuestion(content);
      return this.validateGeneratedQuestion(parsed, input);
    } catch (error) {
      if (error && typeof error === 'object' && 'stderr' in error) {
        const stderr = String(error.stderr ?? '').trim();
        if (stderr) {
          throw new Error(stderr.split('\n').slice(-3).join(' '));
        }
      }

      throw error instanceof Error ? error : new Error('Codex generation failed.');
    } finally {
      await unlink(tempOutputFile).catch(() => undefined);
    }
  }

  private async isCodexReady(): Promise<boolean> {
    const now = Date.now();
    if (cachedCodexReadyState && now - cachedCodexReadyState.checkedAt < codexReadyCacheTtlMs) {
      return cachedCodexReadyState.isReady;
    }

    try {
      await execFileAsync('codex', ['login', 'status'], {
        cwd: projectRoot,
        env: process.env,
        timeout: codexFastFailTimeoutMs,
        maxBuffer: 32 * 1024,
      });

      cachedCodexReadyState = { checkedAt: now, isReady: true };
      return true;
    } catch {
      cachedCodexReadyState = { checkedAt: now, isReady: false };
      return false;
    }
  }

  private generateFallbackQuestion(input: GenerationRequestInput, existingQuestions: Question[]): QuestionInput {
    const topic = input.topic.trim();
    const category = input.category.trim() || 'general';
    const difficulty = input.difficulty;
    const knownTitles = new Set(existingQuestions.map((question) => question.title.trim().toLowerCase()));

    const baseTitle = topic.length > 60 ? topic.slice(0, 57).trimEnd() + '...' : topic;
    let safeTitle = this.toTitleCase(baseTitle || 'Generated question');
    let suffix = 2;

    while (knownTitles.has(safeTitle.toLowerCase())) {
      safeTitle = `${this.toTitleCase(baseTitle || 'Generated question')} ${suffix}`;
      suffix += 1;
    }

    return {
      title: safeTitle,
      question: this.buildFallbackQuestionText(topic, category, difficulty),
      answer: this.buildFallbackAnswerText(topic, category, difficulty),
      category,
      difficulty,
    };
  }

  private buildFallbackQuestionText(topic: string, category: string, difficulty: GenerationRequestInput['difficulty']): string {
    const normalizedTopic = topic || 'this concept';
    const difficultyLead =
      difficulty === 'easy'
        ? 'Explain in a practical way:'
        : difficulty === 'hard'
          ? 'In a senior-level interview, how would you explain and defend your decisions around:'
          : 'How would you explain and apply:';

    return [
      `${difficultyLead} ${normalizedTopic}?`,
      '',
      `Focus on the ${category || 'general'} perspective.`,
      'Include when you would use it, common mistakes, and a practical example.',
    ].join('\n');
  }

  private buildFallbackAnswerText(topic: string, category: string, difficulty: GenerationRequestInput['difficulty']): string {
    const normalizedTopic = topic || 'this concept';
    const depthNotes =
      difficulty === 'easy'
        ? ['start with a simple definition', 'show one straightforward example', 'mention one common mistake']
        : difficulty === 'hard'
          ? ['describe the trade-offs clearly', 'compare it with at least one alternative', 'show how you would justify the decision in production']
          : ['explain the core idea', 'mention a practical use case', 'call out trade-offs and mistakes to avoid'];

    return [
      `${this.toTitleCase(normalizedTopic)} is important in ${category || 'general'} because it affects how we design, maintain, and explain software decisions.`,
      '',
      'A strong answer should cover:',
      ...depthNotes.map((note, index) => `${index + 1}. ${this.capitalize(note)}.`),
      '',
      'Example structure:',
      `- What it is: define ${normalizedTopic} in plain language.`,
      `- Why it matters: explain the impact on the user experience, maintainability, performance, or reliability.`,
      `- When to use it: describe a real scenario where ${normalizedTopic} is the right choice.`,
      '- Pitfalls: mention mistakes, limitations, or trade-offs.',
      '- Practical example: give a concise project example that shows you have used or understood it in practice.',
    ].join('\n');
  }

  private parseGeneratedQuestion(content: string): Partial<GeneratedQuestionPayload> {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      throw new Error('Codex returned empty output.');
    }

    try {
      return JSON.parse(trimmedContent) as Partial<GeneratedQuestionPayload>;
    } catch {
      const jsonBlockMatch = trimmedContent.match(/\{[\s\S]*\}/);
      if (!jsonBlockMatch) {
        throw new Error('Codex output did not contain valid JSON.');
      }

      return JSON.parse(jsonBlockMatch[0]) as Partial<GeneratedQuestionPayload>;
    }
  }

  private validateGeneratedQuestion(
    generatedQuestion: Partial<GeneratedQuestionPayload>,
    fallback: GenerationRequestInput,
  ): GeneratedQuestionPayload {
    if (!generatedQuestion.title?.trim()) {
      throw new Error('Codex returned no question title.');
    }

    if (!generatedQuestion.question?.trim()) {
      throw new Error('Codex returned no question text.');
    }

    if (!generatedQuestion.answer?.trim()) {
      throw new Error('Codex returned no answer text.');
    }

    const category = generatedQuestion.category?.trim() || fallback.category.trim();
    const difficulty = generatedQuestion.difficulty ?? fallback.difficulty;

    if (!validDifficulties.includes(difficulty as (typeof validDifficulties)[number])) {
      throw new Error('Codex returned an invalid difficulty.');
    }

    return {
      title: generatedQuestion.title.trim(),
      question: generatedQuestion.question.trim(),
      answer: generatedQuestion.answer.trim(),
      category,
      difficulty,
    };
  }

  private toTitleCase(value: string): string {
    return value
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }

  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
