import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, map, of, tap } from 'rxjs';
import { GenerationRequestComponent } from '../../components/generation-request/generation-request.component';
import { Question } from '../../models/question.model';
import { QuestionService } from '../../services/question.service';
import {
  QuestionCardViewModel,
  buildQuestionBrowserData,
  getQuestionByOffset,
  isEditableTarget,
} from '../../utils/question-browser.utils';

@Component({
  selector: 'app-question-detail',
  imports: [RouterLink, GenerationRequestComponent],
  templateUrl: './question-detail.component.html',
  styleUrl: './question-detail.component.scss',
})
export class QuestionDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly questionService = inject(QuestionService);

  readonly error = signal('');
  readonly isAnswerVisible = signal(false);
  readonly isLoading = signal(true);
  readonly showGenerationForm = signal(false);

  private readonly questionId = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('id') ?? ''),
      tap(() => {
        this.error.set('');
        this.isAnswerVisible.set(false);
      }),
    ),
    { initialValue: '' },
  );

  private readonly questions = toSignal(
    this.questionService.getQuestions().pipe(
      tap(() => {
        this.error.set('');
        this.isLoading.set(false);
      }),
      catchError(() => {
        this.error.set('Could not load question. Make sure the backend is running.');
        this.isLoading.set(false);
        return of([] as Question[]);
      }),
    ),
    { initialValue: [] as Question[] },
  );

  readonly viewModel = computed(() => {
    const questions = this.questions() ?? [];
    const questionBrowser = buildQuestionBrowserData(questions);
    const currentQuestionId = this.questionId();
    const currentQuestion = questionBrowser.questions.find((question) => question.id === currentQuestionId);

    return {
      currentQuestion,
      hasQuestions: questionBrowser.questions.length > 0,
      nextQuestion: currentQuestion ? getQuestionByOffset(questionBrowser.questions, currentQuestion.id, 1) : undefined,
      previousQuestion: currentQuestion ? getQuestionByOffset(questionBrowser.questions, currentQuestion.id, -1) : undefined,
      questions: questionBrowser.questions,
      totalQuestions: questionBrowser.stats.totalQuestions,
    };
  });

  toggleGenerationForm(): void {
    this.showGenerationForm.update((currentValue) => !currentValue);
  }

  closeGenerationForm(): void {
    this.showGenerationForm.set(false);
  }

  showAnswer(): void {
    this.isAnswerVisible.set(true);
  }

  hideAnswer(): void {
    this.isAnswerVisible.set(false);
  }

  goBackToBank(): void {
    void this.router.navigate(['/questions']);
  }

  goToPrevious(): void {
    const previousQuestion = this.viewModel().previousQuestion;

    if (previousQuestion) {
      void this.router.navigate(['/questions', previousQuestion.id]);
    }
  }

  goToNext(): void {
    const nextQuestion = this.viewModel().nextQuestion;

    if (nextQuestion) {
      void this.router.navigate(['/questions', nextQuestion.id]);
    }
  }

  markResult(question: QuestionCardViewModel, result: 'right' | 'wrong'): void {
    this.questionService.markResult(question.id, result).subscribe({
      next: () => {
        this.isAnswerVisible.set(false);
      },
      error: () => {
        this.error.set('Could not update question stats.');
      },
    });
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(event: KeyboardEvent): void {
    if (isEditableTarget(event.target)) {
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.goToPrevious();
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.goToNext();
    }
  }
}
