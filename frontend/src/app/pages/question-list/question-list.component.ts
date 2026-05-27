import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, tap } from 'rxjs';
import { GenerationRequestComponent } from '../../components/generation-request/generation-request.component';
import { QuestionCardCarouselComponent } from '../../components/question-card-carousel/question-card-carousel.component';
import { Question } from '../../models/question.model';
import { QuestionService } from '../../services/question.service';
import {
  QuestionBrowserData,
  QuestionCardViewModel,
  buildQuestionBrowserData,
  isEditableTarget,
} from '../../utils/question-browser.utils';

interface QuestionsPageViewModel extends QuestionBrowserData {
  activeIndex: number;
  activeQuestion?: QuestionCardViewModel;
  effectiveCategorySlug: string;
  filteredQuestions: QuestionCardViewModel[];
}

@Component({
  selector: 'app-question-list',
  imports: [RouterLink, GenerationRequestComponent, QuestionCardCarouselComponent],
  templateUrl: './question-list.component.html',
  styleUrl: './question-list.component.scss',
})
export class QuestionListComponent {
  private readonly router = inject(Router);
  private readonly questionService = inject(QuestionService);

  readonly error = signal('');
  readonly isLoading = signal(true);
  readonly selectedCategorySlug = signal('all');
  readonly activeIndex = signal(0);
  readonly showAllQuestions = signal(false);
  readonly showGenerationForm = signal(false);

  private readonly questions = toSignal(
    this.questionService.getQuestions().pipe(
      tap(() => {
        this.error.set('');
        this.isLoading.set(false);
      }),
      catchError(() => {
        this.error.set('Could not load questions. Make sure the backend is running.');
        this.isLoading.set(false);
        return of([] as Question[]);
      }),
    ),
    { initialValue: [] as Question[] },
  );

  private readonly browserData = computed<QuestionBrowserData>(() => buildQuestionBrowserData(this.questions()));

  readonly viewModel = computed<QuestionsPageViewModel>(() => {
    const browserData = this.browserData();
    const availableCategories = new Set(browserData.categories.map((category) => category.slug));
    const selectedCategorySlug = this.selectedCategorySlug();
    const effectiveCategorySlug =
      selectedCategorySlug === 'all' || availableCategories.has(selectedCategorySlug) ? selectedCategorySlug : 'all';

    const filteredQuestions =
      effectiveCategorySlug === 'all'
        ? browserData.questions
        : browserData.questions.filter((question) => question.categorySlug === effectiveCategorySlug);

    const activeIndex = normalizeIndex(this.activeIndex(), filteredQuestions.length);

    return {
      ...browserData,
      activeIndex,
      activeQuestion: filteredQuestions[activeIndex],
      effectiveCategorySlug,
      filteredQuestions,
    };
  });

  constructor() {
    effect(() => {
      const viewModel = this.viewModel();

      if (viewModel.effectiveCategorySlug !== this.selectedCategorySlug()) {
        this.selectedCategorySlug.set(viewModel.effectiveCategorySlug);
      }

      if (viewModel.activeIndex !== this.activeIndex()) {
        this.activeIndex.set(viewModel.activeIndex);
      }
    });
  }

  toggleGenerationForm(): void {
    this.showGenerationForm.update((currentValue) => !currentValue);
  }

  closeGenerationForm(): void {
    this.showGenerationForm.set(false);
  }

  toggleAllQuestions(): void {
    this.showAllQuestions.update((currentValue) => !currentValue);
  }

  selectCategory(categorySlug: string): void {
    this.selectedCategorySlug.set(categorySlug);
    this.activeIndex.set(0);
  }

  selectQuestion(index: number): void {
    this.activeIndex.set(index);
  }

  openQuestion(questionId: string): void {
    void this.router.navigate(['/questions', questionId]);
  }

  goToPrevious(): void {
    this.shiftIndex(-1);
  }

  goToNext(): void {
    this.shiftIndex(1);
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(event: KeyboardEvent): void {
    if (isEditableTarget(event.target)) {
      return;
    }

    if (this.viewModel().filteredQuestions.length === 0) {
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

  private shiftIndex(delta: number): void {
    const totalQuestions = this.viewModel().filteredQuestions.length;

    if (totalQuestions === 0) {
      return;
    }

    const nextIndex = (this.activeIndex() + delta + totalQuestions) % totalQuestions;
    this.activeIndex.set(nextIndex);
  }
}

function normalizeIndex(index: number, length: number): number {
  if (length === 0) {
    return 0;
  }

  if (index < 0) {
    return 0;
  }

  if (index >= length) {
    return length - 1;
  }

  return index;
}
