export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  title: string;
  question: string;
  answer: string;
  category: string;
  difficulty: QuestionDifficulty;
  timesSeen: number;
  correctCount: number;
  wrongCount: number;
  createdAt: string;
  updatedAt: string;
  lastAnsweredAt?: string;
}

export interface QuestionInput {
  title: string;
  question: string;
  answer: string;
  category: string;
  difficulty: QuestionDifficulty;
}

export interface GenerationRequestInput {
  topic: string;
  category: string;
  difficulty: QuestionDifficulty;
}
