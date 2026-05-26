import { GenerationRequest, GenerationRequestInput } from '../models/generation-request.model.js';

export interface QuestionGeneratorService {
  createGenerationRequest(input: GenerationRequestInput): Promise<GenerationRequest>;
}

export class LocalGenerationRequestService implements QuestionGeneratorService {
  constructor(
    private readonly createRequest: (input: GenerationRequestInput) => Promise<GenerationRequest>,
  ) {}

  createGenerationRequest(input: GenerationRequestInput): Promise<GenerationRequest> {
    return this.createRequest(input);
  }
}
