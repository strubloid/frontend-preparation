import { AsyncPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, finalize, of, switchMap, tap } from 'rxjs';
import { GenerationRequestComponent } from '../../components/generation-request/generation-request.component';
import { Question } from '../../models/question.model';
import { QuestionService } from '../../services/question.service';

@Component({
  selector: 'app-question-list',
  imports: [AsyncPipe, RouterLink, GenerationRequestComponent],
  templateUrl: './question-list.component.html',
  styleUrl: './question-list.component.scss',
})
export class QuestionListComponent {
  private readonly questionService = inject(QuestionService);
  private readonly refreshQuestionsSubject = new BehaviorSubject<void>(undefined);

  readonly isLoading = signal(false);
  readonly error = signal('');
  readonly showGenerationForm = signal(false);

  readonly questions$ = this.refreshQuestionsSubject.pipe(
    tap(() => {
      this.isLoading.set(true);
      this.error.set('');
    }),
    switchMap(() =>
      this.questionService.getQuestions().pipe(
        catchError(() => {
          this.error.set('Could not load questions. Make sure the backend is running.');
          return of([] as Question[]);
        }),
        finalize(() => {
          this.isLoading.set(false);
        }),
      ),
    ),
  );

  toggleGenerationForm(): void {
    this.showGenerationForm.update((isVisible) => !isVisible);
  }

  closeGenerationForm(): void {
    this.showGenerationForm.set(false);
  }

  reloadQuestions(): void {
    this.refreshQuestionsSubject.next();
  }

  accuracy(question: Question): number {
    return question.timesSeen === 0 ? 0 : Math.round((question.correctCount / question.timesSeen) * 100);
  }

  deleteQuestion(question: Question): void {
    const confirmed = confirm(`Delete "${question.title}"?`);

    if (!confirmed) {
      return;
    }

    this.questionService.deleteQuestion(question.id).subscribe({
      next: () => {
        this.reloadQuestions();
      },
      error: () => {
        this.error.set('Could not delete question.');
      },
    });
  }
}
