import { Component, EventEmitter, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { QuestionService } from '../../services/question.service';
import { QuestionDifficulty } from '../../models/question.model';

@Component({
  selector: 'app-generation-request',
  imports: [ReactiveFormsModule, NgFor, NgIf],
  templateUrl: './generation-request.component.html',
  styleUrl: './generation-request.component.scss',
})
export class GenerationRequestComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly questionService = inject(QuestionService);

  @Output() closeForm = new EventEmitter<void>();

  readonly difficulties: QuestionDifficulty[] = ['easy', 'medium', 'hard'];
  message = '';
  error = '';
  isSubmitting = false;

  readonly form = this.formBuilder.nonNullable.group({
    topic: ['', Validators.required],
    category: ['frontend'],
    difficulty: ['medium' as QuestionDifficulty, Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.error = '';
    this.message = '';

    this.questionService.createGenerationRequest(this.form.getRawValue()).subscribe({
      next: () => {
        this.message = 'Generation request saved. Use Codex/ChatGPT with the prompt in prompts/codex-generate-question.md to generate and save the question.';
        this.form.reset({ topic: '', category: 'frontend', difficulty: 'medium' });
        this.isSubmitting = false;
      },
      error: () => {
        this.error = 'Could not create generation request. Make sure the backend is running.';
        this.isSubmitting = false;
      },
    });
  }
}
