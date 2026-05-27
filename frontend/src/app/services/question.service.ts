import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, map, shareReplay, switchMap, tap } from 'rxjs';
import { GenerationRequest, GenerationRequestInput, Question, QuestionInput } from '../models/question.model';

const API_BASE_URL = '/api';

@Injectable({ providedIn: 'root' })
export class QuestionService {
  private readonly http = inject(HttpClient);
  private readonly refreshQuestionsSubject = new BehaviorSubject<void>(undefined);

  private readonly questions$ = this.refreshQuestionsSubject.pipe(
    switchMap(() => this.http.get<Question[]>(`${API_BASE_URL}/questions`)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  getQuestions(): Observable<Question[]> {
    return this.questions$;
  }

  refreshQuestions(): void {
    this.refreshQuestionsSubject.next();
  }

  getQuestion(id: string): Observable<Question> {
    return this.questions$.pipe(
      map((questions) => {
        const question = questions.find((existingQuestion) => existingQuestion.id === id);

        if (!question) {
          throw new Error('Question not found');
        }

        return question;
      }),
    );
  }

  createQuestion(input: QuestionInput): Observable<Question> {
    return this.http.post<Question>(`${API_BASE_URL}/questions`, input).pipe(
      tap(() => this.refreshQuestions()),
    );
  }

  updateQuestion(id: string, input: QuestionInput): Observable<Question> {
    return this.http.put<Question>(`${API_BASE_URL}/questions/${id}`, input).pipe(
      tap(() => this.refreshQuestions()),
    );
  }

  deleteQuestion(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/questions/${id}`).pipe(
      tap(() => this.refreshQuestions()),
    );
  }

  markResult(id: string, result: 'right' | 'wrong'): Observable<Question> {
    return this.http.patch<Question>(`${API_BASE_URL}/questions/${id}/result`, { result }).pipe(
      tap(() => this.refreshQuestions()),
    );
  }

  createGenerationRequest(input: GenerationRequestInput): Observable<GenerationRequest> {
    return this.http.post<GenerationRequest>(`${API_BASE_URL}/generation-requests`, input);
  }
}
