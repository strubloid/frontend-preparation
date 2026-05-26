import { NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Question, QuestionDifficulty, QuestionInput } from '../../models/question.model';
import { QuestionService } from '../../services/question.service';

@Component({
  selector: 'app-question-form',
  imports: [NgFor, NgIf, ReactiveFormsModule, RouterLink],
  templateUrl: './question-form.component.html',
  styleUrl: './question-form.component.scss',
})
export class QuestionFormComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly questionService = inject(QuestionService);

  readonly difficulties: QuestionDifficulty[] = ['easy', 'medium', 'hard'];
  readonly question = signal<Question | undefined>(undefined);
  readonly isEditMode = signal(false);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly error = signal('');

  readonly form = this.formBuilder.nonNullable.group({
    title: ['', Validators.required],
    question: ['', Validators.required],
    answer: ['', Validators.required],
    category: [''],
    difficulty: ['medium' as QuestionDifficulty, Validators.required],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.isEditMode.set(Boolean(id));

    if (id) {
      this.loadQuestion(id);
    }
  }

  loadQuestion(id: string): void {
    this.isLoading.set(true);
    this.error.set('');

    this.questionService.getQuestion(id).subscribe({
      next: (question) => {
        this.question.set(question);
        this.form.patchValue({
          title: question.title,
          question: question.question,
          answer: question.answer,
          category: question.category,
          difficulty: question.difficulty,
        });
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Could not load question.');
        this.isLoading.set(false);
      },
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.error.set('');
    const input: QuestionInput = this.form.getRawValue();
    const currentQuestion = this.question();

    if (this.isEditMode() && currentQuestion) {
      this.questionService.updateQuestion(currentQuestion.id, input).subscribe({
        next: (updatedQuestion) => void this.router.navigate(['/questions', updatedQuestion.id]),
        error: () => {
          this.error.set('Could not save changes.');
          this.isSaving.set(false);
        },
      });
      return;
    }

    this.questionService.createQuestion(input).subscribe({
      next: (createdQuestion) => void this.router.navigate(['/questions', createdQuestion.id]),
      error: () => {
        this.error.set('Could not create question.');
        this.isSaving.set(false);
      },
    });
  }

  deleteQuestion(): void {
    const currentQuestion = this.question();

    if (!currentQuestion || !confirm(`Delete "${currentQuestion.title}"?`)) {
      return;
    }

    this.questionService.deleteQuestion(currentQuestion.id).subscribe({
      next: () => void this.router.navigate(['/']),
      error: () => {
        this.error.set('Could not delete question.');
      },
    });
  }

  cancel(): void {
    const currentQuestion = this.question();

    if (currentQuestion) {
      void this.router.navigate(['/questions', currentQuestion.id]);
      return;
    }

    void this.router.navigate(['/']);
  }
}
