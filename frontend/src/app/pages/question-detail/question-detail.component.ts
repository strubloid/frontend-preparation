import { AsyncPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, distinctUntilChanged, finalize, map, of, shareReplay, switchMap, tap } from 'rxjs';
import { GenerationRequestComponent } from '../../components/generation-request/generation-request.component';
import { Question } from '../../models/question.model';
import { QuestionService } from '../../services/question.service';

interface QuestionDetailViewModel {
  question?: Question;
  questions: Question[];
}

@Component({
  selector: 'app-question-detail',
  imports: [AsyncPipe, RouterLink, GenerationRequestComponent],
  templateUrl: './question-detail.component.html',
  styleUrl: './question-detail.component.scss',
})
export class QuestionDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly questionService = inject(QuestionService);
  private readonly refreshQuestionsSubject = new BehaviorSubject<void>(undefined);

  readonly isAnswerVisible = signal(false);
  readonly isLoading = signal(false);
  readonly error = signal('');
  readonly showGenerationForm = signal(false);

  private readonly questionId$ = this.route.paramMap.pipe(
    map((params) => params.get('id') ?? ''),
    distinctUntilChanged(),
    tap(() => {
      this.isAnswerVisible.set(false);
      this.error.set('');
    }),
  );

  private readonly questions$ = this.refreshQuestionsSubject.pipe(
    tap(() => {
      this.isLoading.set(true);
      this.error.set('');
    }),
    switchMap(() =>
      this.questionService.getQuestions().pipe(
        catchError(() => {
          this.error.set('Could not load question. Make sure the backend is running.');
          return of([] as Question[]);
        }),
        finalize(() => {
          this.isLoading.set(false);
        }),
      ),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly viewModel$ = combineLatest([this.questionId$, this.questions$]).pipe(
    map(([questionId, questions]): QuestionDetailViewModel => {
      const question = questions.find((existingQuestion) => existingQuestion.id === questionId);

      if (!this.isLoading() && !question && questions.length > 0) {
        this.error.set('Question not found.');
      }

      return { question, questions };
    }),
  );

  showAnswer(): void {
    this.isAnswerVisible.set(true);
  }

  toggleGenerationForm(): void {
    this.showGenerationForm.update((isVisible) => !isVisible);
  }

  closeGenerationForm(): void {
    this.showGenerationForm.set(false);
  }

  markResult(question: Question, result: 'right' | 'wrong'): void {
    this.questionService.markResult(question.id, result).subscribe({
      next: () => {
        this.refreshQuestionsSubject.next();
      },
      error: () => {
        this.error.set('Could not update question stats.');
      },
    });
  }

  goToPrevious(question: Question, questions: Question[]): void {
    this.navigateByOffset(question, questions, -1);
  }

  goToNext(question: Question, questions: Question[]): void {
    this.navigateByOffset(question, questions, 1);
  }

  private navigateByOffset(question: Question, questions: Question[], offset: number): void {
    if (questions.length === 0) {
      return;
    }

    const currentIndex = questions.findIndex((existingQuestion) => existingQuestion.id === question.id);
    const nextIndex = (currentIndex + offset + questions.length) % questions.length;
    void this.router.navigate(['/questions', questions[nextIndex].id]);
  }
}
