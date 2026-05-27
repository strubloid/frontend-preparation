import { QuestionDifficulty } from './question.model.js';

export type GenerationRequestStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface GenerationRequest {
  id: string;
  topic: string;
  category: string;
  difficulty: QuestionDifficulty;
  status: GenerationRequestStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  generatedQuestionId?: string;
  errorMessage?: string;
}

export interface GenerationRequestInput {
  topic: string;
  category: string;
  difficulty: QuestionDifficulty;
}

export interface GeneratedQuestionPayload {
  title: string;
  question: string;
  answer: string;
  category: string;
  difficulty: QuestionDifficulty;
}
