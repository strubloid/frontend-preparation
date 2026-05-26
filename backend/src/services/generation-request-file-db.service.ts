import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { GenerationRequest, GenerationRequestInput } from '../models/generation-request.model.js';

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
    } catch (error) {
      throw new Error(`Invalid JSON in ${generationRequestsFile}. Fix the file so it contains a valid JSON array.`);
    }
  }

  private async writeGenerationRequests(requests: GenerationRequest[]): Promise<void> {
    await this.ensureFile();
    await writeFile(generationRequestsFile, `${JSON.stringify(requests, null, 2)}\n`, 'utf8');
  }

  async create(input: GenerationRequestInput): Promise<GenerationRequest> {
    const requests = await this.readGenerationRequests();
    const request: GenerationRequest = {
      id: randomUUID(),
      topic: input.topic.trim(),
      category: input.category.trim(),
      difficulty: input.difficulty,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    requests.push(request);
    await this.writeGenerationRequests(requests);
    return request;
  }

  async updateStatus(id: string, status: GenerationRequest['status']): Promise<GenerationRequest | undefined> {
    const requests = await this.readGenerationRequests();
    const index = requests.findIndex((request) => request.id === id);

    if (index === -1) {
      return undefined;
    }

    requests[index] = { ...requests[index], status };
    await this.writeGenerationRequests(requests);
    return requests[index];
  }
}
