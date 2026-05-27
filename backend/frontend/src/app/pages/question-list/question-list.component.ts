import { AsyncPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  distinctUntilChanged,
  finalize,
  map,
  of,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs';
import { GenerationRequestComponent } from '../../components/generation-request/generation-request.component';
import { Question } from '../../models/question.model';
import { QuestionService } from '../../services/question.service';

type CategoryLane = 'left' | 'right';

interface CategorySummary {
  name: string;
  slug: string;
  count: number;
  lane: CategoryLane;
  hue: number;
  averageAccuracy: number;
  firstQuestionId: string;
}

interface QuestionStreamItem extends Question {
  accuracy: number;
  categoryHue: number;
  categoryLabel: string;
  categoryLane: CategoryLane;
  categorySlug: string;
  sequence: number;
}

interface QuestionListViewModel {
  categories: CategorySummary[];
  overallAccuracy: number;
  questions: QuestionStreamItem[];
  routeSelectionMissing: boolean;
  selectedCategory?: CategorySummary;
  selectedIndex: number;
  selectedQuestion?: QuestionStreamItem;
  totalAnswered: number;
  totalCategories: number;
  totalQuestions: number;
}

@Component({
  selector: 'app-question-list',
  imports: [AsyncPipe, RouterLink, GenerationRequestComponent],
  templateUrl: './question-list.component.html',
  styleUrl: './question-list.component.scss',
})
export class QuestionListComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly questionService = inject(QuestionService);
  private readonly refreshQuestionsSubject = new BehaviorSubject<void>(undefined);
  private readonly categoryHues = [252, 194, 332, 34, 148, 280];

  readonly isAnswerVisible = signal(false);
  readonly isLoading = signal(false);
  readonly error = signal('');
  readonly showGenerationForm = signal(false);

  private readonly selectedQuestionId$ = this.route.paramMap.pipe(
    map((params) => params.get('id') ?? ''),
    distinctUntilChanged(),
    tap(() => {
      this.isAnswerVisible.set(false);
      this.error.set('');
    }),
  );

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
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  readonly viewModel$ = combineLatest([this.questions$, this.selectedQuestionId$]).pipe(
    map(([questions, selectedQuestionId]) => this.buildViewModel(questions, selectedQuestionId)),
    tap((viewModel) => {
      if (!this.isLoading() && viewModel.routeSelectionMissing) {
        this.error.set('Question not found.');
      }
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  toggleGenerationForm(): void {
    this.showGenerationForm.update((isVisible) => !isVisible);
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

  openQuestion(questionId: string): void {
    void this.router.navigate(['/questions', questionId]);
  }

  openCategory(category: CategorySummary): void {
    void this.router.navigate(['/questions', category.firstQuestionId]);
  }

  goToPrevious(question: QuestionStreamItem, questions: QuestionStreamItem[]): void {
    this.navigateByOffset(question, questions, -1);
  }

  goToNext(question: QuestionStreamItem, questions: QuestionStreamItem[]): void {
    this.navigateByOffset(question, questions, 1);
  }

  markResult(question: QuestionStreamItem, result: 'right' | 'wrong'): void {
    this.questionService.markResult(question.id, result).subscribe({
      next: () => {
        this.refreshQuestionsSubject.next();
      },
      error: () => {
        this.error.set('Could not update question stats.');
      },
    });
  }

  deleteQuestion(question: QuestionStreamItem, questions: QuestionStreamItem[]): void {
    const confirmed = confirm(`Delete "${question.title}"?`);

    if (!confirmed) {
      return;
    }

    const selectedQuestionId = this.route.snapshot.paramMap.get('id') ?? '';
    const nextQuestionId = this.findFallbackQuestionId(question.id, questions);

    this.questionService.deleteQuestion(question.id).subscribe({
      next: () => {
        this.refreshQuestionsSubject.next();

        if (selectedQuestionId === question.id) {
          if (nextQuestionId) {
            void this.router.navigate(['/questions', nextQuestionId]);
            return;
          }

          void this.router.navigate(['/']);
        }
      },
      error: () => {
        this.error.set('Could not delete question.');
      },
    });
  }

  private navigateByOffset(question: QuestionStreamItem, questions: QuestionStreamItem[], offset: number): void {
    if (questions.length === 0) {
      return;
    }

    const currentIndex = questions.findIndex((existingQuestion) => existingQuestion.id === question.id);
    const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (safeCurrentIndex + offset + questions.length) % questions.length;
    void this.router.navigate(['/questions', questions[nextIndex].id]);
  }

  private buildViewModel(questions: Question[], selectedQuestionId: string): QuestionListViewModel {
    const groupedQuestions = new Map<string, Question[]>();

    for (const question of questions) {
      const categorySlug = this.normalizeCategory(question.category);
      const existingQuestions = groupedQuestions.get(categorySlug) ?? [];
      groupedQuestions.set(categorySlug, [...existingQuestions, question]);
    }

    const categories = Array.from(groupedQuestions.entries()).map(([slug, categoryQuestions], index) => {
      const totalAttempts = categoryQuestions.reduce((sum, question) => sum + question.timesSeen, 0);
      const totalCorrect = categoryQuestions.reduce((sum, question) => sum + question.correctCount, 0);

      return {
        averageAccuracy: totalAttempts === 0 ? 0 : Math.round((totalCorrect / totalAttempts) * 100),
        count: categoryQuestions.length,
        firstQuestionId: categoryQuestions[0]?.id ?? '',
        hue: this.categoryHues[index % this.categoryHues.length],
        lane: index % 2 === 0 ? 'left' : 'right',
        name: this.categoryLabel(categoryQuestions[0]?.category ?? ''),
        slug,
      } satisfies CategorySummary;
    });

    const categoryLookup = new Map(categories.map((category) => [category.slug, category]));

    const streamQuestions = questions.map((question, index) => {
      const categorySlug = this.normalizeCategory(question.category);
      const category = categoryLookup.get(categorySlug);

      return {
        ...question,
        accuracy: this.calculateAccuracy(question),
        categoryHue: category?.hue ?? this.categoryHues[0],
        categoryLabel: category?.name ?? this.categoryLabel(question.category),
        categoryLane: category?.lane ?? 'left',
        categorySlug,
        sequence: index + 1,
      } satisfies QuestionStreamItem;
    });

    const routeSelectedQuestion = streamQuestions.find((question) => question.id === selectedQuestionId);
    const selectedQuestion = routeSelectedQuestion ?? streamQuestions[0];
    const selectedCategory = selectedQuestion ? categoryLookup.get(selectedQuestion.categorySlug) : undefined;
    const totalAnswered = streamQuestions.reduce((sum, question) => sum + question.timesSeen, 0);
    const totalCorrect = streamQuestions.reduce((sum, question) => sum + question.correctCount, 0);

    return {
      categories,
      overallAccuracy: totalAnswered === 0 ? 0 : Math.round((totalCorrect / totalAnswered) * 100),
      questions: streamQuestions,
      routeSelectionMissing: Boolean(selectedQuestionId) && !routeSelectedQuestion && streamQuestions.length > 0,
      selectedCategory,
      selectedIndex: selectedQuestion ? streamQuestions.findIndex((question) => question.id === selectedQuestion.id) : -1,
      selectedQuestion,
      totalAnswered,
      totalCategories: categories.length,
      totalQuestions: streamQuestions.length,
    };
  }

  private calculateAccuracy(question: Question): number {
    return question.timesSeen === 0 ? 0 : Math.round((question.correctCount / question.timesSeen) * 100);
  }

  private normalizeCategory(category: string): string {
    const trimmedCategory = category.trim().toLowerCase();
    const fallbackCategory = trimmedCategory || 'general';
    return fallbackCategory.replace(/[^a-z0-9]+/g, '-');
  }

  private categoryLabel(category: string): string {
    const safeCategory = category.trim() || 'general';

    return safeCategory
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  }

  private findFallbackQuestionId(deletedQuestionId: string, questions: QuestionStreamItem[]): string | undefined {
    const remainingQuestions = questions.filter((question) => question.id !== deletedQuestionId);
    return remainingQuestions[0]?.id;
  }
}
