import { NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
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
  question?: Question;
  isEditMode = false;
  isLoading = false;
  isSaving = false;
  error = '';

  readonly form = this.formBuilder.nonNullable.group({
    title: ['', Validators.required],
    question: ['', Validators.required],
    answer: ['', Validators.required],
    category: [''],
    difficulty: ['medium' as QuestionDifficulty, Validators.required],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.isEditMode = Boolean(id);

    if (id) {
      this.loadQuestion(id);
    }
  }

  loadQuestion(id: string): void {
    this.isLoading = true;
    this.error = '';

    this.questionService.getQuestion(id).subscribe({
      next: (question) => {
        this.question = question;
        this.form.patchValue({
          title: question.title,
          question: question.question,
          answer: question.answer,
          category: question.category,
          difficulty: question.difficulty,
        });
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Could not load question.';
        this.isLoading = false;
      },
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.error = '';
    const input: QuestionInput = this.form.getRawValue();

    if (this.isEditMode && this.question) {
      this.questionService.updateQuestion(this.question.id, input).subscribe({
        next: (updatedQuestion) => void this.router.navigate(['/questions', updatedQuestion.id]),
        error: () => {
          this.error = 'Could not save changes.';
          this.isSaving = false;
        },
      });
      return;
    }

    this.questionService.createQuestion(input).subscribe({
      next: (createdQuestion) => void this.router.navigate(['/questions', createdQuestion.id]),
      error: () => {
        this.error = 'Could not create question.';
        this.isSaving = false;
      },
    });
  }

  deleteQuestion(): void {
    if (!this.question || !confirm(`Delete "${this.question.title}"?`)) {
      return;
    }

    this.questionService.deleteQuestion(this.question.id).subscribe({
      next: () => void this.router.navigate(['/']),
      error: () => {
        this.error = 'Could not delete question.';
      },
    });
  }

  cancel(): void {
    if (this.question) {
      void this.router.navigate(['/questions', this.question.id]);
      return;
    }

    void this.router.navigate(['/']);
  }
}
