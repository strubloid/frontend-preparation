import { Component, OnInit, computed, forwardRef, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { QuestionService } from '../../services/question.service';
import { formatCategoryLabel, normalizeCategory } from '../../utils/question-browser.utils';

@Component({
  selector: 'app-category-input',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './category-input.component.html',
  styleUrl: './category-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CategoryInputComponent),
      multi: true,
    },
  ],
})
export class CategoryInputComponent implements ControlValueAccessor, OnInit {
  private readonly questionService = inject(QuestionService);

  readonly placeholder = input('frontend');

  readonly currentValue = signal('');
  readonly searchValue = signal('');
  readonly availableCategories = signal<string[]>([]);
  readonly isFocused = signal(false);

  readonly filteredCategories = computed(() => {
    const query = normalizeCategory(this.searchValue());
    const categories = this.availableCategories();

    if (!query) {
      return categories;
    }

    return categories.filter((category) => normalizeCategory(category).includes(query));
  });

  readonly exactMatchExists = computed(() => {
    const query = normalizeCategory(this.searchValue());
    if (!query) {
      return false;
    }

    return this.availableCategories().some((category) => normalizeCategory(category) === query);
  });

  readonly shouldShowCreateOption = computed(() => {
    const rawValue = this.searchValue().trim();
    return Boolean(rawValue) && !this.exactMatchExists();
  });

  readonly dropdownVisible = computed(() => this.isFocused() && (this.filteredCategories().length > 0 || this.shouldShowCreateOption()));

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  readonly isDisabled = signal(false);

  ngOnInit(): void {
    this.questionService.getAvailableCategories().subscribe({
      next: (categories) => this.availableCategories.set(categories),
    });
  }

  writeValue(value: string | null): void {
    const safeValue = value ?? '';
    this.currentValue.set(safeValue);
    this.searchValue.set(safeValue);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  handleInput(value: string): void {
    this.searchValue.set(value);
    this.currentValue.set(value);
    this.onChange(value);
  }

  handleFocus(): void {
    this.isFocused.set(true);
  }

  handleBlur(): void {
    window.setTimeout(() => {
      this.isFocused.set(false);
      this.onTouched();
    }, 120);
  }

  selectCategory(category: string): void {
    this.currentValue.set(category);
    this.searchValue.set(category);
    this.onChange(category);
    this.onTouched();
    this.isFocused.set(false);
  }

  createCategory(): void {
    const nextCategory = this.searchValue().trim();
    if (!nextCategory) {
      return;
    }

    this.selectCategory(nextCategory);
  }

  formatCategoryLabel(category: string): string {
    return formatCategoryLabel(category);
  }
}
