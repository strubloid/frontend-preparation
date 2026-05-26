import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GenerationRequest, GenerationRequestInput, Question, QuestionInput } from '../models/question.model';

const API_BASE_URL = '/api';

@Injectable({ providedIn: 'root' })
export class QuestionService {
  constructor(private readonly http: HttpClient) {}

  getQuestions(): Observable<Question[]> {
    return this.http.get<Question[]>(`${API_BASE_URL}/questions`);
  }

  getQuestion(id: string): Observable<Question> {
    return this.http.get<Question>(`${API_BASE_URL}/questions/${id}`);
  }

  createQuestion(input: QuestionInput): Observable<Question> {
    return this.http.post<Question>(`${API_BASE_URL}/questions`, input);
  }

  updateQuestion(id: string, input: QuestionInput): Observable<Question> {
    return this.http.put<Question>(`${API_BASE_URL}/questions/${id}`, input);
  }

  deleteQuestion(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/questions/${id}`);
  }

  markResult(id: string, result: 'right' | 'wrong'): Observable<Question> {
    return this.http.patch<Question>(`${API_BASE_URL}/questions/${id}/result`, { result });
  }

  createGenerationRequest(input: GenerationRequestInput): Observable<GenerationRequest> {
    return this.http.post<GenerationRequest>(`${API_BASE_URL}/generation-requests`, input);
  }
}
