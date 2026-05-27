import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { GenerationRequest, GenerationRequestInput, GenerationRequestStatus } from '../models/generation-request.model.js';

const dataDirectory = path.resolve(process.cwd(), 'data');
const generationRequestsFile = path.join(dataDirectory, 'generation-requests.json');

export class GenerationRequestFileDbService {
  private async ensureFile(): Promise<void> {
    await mkdir(dataDirectory, { recursive: true });

    try {
      await readFile(generationRequestsFile, 'utf8');
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        await writeFile(generationRequestsFile, '[]', 'utf8');
        return;
      }
      throw error;
    }
  }

  async readGenerationRequests(): Promise<GenerationRequest[]> {
    await this.ensureFile();
    const content = await readFile(generationRequestsFile, 'utf8');

    try {
      const parsed = JSON.parse(content) as GenerationRequest[];
      if (!Array.isArray(parsed)) {
        throw new Error('generation-requests.json must contain an array.');
      }
      return parsed;
    } catch {
      throw new Error(`Invalid JSON in ${generationRequestsFile}. Fix the file so it contains a valid JSON array.`);
    }
  }

  private async writeGenerationRequests(requests: GenerationRequest[]): Promise<void> {
    await this.ensureFile();
    await writeFile(generationRequestsFile, `${JSON.stringify(requests, null, 2)}\n`, 'utf8');
  }

  async getAll(): Promise<GenerationRequest[]> {
    const requests = await this.readGenerationRequests();
    return requests.sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  }

  async create(input: GenerationRequestInput, status: GenerationRequestStatus = 'pending'): Promise<GenerationRequest> {
    const requests = await this.readGenerationRequests();
    const now = new Date().toISOString();
    const request: GenerationRequest = {
      id: randomUUID(),
      topic: input.topic.trim(),
      category: input.category.trim(),
      difficulty: input.difficulty,
      status,
      createdAt: now,
      startedAt: status === 'generating' ? now : undefined,
    };

    requests.push(request);
    await this.writeGenerationRequests(requests);
    return request;
  }

  async update(id: string, updater: (request: GenerationRequest) => GenerationRequest): Promise<GenerationRequest | undefined> {
    const requests = await this.readGenerationRequests();
    const index = requests.findIndex((request) => request.id === id);

    if (index === -1) {
      return undefined;
    }

    requests[index] = updater(requests[index]);
    await this.writeGenerationRequests(requests);
    return requests[index];
  }

  async updateStatus(id: string, status: GenerationRequestStatus): Promise<GenerationRequest | undefined> {
    return this.update(id, (request) => ({
      ...request,
      status,
      startedAt: status === 'generating' ? request.startedAt ?? new Date().toISOString() : request.startedAt,
      completedAt: status === 'completed' ? new Date().toISOString() : request.completedAt,
    }));
  }

  async markFailed(id: string, errorMessage: string): Promise<GenerationRequest | undefined> {
    return this.update(id, (request) => ({
      ...request,
      status: 'failed',
      errorMessage,
      completedAt: new Date().toISOString(),
    }));
  }

  async markCompleted(id: string, generatedQuestionId: string): Promise<GenerationRequest | undefined> {
    return this.update(id, (request) => ({
      ...request,
      status: 'completed',
      generatedQuestionId,
      completedAt: new Date().toISOString(),
      errorMessage: undefined,
    }));
  }
}
