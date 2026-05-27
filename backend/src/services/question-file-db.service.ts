import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AnswerResult, Question, QuestionInput } from '../models/question.model.js';
import { dataDirectory } from '../runtime-paths.js';

const questionsFile = path.join(dataDirectory, 'questions.json');

export class QuestionFileDbService {
  private async ensureFile(): Promise<void> {
    await mkdir(dataDirectory, { recursive: true });

    try {
      await readFile(questionsFile, 'utf8');
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        await writeFile(questionsFile, '[]', 'utf8');
        return;
      }
      throw error;
    }
  }

  async readQuestions(): Promise<Question[]> {
    await this.ensureFile();
    const content = await readFile(questionsFile, 'utf8');

    try {
      const parsed = JSON.parse(content) as Question[];
      if (!Array.isArray(parsed)) {
        throw new Error('questions.json must contain an array.');
      }
      return parsed;
    } catch (error) {
      throw new Error(`Invalid JSON in ${questionsFile}. Fix the file so it contains a valid JSON array.`);
    }
  }

  private async writeQuestions(questions: Question[]): Promise<void> {
    await this.ensureFile();
    await writeFile(questionsFile, `${JSON.stringify(questions, null, 2)}\n`, 'utf8');
  }

  async getAll(): Promise<Question[]> {
    const questions = await this.readQuestions();
    return questions.sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  }

  async getById(id: string): Promise<Question | undefined> {
    const questions = await this.readQuestions();
    return questions.find((question) => question.id === id);
  }

  async create(input: QuestionInput): Promise<Question> {
    return this.createWithId(input);
  }

  async createWithId(input: QuestionInput, id: string = randomUUID()): Promise<Question> {
    const questions = await this.readQuestions();
    const now = new Date().toISOString();
    const question: Question = {
      id,
      title: input.title.trim(),
      question: input.question.trim(),
      answer: input.answer.trim(),
      category: input.category.trim(),
      difficulty: input.difficulty,
      timesSeen: 0,
      correctCount: 0,
      wrongCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    questions.push(question);
    await this.writeQuestions(questions);
    return question;
  }

  async update(id: string, input: QuestionInput): Promise<Question | undefined> {
    const questions = await this.readQuestions();
    const index = questions.findIndex((question) => question.id === id);

    if (index === -1) {
      return undefined;
    }

    const updated: Question = {
      ...questions[index],
      title: input.title.trim(),
      question: input.question.trim(),
      answer: input.answer.trim(),
      category: input.category.trim(),
      difficulty: input.difficulty,
      updatedAt: new Date().toISOString(),
    };

    questions[index] = updated;
    await this.writeQuestions(questions);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const questions = await this.readQuestions();
    const filteredQuestions = questions.filter((question) => question.id !== id);

    if (filteredQuestions.length === questions.length) {
      return false;
    }

    await this.writeQuestions(filteredQuestions);
    return true;
  }

  async markResult(id: string, result: AnswerResult): Promise<Question | undefined> {
    const questions = await this.readQuestions();
    const index = questions.findIndex((question) => question.id === id);

    if (index === -1) {
      return undefined;
    }

    const now = new Date().toISOString();
    const existingQuestion = questions[index];
    const updated: Question = {
      ...existingQuestion,
      timesSeen: existingQuestion.timesSeen + 1,
      correctCount: result === 'right' ? existingQuestion.correctCount + 1 : existingQuestion.correctCount,
      wrongCount: result === 'wrong' ? existingQuestion.wrongCount + 1 : existingQuestion.wrongCount,
      lastAnsweredAt: now,
      updatedAt: now,
    };

    questions[index] = updated;
    await this.writeQuestions(questions);
    return updated;
  }
}
