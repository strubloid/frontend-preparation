import { QuestionDifficulty } from './question.model.js';

export interface GenerationRequest {
  id: string;
  topic: string;
  category: string;
  difficulty: QuestionDifficulty;
  status: 'pending' | 'completed';
  createdAt: string;
}

export interface GenerationRequestInput {
  topic: string;
  category: string;
  difficulty: QuestionDifficulty;
}
